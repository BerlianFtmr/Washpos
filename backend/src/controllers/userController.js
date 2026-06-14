/**
 * User Controller
 * CRUD logic untuk users (Admin only)
 */

const { body, validationResult } = require('express-validator');
const { findAll, findById, findByUsername, create, update, remove, searchByUsername } = require('../queries/userQueries');
const { hashPassword } = require('../utils/hash');
const { successResponse, errorResponse, validationError } = require('../utils/response');

/**
 * Validation rules
 */
const createUserValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['admin', 'pegawai'])
    .withMessage('Role must be admin or pegawai')
];

const updateUserValidation = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'pegawai'])
    .withMessage('Role must be admin or pegawai')
];

/**
 * GET /users
 * List semua users (Admin only)
 */
async function list(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(page, limit);

    return successResponse(res, 'Users retrieved successfully', result.users, 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse(res, 'Failed to retrieve users', 500);
  }
}

/**
 * GET /users/search
 * Search users by username (Admin only)
 */
async function searchByUsernameHandler(req, res) {
  try {
    const { username } = req.query;

    if (!username) {
      return errorResponse(res, 'Query parameter username is required', 400);
    }

    const users = await searchByUsername(username);

    return successResponse(res, 'Users found', users, 200);
  } catch (error) {
    console.error('Search users error:', error);
    return errorResponse(res, 'Search failed', 500);
  }
}

/**
 * GET /users/:id
 * Detail user (Admin only)
 */
async function detail(req, res) {
  try {
    const { id } = req.params;
    const user = await findById(id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, 'User retrieved successfully', user);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(res, 'Failed to retrieve user', 500);
  }
}

/**
 * POST /users
 * Buat user baru (Admin only)
 */
async function createNew(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { username, password, role } = req.body;

    // Check if username exists
    const existing = await findByUsername(username);
    if (existing) {
      return errorResponse(res, 'Username already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (auto-generate USR-XXXXXX)
    const userId = await create({
      username,
      password: hashedPassword,
      role
    });

    const user = await findById(userId);

    return successResponse(res, 'User created successfully', {
      id: user.id,
      code: user.code,
      username: user.username,
      role: user.role
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse(res, 'Failed to create user', 500);
  }
}

/**
 * PATCH /users/:id
 * Update user (Admin only)
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Hash password if provided
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    // Check if user exists
    const user = await findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Update user
    await update(id, data);

    const updated = await findById(id);

    return successResponse(res, 'User updated successfully', {
      id: updated.id,
      code: updated.code,
      username: updated.username,
      role: updated.role
    });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(res, 'Failed to update user', 500);
  }
}

/**
 * DELETE /users/:id
 * Hapus user (Admin only)
 */
async function removeData(req, res) {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await findById(id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, 'Cannot delete yourself', 400);
    }

    await remove(id);

    return successResponse(res, 'User deleted successfully', null, 204);
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
}

module.exports = {
  list,
  searchByUsername: searchByUsernameHandler,
  detail,
  createNew,
  updateData,
  removeData,
  createUserValidation,
  updateUserValidation
};
