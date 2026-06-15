/**
 * resolveIdParam Middleware (FASE 4 — Code-Only)
 *
 * Factory middleware yang resolve route param `:id` dari entity code
 * (`PREFIX-...`, mis. `CUS-4F8KP2`). Middleware memvalidasi format, memastikan
 * prefix sesuai entity route, lalu lookup ke DB untuk mendapatkan INT id.
 * Hasil resolve di-inject ke `req.params.id` (sebagai number) dan
 * `req.params.code` (original string, uppercased).
 *
 * FASE 4: dukungan numeric (legacy) dihapus. Value yang bukan code valid → 400.
 *
 * Saat code valid format tapi tidak ditemukan di DB → 404.
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
 *   - `req.params.code` di-set ke code string (uppercase).
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

    // Reject legacy numeric id (FASE 4: code-only).
    if (/^\d+$/.test(rawStr)) {
      return errorResponse(
        res,
        'Numeric id is no longer supported; use the entity code instead (format: PREFIX-...)',
        400
      );
    }

    // Harus terlihat seperti entity code.
    if (!isCode(rawStr)) {
      return errorResponse(
        res,
        'ID must be a valid entity code (format: PREFIX-..., e.g. CUS-4F8KP2)',
        400
      );
    }

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
  };
}

module.exports = { resolveIdParam };
