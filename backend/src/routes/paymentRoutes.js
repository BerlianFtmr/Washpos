/**
 * Payment Routes
 * Routes untuk payment CRUD endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  list,
  detail,
  createForOrder,
  updateData,
  removeData,
  createPaymentValidation,
  updatePaymentValidation
} = require('../controllers/paymentController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         order_id:
 *           type: integer
 *           example: 1
 *         amount:
 *           type: number
 *           format: float
 *           example: 45000
 *         method:
 *           type: string
 *           enum: [cash, transfer, ewallet]
 *           example: cash
 *         note:
 *           type: string
 *           example: "Lunas"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-06-04T15:00:00.000Z
 *         order_total_price:
 *           type: number
 *           format: float
 *           example: 45000
 *         order_payment_status:
 *           type: string
 *           enum: [unpaid, partial, paid]
 *           example: paid
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - method
 *       properties:
 *         amount:
 *           type: number
 *           format: float
 *           example: 45000
 *         method:
 *           type: string
 *           enum: [cash, transfer, ewallet]
 *           example: cash
 *         note:
 *           type: string
 *           example: "Lunas"
 *     UpdatePaymentRequest:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           format: float
 *           example: 50000
 *         method:
 *           type: string
 *           enum: [cash, transfer, ewallet]
 *           example: transfer
 *         note:
 *           type: string
 *           example: "Updated note"
 */

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: List all payments
 *     description: Mendapatkan daftar semua payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: order_id
 *         schema:
 *           type: integer
 *         description: Filter by order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
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
 *                   example: Payments retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 */
router.get('/', protect, list);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment detail
 *     description: Mendapatkan detail payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                   example: Payment retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 */
router.get('/:id', protect, detail);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   patch:
 *     summary: Update payment
 *     description: Update data payment (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentRequest'
 *     responses:
 *       200:
 *         description: Payment updated successfully
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
 *                   example: Payment updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: Payment not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', protect, authorize('admin'), updatePaymentValidation, updateData);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   delete:
 *     summary: Delete payment
 *     description: Hapus payment (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       204:
 *         description: Payment deleted successfully
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: Payment not found
 */
router.delete('/:id', protect, authorize('admin'), removeData);

module.exports = router;
