/**
 * Jest Configuration
 * Test runner untuk utility & integration tests (hybrid ID strategy).
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js'
  ],
  verbose: true,
  testTimeout: 10000
};
