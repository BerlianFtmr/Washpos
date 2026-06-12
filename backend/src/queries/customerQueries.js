/**
 * Customer SQL Queries
 * Query functions untuk customers table
 */

const pool = require('../config/database');

/**
 * Get all customers with search and pagination
 * @param {string} search - Search keyword (name or whatsapp)
 * @param {number} page
 * @param {number} limit
 */
async function findAll(search = '', page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  let query = `
    SELECT id, name, whatsapp, address, created_at
    FROM customers
  `;
  let params = [];

  // Add search filter
  if (search) {
    query += ` WHERE name LIKE ? OR whatsapp LIKE ?`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [customers] = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM customers';
  let countParams = [];

  if (search) {
    countQuery += ` WHERE name LIKE ? OR whatsapp LIKE ?`;
    countParams.push(`%${search}%`, `%${search}%`);
  }

  const [count] = await pool.query(countQuery, countParams);

  return {
    customers,
    pagination: {
      page,
      limit,
      total: count[0].total
    }
  };
}

/**
 * Find customer by ID
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, whatsapp, address, created_at FROM customers WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Find customer by WhatsApp
 * @param {string} whatsapp
 */
async function findByWhatsapp(whatsapp) {
  const [rows] = await pool.query(
    'SELECT id, name, whatsapp, address, created_at FROM customers WHERE whatsapp = ?',
    [whatsapp]
  );
  return rows[0];
}

/**
 * Create new customer
 * @param {object} data - {name, whatsapp, address}
 */
async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO customers (name, whatsapp, address) VALUES (?, ?, ?)',
    [data.name, data.whatsapp, data.address || null]
  );
  return result.insertId;
}

/**
 * Update customer
 * @param {number} id
 * @param {object} data
 */
async function update(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.whatsapp !== undefined) {
    fields.push('whatsapp = ?');
    values.push(data.whatsapp);
  }
  if (data.address !== undefined) {
    fields.push('address = ?');
    values.push(data.address);
  }

  if (fields.length === 0) return false;

  values.push(id);
  await pool.query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return true;
}

/**
 * Delete customer
 * @param {number} id
 * @returns {boolean} - true if deleted, false if not found
 */
async function remove(id) {
  const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  findByWhatsapp,
  create,
  update,
  remove
};
