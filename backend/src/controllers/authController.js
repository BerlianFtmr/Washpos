/**
 * Authentication Controller
 * Logic untuk login, register, dan me (current user)
 */

const { body, validationResult } = require('express-validator');
const { findByUsername, findById, create } = require('../queries/userQueries');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse, validationError } = require('../utils/response');

/**
 * Validation rules
 */
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'pegawai'])
    .withMessage('Role must be admin or pegawai')
];

const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * POST /auth/login
 * Login dan dapatkan JWT token
 */
async function login(req, res) {
  // Check validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await findByUsername(username);

    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate token (FASE 4: payload membawa `code`, bukan `id`)
    const token = generateToken({
      code: user.code,
      username: user.username,
      role: user.role
    });

    return successResponse(res, 'Login successful', {
      token,
      user: {
        code: user.code,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
}

/**
 * POST /auth/register
 * Register user baru (Admin only)
 */
async function register(req, res) {
  // Check validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { username, password, role = 'pegawai' } = req.body;

    // Check if username already exists
    const existing = await findByUsername(username);
    if (existing) {
      return errorResponse(res, 'Username already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = await create({
      username,
      password: hashedPassword,
      role
    });

    // Get created user
    const user = await findById(userId);

    return successResponse(res, 'User created successfully', {
      code: user.code,
      username: user.username,
      role: user.role
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'Register failed', 500);
  }
}

/**
 * GET /auth/me
 * Dapatkan info user yang sedang login
 */
async function me(req, res) {
  try {
    // User info sudah ada di req.user dari auth middleware
    const user = await findById(req.user.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, 'User retrieved successfully', {
      code: user.code,
      username: user.username,
      role: user.role,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Me error:', error);
    return errorResponse(res, 'Failed to retrieve user', 500);
  }
}

/**
 * POST /auth/logout
 * Logout user
 * Untuk stateless JWT, ini hanya mengembalikan success message
 * Client-side harus menghapus token dari localStorage
 */
async function logout(req, res) {
  try {
    // Untuk stateless JWT, kita tidak perlu melakukan apa-apa di server
    // Client bertanggung jawab untuk menghapus token dari localStorage
    return successResponse(res, 'Logout successful', null, 200);
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
}

module.exports = {
  login,
  register,
  me,
  logout,
  registerValidation,
  loginValidation
};
