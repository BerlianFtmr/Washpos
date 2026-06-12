/**
 * User Routes
 * Routes untuk user CRUD endpoints (Admin only)
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  list,
  searchByUsername,
  detail,
  createNew,
  updateData,
  removeData,
  createUserValidation,
  updateUserValidation
} = require('../controllers/userController');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         username:
 *           type: string
 *           example: admin
 *         role:
 *           type: string
 *           enum: [admin, pegawai]
 *           example: admin
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-06-04T00:00:00.000Z
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: pegawai2
 *         password:
 *           type: string
 *           minLength: 6
 *           format: password
 *           example: password123
 *         role:
 *           type: string
 *           enum: [admin, pegawai]
 *           example: pegawai
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: pegawai2_updated
 *         password:
 *           type: string
 *           minLength: 6
 *           format: password
 *           example: newpassword123
 *         role:
 *           type: string
 *           enum: [admin, pegawai]
 *           example: admin
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List all users
 *     description: Mendapatkan daftar semua users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Access forbidden (Admin only)
 */
router.get('/', protect, authorize('admin'), list);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search users by username
 *     description: Mencari users berdasarkan username (partial match, Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to search for (partial match)
 *         example: admin
 *     responses:
 *       200:
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users found
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       400:
 *         description: Username parameter is required
 *       403:
 *         description: Access forbidden (Admin only)
 */
router.get('/search', protect, authorize('admin'), searchByUsername);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user detail
 *     description: Mendapatkan detail user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: User not found
 */
router.get('/:id', protect, authorize('admin'), detail);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create new user
 *     description: Membuat user baru (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Username already exists
 *       403:
 *         description: Access forbidden (Admin only)
 *       422:
 *         description: Validation error
 */
router.post('/', protect, authorize('admin'), createUserValidation, createNew);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Update user
 *     description: Update data user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', protect, authorize('admin'), updateUserValidation, updateData);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Hapus user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete yourself
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: User not found
 */
router.delete('/:id', protect, authorize('admin'), removeData);

module.exports = router;
