/**
 * Order Routes
 * Routes untuk order CRUD + status update
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  list,
  detail,
  createNew,
  updateData,
  updateStatusHandler,
  removeData,
  createOrderValidation,
  updateOrderValidation,
  updateStatusValidation
} = require('../controllers/orderController');
const {
  createForOrder,
  createPaymentValidation
} = require('../controllers/paymentController');

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         service_id:
 *           type: integer
 *           example: 1
 *         service_name:
 *           type: string
 *           example: "Cuci Kiloan"
 *         quantity:
 *           type: number
 *           format: float
 *           example: 5
 *         subtotal:
 *           type: number
 *           format: float
 *           example: 25000
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         customer_id:
 *           type: integer
 *           example: 1
 *         customer_name:
 *           type: string
 *           example: Ahmad
 *         customer_whatsapp:
 *           type: string
 *           example: "628123456789"
 *         user_id:
 *           type: integer
 *           example: 2
 *         user_name:
 *           type: string
 *           example: pegawai1
 *         status:
 *           type: string
 *           enum: [pending, dicuci, disetrika, siap, diambil, cancelled]
 *           example: pending
 *         payment_status:
 *           type: string
 *           enum: [unpaid, partial, paid]
 *           example: unpaid
 *         total_price:
 *           type: number
 *           format: float
 *           example: 45000
 *         notes:
 *           type: string
 *           example: "Cucian urgent"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         audit_logs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               old_status:
 *                 type: string
 *               new_status:
 *                 type: string
 *               changed_by_name:
 *                 type: string
 *               changed_at:
 *                 type: string
 *                 format: date-time
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - customer_id
 *         - items
 *       properties:
 *         customer_id:
 *           type: integer
 *           example: 1
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - service_id
 *               - quantity
 *             properties:
 *               service_id:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 format: float
 *                 example: 5
 *         notes:
 *           type: string
 *           example: "Cucian urgent"
 *     UpdateOrderRequest:
 *       type: object
 *       properties:
 *         customer_id:
 *           type: integer
 *           example: 2
 *         notes:
 *           type: string
 *           example: "Update notes"
 *     UpdateStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, dicuci, disetrika, siap, diambil, cancelled]
 *           example: dicuci
 */

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: List all orders
 *     description: Mendapatkan daftar semua orders (pegawai hanya order sendiri)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, dicuci, disetrika, siap, diambil, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer
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
 *         description: Orders retrieved successfully
 */
router.get('/', protect, list);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order detail
 *     description: Mendapatkan detail order dengan items dan audit logs
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       403:
 *         description: Access forbidden (pegawai hanya order sendiri)
 *       404:
 *         description: Order not found
 */
router.get('/:id', protect, detail);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create new order
 *     description: Membuat order baru dengan multiple items
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Service not found or inactive
 *       422:
 *         description: Validation error
 */
router.post('/', protect, createOrderValidation, createNew);

/**
 * @swagger
 * /api/v1/orders/{id}/payments:
 *   post:
 *     summary: Create payment for order
 *     description: Membuat payment untuk order dengan auto-update payment_status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 30000
 *               method:
 *                 type: string
 *                 enum: [cash, transfer, ewallet]
 *                 example: transfer
 *               note:
 *                 type: string
 *                 example: "DP via transfer"
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       404:
 *         description: Order not found
 *       422:
 *         description: Validation error
 */
router.post('/:id/payments', protect, createPaymentValidation, createForOrder);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   patch:
 *     summary: Update order
 *     description: Update data order (customer_id, notes)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderRequest'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       403:
 *         description: Access forbidden (pegawai hanya order sendiri)
 *       404:
 *         description: Order not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', protect, updateOrderValidation, updateData);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update status order dengan audit trail
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Cannot update completed/cancelled order
 *       403:
 *         description: Access forbidden (pegawai hanya order sendiri)
 *       404:
 *         description: Order not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id/status', protect, updateStatusValidation, updateStatusHandler);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   delete:
 *     summary: Delete order
 *     description: Hapus order (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Order deleted successfully
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: Order not found
 */
router.delete('/:id', protect, authorize('admin'), removeData);

module.exports = router;
