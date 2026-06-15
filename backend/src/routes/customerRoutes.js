/**
 * Customer Routes
 * Routes untuk customer CRUD endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { resolveIdParam } = require('../middleware/resolveIdParam');
const {
  list,
  detail,
  createNew,
  updateData,
  removeData,
  createCustomerValidation,
  updateCustomerValidation
} = require('../controllers/customerController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Ahmad
 *         whatsapp:
 *           type: string
 *           example: "628123456789"
 *         address:
 *           type: string
 *           example: Jl. Contoh No. 123
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-06-04T00:00:00.000Z
 *     CreateCustomerRequest:
 *       type: object
 *       required:
 *         - name
 *         - whatsapp
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Ahmad
 *         whatsapp:
 *           type: string
 *           pattern: '^628[0-9]{8,11}$'
 *           example: "628123456789"
 *         address:
 *           type: string
 *           example: Jl. Contoh No. 123
 *     UpdateCustomerRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Ahmad Updated
 *         whatsapp:
 *           type: string
 *           pattern: '^628[0-9]{8,11}$'
 *           example: "628987654321"
 *         address:
 *           type: string
 *           example: Jl. Baru No. 456
 */

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: List all customers
 *     description: Mendapatkan daftar semua customers dengan search
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or WhatsApp
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
 *         description: Customers retrieved successfully
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
 *                   example: Customers retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 */
router.get('/', protect, list);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer detail
 *     description: Mendapatkan detail customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
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
 *                   example: Customer retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 */
router.get('/:id', protect, resolveIdParam('customers'), detail);

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create new customer
 *     description: Membuat customer baru
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerRequest'
 *     responses:
 *       201:
 *         description: Customer created successfully
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
 *                   example: Customer created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: WhatsApp already registered
 *       422:
 *         description: Validation error
 */
router.post('/', protect, createCustomerValidation, createNew);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   patch:
 *     summary: Update customer
 *     description: Update data customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCustomerRequest'
 *     responses:
 *       200:
 *         description: Customer updated successfully
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
 *                   example: Customer updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: WhatsApp already registered
 *       404:
 *         description: Customer not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', protect, resolveIdParam('customers'), updateCustomerValidation, updateData);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     description: Hapus customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       204:
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 */
router.delete('/:id', protect, resolveIdParam('customers'), removeData);

module.exports = router;
