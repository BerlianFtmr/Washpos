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
 */
function successResponse(res, message = 'Success', data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
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
