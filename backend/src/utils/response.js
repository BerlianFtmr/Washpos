/**
 * Standard Response Helpers
 * Menyediakan fungsi untuk response yang konsisten
 */

/**
 * Success response
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {object|null} meta - Extra top-level fields (e.g. { pagination }) merged into response
 */
function successResponse(res, message = 'Success', data = null, statusCode = 200, meta = null) {
  const response = {
    success: true,
    message,
    data
  };
  if (meta && typeof meta === 'object') {
    Object.assign(response, meta);
  }
  return res.status(statusCode).json(response);
}

/**
 * Error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 */
function errorResponse(res, message = 'Error', statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    message
  });
}

/**
 * Validation error response
 * @param {object} res - Express response object
 * @param {array} errors - Array of validation errors
 */
function validationError(res, errors = []) {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors
  });
}

module.exports = {
  successResponse,
  errorResponse,
  validationError
};
