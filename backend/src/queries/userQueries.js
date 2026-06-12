/**
 * User SQL Queries
 * Query functions untuk users table
 */

const pool = require('../config/database');

/**
 * Find user by username
 * @param {string} username
 */
async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, username, password, role, created_at FROM users WHERE username = ?',
    [username]
  );
  return rows[0];
}

/**
 * Find user by ID
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Create new user
 * @param {object} data - {username, password, role}
 */
async function create(data) {
  const [result] = await pool.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [data.username, data.password, data.role]
  );
  return result.insertId;
}

/**
 * Get all users with pagination
 * @param {number} page
 * @param {number} limit
 */
async function findAll(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const [users] = await pool.query(
    `SELECT id, username, role, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [count] = await pool.query('SELECT COUNT(*) as total FROM users');

  return {
    users,
    pagination: {
      page,
      limit,
      total: count[0].total
    }
  };
}

/**
 * Search users by username
 * @param {string} username - Username to search for (partial match)
 */
async function searchByUsername(username) {
  const query = `
    SELECT id, username, role, created_at
    FROM users
    WHERE username LIKE ?
    ORDER BY username ASC
  `;
  const [rows] = await pool.query(query, [`%${username}%`]);
  return rows;
}

/**
 * Update user
 * @param {number} id
 * @param {object} data
 */
async function update(id, data) {
  const fields = [];
  const values = [];

  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.password !== undefined) {
    fields.push('password = ?');
    values.push(data.password);
  }
  if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }

  if (fields.length === 0) return false;

  values.push(id);
  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return true;
}

/**
 * Delete user
 * @param {number} id
 */
async function remove(id) {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return true;
}

module.exports = {
  findByUsername,
  findById,
  create,
  findAll,
  searchByUsername,
  update,
  remove
};
