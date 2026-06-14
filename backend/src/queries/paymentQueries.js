/**
 * Payment SQL Queries
 * Query functions untuk payments table dengan auto-update payment_status order
 */

const pool = require('../config/database');

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
      p.order_id,
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
 * Find payment by ID
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(`
    SELECT
      p.id,
      p.order_id,
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
 * Get order for payment calculation
 * @param {number} orderId
 */
async function getOrderForPayment(orderId) {
  const [rows] = await pool.query(
    'SELECT id, total_price, payment_status FROM orders WHERE id = ?',
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
 * Create payment dan auto-update payment_status order (transaction)
 * @param {object} data - {order_id, amount, method, note}
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

    // Insert payment
    const [result] = await connection.query(
      `INSERT INTO payments (order_id, amount, method, note) VALUES (?, ?, ?, ?)`,
      [data.order_id, data.amount, data.method, data.note || null]
    );

    // Update order payment status
    await connection.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [newPaymentStatus, data.order_id]
    );

    await connection.commit();

    return {
      paymentId: result.insertId,
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
  getOrderForPayment,
  getTotalPaymentsForOrder,
  create,
  update,
  remove
};
