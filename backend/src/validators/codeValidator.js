/**
 * Code Validator Helpers (FASE 4 — Code-Only)
 *
 * Helper untuk dipakai di chain `express-validator` (`.custom(...)`) maupun
 * inline di controller. FASE 4: field publik HANYA menerima entity code
 * berformat `PREFIX-...`. Validasi legacy integer (isIntOrCode) telah dihapus.
 *
 * @module validators/codeValidator
 */

const { CODE_PATTERNS } = require('../utils/codeResolver');

/**
 * Cek apakah `value` adalah entity code valid untuk `prefix` tertentu.
 * Case-insensitive (di-uppercase sebelum match).
 *
 * @param {string} prefix - Salah satu: 'USR' | 'CUS' | 'SVC' | 'ORD' | 'PAY'.
 * @param {*} value
 * @returns {boolean}
 *
 * @example
 * isEntityCode('CUS', 'CUS-4F8KP2')   // true
 * isEntityCode('CUS', 'cus-4f8kp2')   // true (case-insensitive)
 * isEntityCode('CUS', 'ORD-260614-K7M2QF')  // false (wrong prefix)
 * isEntityCode('CUS', 5)              // false
 */
function isEntityCode(prefix, value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const re = CODE_PATTERNS[prefix];
  if (!re) return false;
  return re.test(value.toUpperCase());
}

module.exports = {
  isEntityCode
};
