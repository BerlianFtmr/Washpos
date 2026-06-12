/**
 * Service SQL Queries
 * Query functions untuk services table
 */

const pool = require('../config/database');

/**
 * Get all services with active filter
 * @param {boolean} activeOnly - Filter hanya yang aktif
 * @param {number} page
 * @param {number} limit
 */
async function findAll(activeOnly = false, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  let query = 'SELECT id, name, price, unit, active, created_at FROM services';
  let params = [];

  // Add active filter
  if (activeOnly) {
    query += ' WHERE active = TRUE';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [services] = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM services';
  if (activeOnly) {
    countQuery += ' WHERE active = TRUE';
  }

  const [count] = await pool.query(countQuery);

  return {
    services,
    pagination: {
      page,
      limit,
      total: count[0].total
    }
  };
}

/**
 * Find service by ID
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, price, unit, active, created_at FROM services WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Create new service
 * @param {object} data - {name, price, unit, active}
 */
async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO services (name, price, unit, active) VALUES (?, ?, ?, ?)',
    [data.name, data.price, data.unit, data.active !== undefined ? data.active : true]
  );
  return result.insertId;
}

/**
 * Update service
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
  if (data.price !== undefined) {
    fields.push('price = ?');
    values.push(data.price);
  }
  if (data.unit !== undefined) {
    fields.push('unit = ?');
    values.push(data.unit);
  }
  if (data.active !== undefined) {
    fields.push('active = ?');
    values.push(data.active);
  }

  if (fields.length === 0) return false;

  values.push(id);
  await pool.query(
    `UPDATE services SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return true;
}

/**
 * Delete service
 * @param {number} id
 */
async function remove(id) {
  await pool.query('DELETE FROM services WHERE id = ?', [id]);
  return true;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove
};
