/**
 * Role-based Access Control Middleware
 * Mengecek apakah user memiliki role yang sesuai
 */

const { errorResponse } = require('../utils/response');

/**
 * Authorize roles
 * @param {...string} roles - Roles yang diizinkan
 */
function authorize(...roles) {
  return (req, res, next) => {
    // Check if user exists (should be added by protect middleware)
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access forbidden: ${roles.join(' or ')} only`,
        403
      );
    }

    next();
  };
}

module.exports = { authorize };
