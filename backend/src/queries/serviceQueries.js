/**
 * Service SQL Queries
 * Query functions untuk services table
 *
 * FASE 2: kolom `code` (SVC-NN sequential) di-SELECT di semua query;
 * `findByCode` ditambahkan; `create` auto-generate code sekuensial dgn retry.
 */

const pool = require('../config/database');
const { generateCode } = require('../utils/codeGenerator');

const CODE_PREFIX = 'SVC';
const MAX_CODE_RETRY = 3;

/**
 * Get all services with active filter
 * @param {boolean} activeOnly - Filter hanya yang aktif
 * @param {number} page
 * @param {number} limit
 */
async function findAll(activeOnly = false, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  let query = 'SELECT id, code, name, price, unit, active, created_at FROM services';
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
 * Find service by ID.
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, code, name, price, unit, active, created_at FROM services WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Find service by code (case-insensitive).
 * @param {string} code - mis. 'SVC-01'
 */
async function findByCode(code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  const [rows] = await pool.query(
    'SELECT id, code, name, price, unit, active, created_at FROM services WHERE code = ? LIMIT 1',
    [code.toUpperCase()]
  );
  return rows[0];
}

/**
 * Hitung nomor sekuensial SVC berikutnya (MAX+1) berdasar code yang sudah ada.
 * Idempoten terhadap re-run: skip nomor yang sudah dipakai.
 * @returns {Promise<number>}
 */
async function getNextServiceSeq() {
  const [rows] = await pool.query(
    "SELECT code FROM services WHERE code REGEXP '^SVC-[0-9]{2}$'"
  );
  const usedNums = new Set(
    rows.map((r) => parseInt(r.code.split('-')[1], 10)).filter((n) => !Number.isNaN(n))
  );
  let seq = 1;
  while (usedNums.has(seq)) seq++;
  return seq;
}

/**
 * Create new service. Auto-generate `code` sekuensial (SVC-NN, NN = MAX+1)
 * dengan retry on ER_DUP_ENTRY (race condition antar concurrent insert).
 * @param {object} data - {name, price, unit, active}
 * @returns {Promise<number>} insertId
 */
async function create(data) {
  for (let attempt = 0; attempt < MAX_CODE_RETRY; attempt++) {
    const seq = await getNextServiceSeq();
    const code = generateCode(CODE_PREFIX, { sequential: true, seqValue: seq });
    try {
      const [result] = await pool.query(
        'INSERT INTO services (code, name, price, unit, active) VALUES (?, ?, ?, ?, ?)',
        [code, data.name, data.price, data.unit, data.active !== undefined ? data.active : true]
      );
      return result.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_CODE_RETRY - 1) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique service code after retries');
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
  findByCode,
  getNextServiceSeq,
  create,
  update,
  remove
};
