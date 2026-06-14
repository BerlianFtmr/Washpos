/**
 * Code Validator Helpers (FASE 2)
 *
 * Helper untuk dipakai di chain `express-validator` (`.custom(...)`) maupun
 * inline di controller. Mendukung validasi field yang boleh berupa:
 *   - integer ID (legacy), atau
 *   - entity code berformat `PREFIX-...` (baru).
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

/**
 * Cek apakah `value` adalah positive integer (boleh string numerik atau number).
 * @param {*} value
 * @returns {boolean}
 */
function isPositiveInt(value) {
  if (value === null || value === undefined) return false;
  // Reject float-form string seperti "1.5"
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) return false;
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
  }
  return Number.isInteger(value) && value > 0;
}

/**
 * Factory custom-validator: value boleh int ATAU code untuk `prefix`.
 * Dipakai di body('field').custom(isIntOrCode('CUS')).
 *
 * Mengembalikan function `(value) => boolean` yang melempar Error dengan pesan
 * deskriptif bila value bukan int maupun code valid.
 *
 * @param {string} prefix
 * @returns {(value: *) => true}
 */
function isIntOrCode(prefix) {
  return (value) => {
    // optional — skip bila kosong (keberadaan diatur di validator lain)
    if (value === undefined || value === null || value === '') return true;
    if (isPositiveInt(value)) return true;
    if (isEntityCode(prefix, value)) return true;
    throw new Error(
      `Must be a positive integer ID or a valid ${prefix} code (e.g. ${prefix}-XXXXXX)`
    );
  };
}

module.exports = {
  isEntityCode,
  isPositiveInt,
  isIntOrCode
};
