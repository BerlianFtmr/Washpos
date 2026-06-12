/**
 * JWT Utility Functions
 * Menggunakan jsonwebtoken untuk JWT token generation & verification
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {object} payload - Data to encode in token
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken
};
