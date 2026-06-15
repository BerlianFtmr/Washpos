/**
 * User SQL Queries
 * Query functions untuk users table
 *
 * FASE 2: kolom `code` (USR-XXXXXX) di-SELECT di semua query; `findByCode`
 * ditambahkan; `create` auto-generate code dengan retry on ER_DUP_ENTRY.
 */

const pool = require('../config/database');
const { generateCode } = require('../utils/codeGenerator');

const CODE_PREFIX = 'USR';
const MAX_CODE_RETRY = 3;

/**
 * Find user by username (termasuk password utk verifikasi login).
 * @param {string} username
 */
async function findByUsername(username) {
  const [rows] = await pool.query(
    'SELECT id, code, username, password, role, created_at FROM users WHERE username = ?',
    [username]
  );
  return rows[0];
}

/**
 * Find user by ID (legacy / internal).
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, code, username, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Find user by code (case-insensitive).
 * @param {string} code - mis. 'USR-7KQ2M9'
 */
async function findByCode(code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  const [rows] = await pool.query(
    'SELECT id, code, username, role, created_at FROM users WHERE code = ? LIMIT 1',
    [code.toUpperCase()]
  );
  return rows[0];
}

/**
 * Create new user. Auto-generate `code` (USR-XXXXXX) dengan retry.
 * @param {object} data - {username, password, role}
 * @returns {Promise<number>} insertId
 */
async function create(data) {
  for (let attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
    const code = generateCode(CODE_PREFIX);
    try {
      const [result] = await pool.query(
        'INSERT INTO users (code, username, password, role) VALUES (?, ?, ?, ?)',
        [code, data.username, data.password, data.role]
      );
      return result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_CODE_RETRY - 1) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique user code after retries');
}

/**
 * Get all users with pagination
 * @param {number} page
 * @param {number} limit
 */
async function findAll(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const [users] = await pool.query(
    `SELECT id, code, username, role, created_at
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
    SELECT id, code, username, role, created_at
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
  findByCode,
  create,
  findAll,
  searchByUsername,
  update,
  remove
};
