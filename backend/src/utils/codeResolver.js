/**
 * Code Resolver Utility
 *
 * Bridge antara `code` publik (PREFIX-...) dan PK `id` (INT) internal.
 * - isCode(value): deteksi cepat "ini code atau numeric id?" (pure, no DB)
 * - isValidCode(code): validasi ketat per-prefix (pure, no DB)
 * - resolveCodeToId(table, code): lookup DB dengan cache TTL 5 menit
 * - resolveCode(code): auto-detect table dari prefix
 *
 * Dipakai middleware `resolveIdParam` & query layer (fase 2).
 */

const pool = require('../config/database');

// Single source of truth: prefix → table.
const ENTITY_TABLES = {
  USR: 'users',
  CUS: 'customers',
  SVC: 'services',
  ORD: 'orders',
  PAY: 'payments'
};

// Regex validasi per-prefix (sinkron dengan codeGenerator output & TODO.md).
const CODE_PATTERNS = {
  USR: /^USR-[0-9A-HJKMNP-TV-Z]{6}$/,
  CUS: /^CUS-[0-9A-HJKMNP-TV-Z]{6}$/,
  SVC: /^SVC-\d{2}$/,
  ORD: /^ORD-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/,
  PAY: /^PAY-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/
};

// Generic "looks like a code" pattern. Dipakai middleware untuk membedakan
// :id numerik vs :code. Mengizinkan dash dalam suffix (utk ORD/PAY YYMMDD).
const GENERIC_CODE_RE = /^[A-Z]{2,4}-[A-Z0-9-]+$/;

/**
 * Deteksi apakah value adalah entity code (bukan numeric id).
 * Case-insensitive di input.
 * @param {*} value
 * @returns {boolean}
 */
function isCode(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  return GENERIC_CODE_RE.test(value.toUpperCase());
}

/**
 * Ambil prefix dari code (uppercase). Untuk value non-code → null.
 * @param {string} code
 * @returns {string|null}
 */
function getCodePrefix(code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  const m = code.toUpperCase().match(/^([A-Z]{2,4})-/);
  return m ? m[1] : null;
}

/**
 * Validasi code terhadap pola spesifik prefix-nya.
 * @param {string} code
 * @returns {boolean}
 */
function isValidCode(code) {
  const prefix = getCodePrefix(code);
  if (!prefix || !CODE_PATTERNS[prefix]) return false;
  return CODE_PATTERNS[prefix].test(code.toUpperCase());
}

// === Cache in-memory sederhana (TTL 5 menit) ===
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // key: `${table}:${CODE_UPPER}` → { id, expiresAt }

/**
 * Resolve code menjadi id (INT) via DB lookup. Case-insensitive. Cached 5 menit.
 *
 * @param {string} table - Nama tabel (mis. 'users').
 * @param {string} code  - Code yang di-resolve.
 * @returns {Promise<number|null>} id bila ditemukan, null bila tidak / invalid.
 */
async function resolveCodeToId(table, code) {
  if (typeof code !== 'string' || code.length === 0) return null;
  if (typeof table !== 'string' || table.length === 0) return null;

  const codeUpper = code.toUpperCase();
  const cacheKey = `${table}:${codeUpper}`;

  // Cache hit (masih valid)?
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  const [rows] = await pool.query(
    `SELECT id FROM \`${table}\` WHERE code = ? LIMIT 1`,
    [codeUpper]
  );
  const id = rows.length > 0 ? rows[0].id : null;

  // Simpan ke cache (termasuk negative result utk hindari query berulang).
  cache.set(cacheKey, { id, expiresAt: Date.now() + CACHE_TTL_MS });
  return id;
}

/**
 * Resolve code ke { id, table } berdasarkan prefix (auto-detect table).
 * @param {string} code
 * @returns {Promise<{id: number, table: string}|null>}
 */
async function resolveCode(code) {
  const prefix = getCodePrefix(code);
  if (!prefix) return null;
  const table = ENTITY_TABLES[prefix];
  if (!table) return null;
  const id = await resolveCodeToId(table, code);
  if (id == null) return null;
  return { id, table };
}

/** Bersihkan cache (testing / invalidasi paksa). */
function clearResolverCache() {
  cache.clear();
}

module.exports = {
  isCode,
  isValidCode,
  getCodePrefix,
  resolveCodeToId,
  resolveCode,
  clearResolverCache,
  ENTITY_TABLES,
  CODE_PATTERNS,
  GENERIC_CODE_RE
};
