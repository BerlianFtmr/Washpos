/**
 * Authentication Middleware
 * Verifikasi JWT token dari Authorization header.
 *
 * FASE 4: JWT payload sekarang membawa `code` (bukan `id`). Middleware
 * me-resolve `code` → `id` INT internal via codeResolver (cached 5 menit)
 * supaya controller tetap bisa pakai `req.user.id` untuk FK operations
 * (pegawai isolation, audit trail `changed_by`, dll). `req.user.code` juga
 * tersedia. Bila code tidak ditemukan di DB → 401 (token tidak valid lagi).
 */

const { verifyToken } = require('../utils/jwt');
const { resolveCodeToId } = require('../utils/codeResolver');
const { errorResponse } = require('../utils/response');

/**
 * Protect route - require authentication
 */
async function protect(req, res, next) {
  try {
    // Get token from header
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // FASE 4: token harus membawa `code`. Token lama (hanya `id`) → invalid.
    if (!decoded.code) {
      return errorResponse(res, 'Invalid token (legacy session — please login again)', 401);
    }

    // Resolve code → id internal (cached). Menjaga agar `req.user.id` tetap
    // tersedia untuk FK operations tanpa membocorkan id ke response publik.
    const userId = await resolveCodeToId('users', decoded.code);
    if (userId == null) {
      return errorResponse(res, 'Invalid token (user no longer exists)', 401);
    }

    // Add user info to request
    req.user = {
      id: userId,
      code: decoded.code,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    return errorResponse(res, 'Authentication failed', 401);
  }
}

module.exports = { protect };
