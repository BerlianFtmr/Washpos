/**
 * Code Generator Utility
 *
 * Menghasilkan business code unik per entity (strategi ID hybrid:
 * PK INT internal + kolom `code` publik berformat PREFIX-...).
 *
 * Alphabet: Base32 Crockford (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`)
 * — 32 simbol, tidak ambigu (tanpa I/L/O/U yang mirip 1/1/0/V).
 *
 * Sumber randomness: `crypto.randomBytes` (cryptographically secure).
 * Dilarang memakai `Math.random()`.
 */

const crypto = require('crypto');

// Base32 Crockford — excludes I, L, O, U.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ALPHABET_LEN = ALPHABET.length; // 32

const DEFAULT_RANDOM_LENGTH = 6;
const DEFAULT_SEQ_PAD = 2;

// 256 (byte range) habis dibagi 32 → `byte % 32` tidak menimbulkan modulo bias,
// sehingga distribusi simbol uniform.
function randomBase32(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET_LEN];
  }
  return out;
}

/**
 * Format tanggal menjadi YYMMDD (WIB/local time).
 * @param {Date} [date]
 * @returns {string}
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Generate a unique business code.
 *
 * @param {string} prefix - Entity prefix (mis. 'USR', 'CUS', 'ORD', 'PAY', 'SVC').
 * @param {object} [opts]
 * @param {boolean} [opts.withDate=false] - Sisipkan segmen YYMMDD (orders/payments).
 * @param {number}  [opts.randomLength=6] - Panjang segmen random Base32.
 * @param {boolean} [opts.sequential=false] - Pakai suffix numerik sekuensial (services).
 * @param {number}  [opts.seqValue] - Nilai sekuensial (non-negatif). WAJIB saat `sequential=true`;
 *        biasanya = `MAX(seq_number) + 1` dari DB (dihitung caller).
 * @param {number}  [opts.pad=2] - Lebar zero-pad untuk mode sekuensial.
 * @param {Date}    [opts.date] - Override tanggal untuk mode `withDate` (testing).
 * @returns {string} Code hasil, UPPERCASE.
 *
 * @example
 * generateCode('USR')                                        // 'USR-7KQ2M9'
 * generateCode('CUS')                                        // 'CUS-4F8KP2'
 * generateCode('ORD', { withDate: true, date: new Date('2026-06-14') }) // 'ORD-250614-K7M2QF'
 * generateCode('PAY', { withDate: true })                    // 'PAY-<YYMMDD>-XXXXXX'
 * generateCode('SVC', { sequential: true, seqValue: 1 })     // 'SVC-01'
 * generateCode('SVC', { sequential: true, seqValue: 10 })    // 'SVC-10'
 */
function generateCode(prefix, opts = {}) {
  if (!prefix || typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error('generateCode: prefix harus string non-empty');
  }
  const upperPrefix = prefix.toUpperCase();

  // Mode sekuensial (mis. SVC-01)
  if (opts.sequential) {
    const seq = opts.seqValue;
    if (typeof seq !== 'number' || !Number.isFinite(seq) || seq < 0 || !Number.isInteger(seq)) {
      throw new Error('generateCode: mode sekuensial butuh opts.seqValue (integer >= 0)');
    }
    const pad = typeof opts.pad === 'number' && opts.pad > 0 ? opts.pad : DEFAULT_SEQ_PAD;
    return `${upperPrefix}-${String(seq).padStart(pad, '0')}`;
  }

  const randomLength = typeof opts.randomLength === 'number' && opts.randomLength > 0
    ? opts.randomLength
    : DEFAULT_RANDOM_LENGTH;
  const randomPart = randomBase32(randomLength);

  if (opts.withDate) {
    const dateSeg = formatDate(opts.date);
    return `${upperPrefix}-${dateSeg}-${randomPart}`;
  }

  return `${upperPrefix}-${randomPart}`;
}

module.exports = {
  generateCode,
  randomBase32,
  formatDate,
  ALPHABET
};
