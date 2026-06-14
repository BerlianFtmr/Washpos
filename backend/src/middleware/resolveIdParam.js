/**
 * resolveIdParam Middleware (FASE 2 — Backend Dual Support)
 *
 * Factory middleware yang membuat route param `:id` mendukung DUA mode:
 *   1. **Code mode** — value ber-format entity code (`PREFIX-...`, mis. `CUS-4F8KP2`).
 *      Middleware memvalidasi format, memastikan prefix sesuai entity route,
 *      lalu lookup ke DB untuk mendapatkan INT id. Hasil resolve di-inject ke
 *      `req.params.id` (sebagai number) dan `req.params.code` (original string).
 *   2. **Legacy numeric mode** — value adalah integer (mis. `5`). Pass-through
 *      langsung ke `req.params.id` sebagai number. Tetap berfungsi untuk
 *      kompatibilitas mundur (akan dihapus di FASE 4).
 *
 * Saat nilai bukan integer maupun code valid → response 400.
 * Saat code valid format tapi tidak ditemukan di DB → response 404.
 *
 * Usage di routes:
 *   router.get('/:id', protect, resolveIdParam('customers'), detail);
 *
 * @module middleware/resolveIdParam
 */

const {
  isCode,
  isValidCode,
  getCodePrefix,
  resolveCodeToId,
  ENTITY_TABLES
} = require('../utils/codeResolver');
const { errorResponse } = require('../utils/response');

/**
 * Capitalize first letter (utk pesan error yang ramah dibaca).
 * @param {string} s
 * @returns {string}
 */
function capitalize(s) {
  return typeof s === 'string' && s.length > 0
    ? s.charAt(0).toUpperCase() + s.slice(1)
    : s;
}

/**
 * Factory: buat middleware yang resolve `:id` untuk entity `entityTable`.
 *
 * @param {string} entityTable - Nama tabel (mis. 'customers', 'orders', 'users',
 *   'services', 'payments'). Dipakai untuk: (a) validasi prefix code sesuai
 *   entity, (b) lookup `resolveCodeToId(entityTable, code)`.
 * @returns {Function} Express middleware async.
 *
 * Post-condition (berhasil):
 *   - `req.params.id` selalu number (resolved int).
 *   - `req.params.code` di-set HANYA bila input adalah code (undefined untuk legacy).
 */
function resolveIdParam(entityTable) {
  if (!entityTable || typeof entityTable !== 'string') {
    throw new Error('resolveIdParam: entityTable wajib diisi (mis. "customers")');
  }

  return async (req, res, next) => {
    const raw = req.params.id;

    if (raw === undefined || raw === null || raw === '') {
      return errorResponse(res, 'ID parameter is required', 400);
    }

    const rawStr = String(raw);

    // === Branch 1: value terlihat seperti entity code ===
    if (isCode(rawStr)) {
      const prefix = getCodePrefix(rawStr);

      // Prefix harus milik entity route ini (cegah CUS-... di /orders/:id).
      const expectedTable = ENTITY_TABLES[prefix];
      if (expectedTable !== entityTable) {
        return errorResponse(
          res,
          `Code prefix '${prefix}' does not match this resource (expected ${entityTable})`,
          400
        );
      }

      // Validasi ketat format per-prefix.
      if (!isValidCode(rawStr)) {
        return errorResponse(
          res,
          `Invalid code format: '${rawStr}' for prefix '${prefix}'`,
          400
        );
      }

      // Lookup ke DB (cached 5 menit di codeResolver).
      let id;
      try {
        id = await resolveCodeToId(entityTable, rawStr);
      } catch (err) {
        console.error(`resolveIdParam: DB lookup error for ${entityTable}/${rawStr}:`, err);
        return errorResponse(res, 'Failed to resolve code', 500);
      }

      if (id == null) {
        return errorResponse(
          res,
          `${capitalize(entityTable)} with code '${rawStr.toUpperCase()}' not found`,
          404
        );
      }

      req.params.code = rawStr.toUpperCase();
      req.params.id = id; // overwrite original string dengan resolved int
      return next();
    }

    // === Branch 2: legacy numeric id ===
    if (!/^\d+$/.test(rawStr)) {
      return errorResponse(
        res,
        'ID must be a positive integer or a valid entity code (format: PREFIX-...)',
        400
      );
    }

    req.params.id = parseInt(rawStr, 10);
    // req.params.code tetap undefined (legacy mode)
    return next();
  };
}

module.exports = { resolveIdParam };
