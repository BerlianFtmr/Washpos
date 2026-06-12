/**
 * Order SQL Queries
 * Query functions untuk orders, order_items, dan audit_logs
 */

const pool = require('../config/database');

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
      o.customer_id,
      c.name AS customer_name,
      c.whatsapp AS customer_whatsapp,
      o.user_id,
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
 * Get order detail with items
 * @param {number} id
 */
async function findDetail(id) {
  const [orders] = await pool.query(`
    SELECT
      o.id,
      o.customer_id,
      c.name AS customer_name,
      c.whatsapp AS customer_whatsapp,
      c.address AS customer_address,
      o.user_id,
      u.username AS user_name,
      o.status,
      o.payment_status,
      o.total_price,
      o.notes,
      o.created_at,
      o.updated_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) return null;

  const order = orders[0];

  // Get order items
  const [items] = await pool.query(`
    SELECT
      oi.id,
      oi.service_id,
      s.name AS service_name,
      oi.quantity,
      oi.subtotal
    FROM order_items oi
    JOIN services s ON oi.service_id = s.id
    WHERE oi.order_id = ?
  `, [id]);

  order.items = items;

  return order;
}

/**
 * Create order with items (transaction)
 * @param {object} data - {customer_id, user_id, items: [{service_id, quantity}]}
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

    // Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (customer_id, user_id, total_price, status, payment_status) VALUES (?, ?, ?, 'pending', 'unpaid')`,
      [data.customer_id, data.user_id, totalPrice]
    );

    const orderId = orderResult.insertId;

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
 * Get audit logs for order
 * @param {number} orderId
 */
async function getAuditLogs(orderId) {
  const [logs] = await pool.query(`
    SELECT
      al.id,
      al.old_status,
      al.new_status,
      al.changed_at,
      u.username AS changed_by_name
    FROM audit_logs al
    JOIN users u ON al.changed_by = u.id
    WHERE al.order_id = ?
    ORDER BY al.changed_at ASC
  `, [orderId]);

  return logs;
}

module.exports = {
  findAll,
  findDetail,
  create,
  update,
  updateStatus,
  updatePaymentStatus,
  remove,
  getAuditLogs
};
