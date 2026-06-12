/**
 * Authentication Middleware
 * Verifikasi JWT token dari Authorization header
 */

const { verifyToken } = require('../utils/jwt');
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

    // Add user info to request
    req.user = {
      id: decoded.id,
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
