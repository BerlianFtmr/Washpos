/**
 * Payment SQL Queries
 * Query functions untuk payments table dengan auto-update payment_status order
 *
 * FASE 2: kolom `code` (PAY-YYMMDD-XXXXXX) di-SELECT di semua query;
 * `findByCode` & `findByOrderCode` ditambahkan; `create` auto-generate code
 * dengan retry on ER_DUP_ENTRY (di dalam transaction).
 */

const pool = require('../config/database');
const { generateCode } = require('../utils/codeGenerator');

const CODE_PREFIX = 'PAY';
const MAX_CODE_RETRY = 3;

/**
 * Get all payments with filters
 * @param {object} filters - {order_id}
 * @param {number} page
 * @param {number} limit
 */
async function findAll(filters = {}, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  let query = `
    SELECT
      p.id,
      p.code,
      p.order_id,
      o.code AS order_code,
      p.amount,
      p.method,
      p.note,
      p.created_at,
      o.total_price AS order_total_price,
      o.payment_status AS order_payment_status
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by order_id
  if (filters.order_id) {
    query += ' AND p.order_id = ?';
    params.push(filters.order_id);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [payments] = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM payments WHERE 1=1';
  let countParams = [];

  if (filters.order_id) {
    countQuery += ' AND order_id = ?';
    countParams.push(filters.order_id);
  }

  const [count] = await pool.query(countQuery, countParams);

  return {
    payments,
    pagination: {
      page,
      limit,
      total: count[0].total
    }
  };
}

/**
 * Find payment by ID.
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(`
    SELECT
      p.id,
      p.code,
      p.order_id,
      o.code AS order_code,
      p.amount,
      p.method,
      p.note,
      p.created_at,
      o.total_price AS order_total_price,
      o.payment_status AS order_payment_status
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.id = ?
  `, [id]);

  return rows[0];
}

/**
 * Find payment by code (case-insensitive).
 * @param {string} code - mis. 'PAY-260614-9F2K4M'
 */
async function findByCode(code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  const [rows] = await pool.query(`
    SELECT
      p.id,
      p.code,
      p.order_id,
      o.code AS order_code,
      p.amount,
      p.method,
      p.note,
      p.created_at,
      o.total_price AS order_total_price,
      o.payment_status AS order_payment_status
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.code = ?
    LIMIT 1
  `, [code.toUpperCase()]);

  return rows[0];
}

/**
 * Get order for payment calculation
 * @param {number} orderId
 */
async function getOrderForPayment(orderId) {
  const [rows] = await pool.query(
    'SELECT id, code, total_price, payment_status FROM orders WHERE id = ?',
    [orderId]
  );
  return rows[0];
}

/**
 * Get total payments for order
 * @param {number} orderId
 */
async function getTotalPaymentsForOrder(orderId) {
  const [rows] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?',
    [orderId]
  );
  return rows[0].total;
}

/**
 * Create payment dan auto-update payment_status order (transaction).
 * Auto-generate `code` (PAY-YYMMDD-XXXXXX) dengan retry on ER_DUP_ENTRY.
 * @param {object} data - {order_id, amount, method, note}
 * @returns {Promise<{paymentId: number, newPaymentStatus: string}>}
 */
async function create(data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get order data
    const [orders] = await connection.query(
      'SELECT total_price, payment_status FROM orders WHERE id = ?',
      [data.order_id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      throw new Error('Order not found');
    }

    const order = orders[0];

    // Get current total payments
    const [currentTotal] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?',
      [data.order_id]
    );

    const paidSoFar = Number(currentTotal[0].total);
    const newTotal = paidSoFar + Number(data.amount);
    const totalPrice = Number(order.total_price);

    // Determine new payment status
    let newPaymentStatus = 'partial';
    if (newTotal >= totalPrice) {
      newPaymentStatus = 'paid';
    }

    // Insert payment dengan code (retry on dup). Di MySQL/InnoDB, ER_DUP_ENTRY
    // hanya me-rollback statement yg gagal, bukan seluruh transaction, sehingga
    // aman untuk retry di dalam transaction yang sama.
    let paymentId;
    for (let attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
      const payCode = generateCode(CODE_PREFIX, { withDate: true });
      try {
        const [result] = await connection.query(
          `INSERT INTO payments (code, order_id, amount, method, note) VALUES (?, ?, ?, ?, ?)`,
          [payCode, data.order_id, data.amount, data.method, data.note || null]
        );
        paymentId = result.insertId;
        break;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_CODE_RETRY - 1) continue;
        throw err;
      }
    }
    if (paymentId === undefined) {
      throw new Error('Failed to generate unique payment code after retries');
    }

    // Update order payment status
    await connection.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [newPaymentStatus, data.order_id]
    );

    await connection.commit();

    return {
      paymentId,
      newPaymentStatus
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Recalculate order payment_status based on sum of payments.
 * Must be called within a transaction (uses the given connection).
 * @param {object} connection - pooled/transactional connection
 * @param {number} orderId
 */
async function recalcOrderPaymentStatus(connection, orderId) {
  const [orders] = await connection.query(
    'SELECT total_price FROM orders WHERE id = ?',
    [orderId]
  );
  if (orders.length === 0) return;

  const [sumResult] = await connection.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?',
    [orderId]
  );

  const totalPaid = Number(sumResult[0].total);
  const totalPrice = Number(orders[0].total_price);

  let newStatus;
  if (totalPaid <= 0) {
    newStatus = 'unpaid';
  } else if (totalPaid >= totalPrice) {
    newStatus = 'paid';
  } else {
    newStatus = 'partial';
  }

  await connection.query(
    'UPDATE orders SET payment_status = ? WHERE id = ?',
    [newStatus, orderId]
  );
}

/**
 * Update payment dan auto-recalculate payment_status order (transaction)
 * @param {number} id
 * @param {object} data
 */
async function update(id, data) {
  const fields = [];
  const values = [];

  if (data.amount !== undefined) {
    fields.push('amount = ?');
    values.push(data.amount);
  }
  if (data.method !== undefined) {
    fields.push('method = ?');
    values.push(data.method);
  }
  if (data.note !== undefined) {
    fields.push('note = ?');
    values.push(data.note);
  }

  if (fields.length === 0) return false;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    values.push(id);
    await connection.query(
      `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Get order_id for this payment, then recalc its payment_status
    const [rows] = await connection.query(
      'SELECT order_id FROM payments WHERE id = ?',
      [id]
    );
    if (rows.length > 0) {
      await recalcOrderPaymentStatus(connection, rows[0].order_id);
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Delete payment dan auto-recalculate payment_status order (transaction)
 * @param {number} id
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get order_id before deleting (for recalc)
    const [rows] = await connection.query(
      'SELECT order_id FROM payments WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    const orderId = rows[0].order_id;

    await connection.query('DELETE FROM payments WHERE id = ?', [id]);

    await recalcOrderPaymentStatus(connection, orderId);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findAll,
  findById,
  findByCode,
  getOrderForPayment,
  getTotalPaymentsForOrder,
  create,
  update,
  remove
};
