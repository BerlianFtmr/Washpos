/**
 * Order SQL Queries
 * Query functions untuk orders, order_items, dan audit_logs
 *
 * FASE 2: kolom `code` (ORD-YYMMDD-XXXXXX) di-SELECT di semua query, termasuk
 * nested object (customer, user, service, payments, audit_logs.user).
 * `findByCode` ditambahkan; `findAll` support filter `customer_code`;
 * `create` auto-generate code dengan retry on ER_DUP_ENTRY (dalam transaction).
 */

const pool = require('../config/database');
const { generateCode } = require('../utils/codeGenerator');

const CODE_PREFIX = 'ORD';
const MAX_CODE_RETRY = 3;

/**
 * Get all orders with filters
 * @param {object} filters - {status, customer_id, user_id}
 * @param {number} page
 * @param {number} limit
 */
async function findAll(filters = {}, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  let query = `
    SELECT
      o.id,
      o.code,
      o.customer_id,
      c.code AS customer_code,
      c.name AS customer_name,
      c.whatsapp AS customer_whatsapp,
      o.user_id,
      u.code AS user_code,
      u.username AS user_name,
      o.status,
      o.payment_status,
      o.total_price,
      o.notes,
      o.created_at,
      o.updated_at,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Filter by status
  if (filters.status) {
    query += ' AND o.status = ?';
    params.push(filters.status);
  }

  // Filter by customer_id
  if (filters.customer_id) {
    query += ' AND o.customer_id = ?';
    params.push(filters.customer_id);
  }

  // Filter by user_id (pegawai only sees own orders)
  if (filters.user_id) {
    query += ' AND o.user_id = ?';
    params.push(filters.user_id);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [orders] = await pool.query(query, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM orders o
    WHERE 1=1
  `;
  let countParams = [];

  if (filters.status) {
    countQuery += ' AND o.status = ?';
    countParams.push(filters.status);
  }
  if (filters.customer_id) {
    countQuery += ' AND o.customer_id = ?';
    countParams.push(filters.customer_id);
  }
  if (filters.user_id) {
    countQuery += ' AND o.user_id = ?';
    countParams.push(filters.user_id);
  }

  const [count] = await pool.query(countQuery, countParams);

  return {
    orders,
    pagination: {
      page,
      limit,
      total: count[0].total
    }
  };
}

/**
 * Get order detail with items, nested customer/user/items[].service/payments.
 * Semua nested object menyertakan field `code`.
 * @param {number} id
 */
async function findDetail(id) {
  const [orders] = await pool.query(`
    SELECT
      o.id,
      o.code,
      o.customer_id,
      o.user_id,
      o.status,
      o.payment_status,
      o.total_price,
      o.notes,
      o.created_at,
      o.updated_at
    FROM orders o
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) return null;

  const order = orders[0];

  // Get customer info as nested object (with code)
  const [customers] = await pool.query(
    'SELECT id, code, name, whatsapp, address, created_at FROM customers WHERE id = ?',
    [order.customer_id]
  );
  if (customers.length > 0) {
    order.customer = customers[0];
  }

  // Get user info as nested object (with code)
  const [users] = await pool.query(
    'SELECT id, code, username, role FROM users WHERE id = ?',
    [order.user_id]
  );
  if (users.length > 0) {
    order.user = users[0];
  }

  // Get order items with nested service object (service has code)
  const [items] = await pool.query(`
    SELECT
      oi.id,
      oi.order_id,
      oi.service_id,
      oi.quantity,
      oi.subtotal
    FROM order_items oi
    WHERE oi.order_id = ?
  `, [id]);

  // Fetch service details for each item (with code)
  for (const item of items) {
    const [services] = await pool.query(
      'SELECT id, code, name, price, unit, active, created_at FROM services WHERE id = ?',
      [item.service_id]
    );
    if (services.length > 0) {
      item.service = services[0];
    }
  }

  order.items = items;

  // Get payments for this order (with code)
  const [payments] = await pool.query(
    'SELECT id, code, order_id, amount, method, note, created_at FROM payments WHERE order_id = ? ORDER BY created_at ASC',
    [id]
  );
  order.payments = payments;

  return order;
}

/**
 * Find order detail by code (case-insensitive). Returns same shape as findDetail.
 * @param {string} code - mis. 'ORD-260614-K7M2QF'
 */
async function findDetailByCode(code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  const [rows] = await pool.query(
    'SELECT id FROM orders WHERE code = ? LIMIT 1',
    [code.toUpperCase()]
  );
  if (rows.length === 0) return null;
  return findDetail(rows[0].id);
}

/**
 * Create order with items (transaction).
 * Auto-generate `code` (ORD-YYMMDD-XXXXXX) dengan retry on ER_DUP_ENTRY.
 * @param {object} data - {customer_id, user_id, items: [{service_id, quantity}]}
 * @returns {Promise<number>} orderId
 */
async function create(data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Calculate total price
    let totalPrice = 0;
    for (const item of data.items) {
      const [services] = await connection.query(
        'SELECT price FROM services WHERE id = ? AND active = TRUE',
        [item.service_id]
      );
      if (services.length === 0) {
        throw new Error(`Service ${item.service_id} not found or inactive`);
      }
      const subtotal = services[0].price * item.quantity;
      item.subtotal = subtotal;
      totalPrice += subtotal;
    }

    // Insert order dengan code (retry on dup). ER_DUP_ENTRY pada satu statement
    // tidak membatalkan transaction di InnoDB, jadi retry aman.
    let orderId;
    for (let attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
      const orderCode = generateCode(CODE_PREFIX, { withDate: true });
      try {
        const [orderResult] = await connection.query(
          `INSERT INTO orders (code, customer_id, user_id, total_price, status, payment_status) VALUES (?, ?, ?, ?, 'pending', 'unpaid')`,
          [orderCode, data.customer_id, data.user_id, totalPrice]
        );
        orderId = orderResult.insertId;
        break;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_CODE_RETRY - 1) continue;
        throw err;
      }
    }
    if (orderId === undefined) {
      throw new Error('Failed to generate unique order code after retries');
    }

    // Insert order items
    for (const item of data.items) {
      await connection.query(
        'INSERT INTO order_items (order_id, service_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
        [orderId, item.service_id, item.quantity, item.subtotal]
      );
    }

    await connection.commit();

    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Update order
 * @param {number} id
 * @param {object} data
 */
async function update(id, data) {
  const fields = [];
  const values = [];

  if (data.customer_id !== undefined) {
    fields.push('customer_id = ?');
    values.push(data.customer_id);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }

  if (fields.length === 0) return false;

  values.push(id);
  await pool.query(
    `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return true;
}

/**
 * Update order status with audit trail
 * @param {number} id
 * @param {string} newStatus
 * @param {number} changedBy
 */
async function updateStatus(id, newStatus, changedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current status
    const [orders] = await connection.query(
      'SELECT status FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return false;
    }

    const oldStatus = orders[0].status;

    // Update status
    await connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    // Create audit log
    await connection.query(
      `INSERT INTO audit_logs (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)`,
      [id, oldStatus, newStatus, changedBy]
    );

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
 * Update payment status
 * @param {number} id
 * @param {string} paymentStatus
 */
async function updatePaymentStatus(id, paymentStatus) {
  await pool.query(
    'UPDATE orders SET payment_status = ? WHERE id = ?',
    [paymentStatus, id]
  );
  return true;
}

/**
 * Delete order
 * @param {number} id
 */
async function remove(id) {
  await pool.query('DELETE FROM orders WHERE id = ?', [id]);
  return true;
}

/**
 * Get audit logs for order. Nested `user` object menyertakan `code`.
 * @param {number} orderId
 */
async function getAuditLogs(orderId) {
  const [logs] = await pool.query(`
    SELECT
      al.id,
      al.order_id,
      al.old_status,
      al.new_status,
      al.changed_by,
      al.changed_at
    FROM audit_logs al
    WHERE al.order_id = ?
    ORDER BY al.changed_at ASC
  `, [orderId]);

  // Attach nested user object for each log (with code)
  for (const log of logs) {
    const [users] = await pool.query(
      'SELECT id, code, username, role FROM users WHERE id = ?',
      [log.changed_by]
    );
    if (users.length > 0) {
      log.user = users[0];
    }
  }

  return logs;
}

module.exports = {
  findAll,
  findDetail,
  findDetailByCode,
  create,
  update,
  updateStatus,
  updatePaymentStatus,
  remove,
  getAuditLogs
};
