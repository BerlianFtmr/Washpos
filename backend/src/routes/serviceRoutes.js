/**
 * Service Routes
 * Routes untuk service CRUD endpoints (admin write, pegawai read)
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { resolveIdParam } = require('../middleware/resolveIdParam');
const {
  list,
  detail,
  createNew,
  updateData,
  removeData,
  createServiceValidation,
  updateServiceValidation
} = require('../controllers/serviceController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Cuci Kiloan"
 *         price:
 *           type: number
 *           format: float
 *           example: 5000
 *         unit:
 *           type: string
 *           enum: [kg, piece, meter, pair, item]
 *           example: kg
 *         active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2026-06-04T00:00:00.000Z
 *     CreateServiceRequest:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - unit
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "Cuci Kiloan"
 *         price:
 *           type: number
 *           format: float
 *           example: 5000
 *         unit:
 *           type: string
 *           enum: [kg, piece, meter, pair, item]
 *           example: kg
 *         active:
 *           type: boolean
 *           example: true
 *     UpdateServiceRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "Cuci Kiloan Express"
 *         price:
 *           type: number
 *           format: float
 *           example: 7000
 *         unit:
 *           type: string
 *           enum: [kg, piece, meter, pair, item]
 *           example: kg
 *         active:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/v1/services:
 *   get:
 *     summary: List all services
 *     description: Mendapatkan daftar semua services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *         description: Filter hanya yang aktif
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
 *         description: Services retrieved successfully
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
 *                   example: Services retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 */
router.get('/', protect, list);

/**
 * @swagger
 * /api/v1/services/{id}:
 *   get:
 *     summary: Get service detail
 *     description: Mendapatkan detail service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
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
 *                   example: Service retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       404:
 *         description: Service not found
 */
router.get('/:id', protect, resolveIdParam('services'), detail);

/**
 * @swagger
 * /api/v1/services:
 *   post:
 *     summary: Create new service
 *     description: Membuat service baru (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequest'
 *     responses:
 *       201:
 *         description: Service created successfully
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
 *                   example: Service created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       403:
 *         description: Access forbidden (Admin only)
 *       422:
 *         description: Validation error
 */
router.post('/', protect, authorize('admin'), createServiceValidation, createNew);

/**
 * @swagger
 * /api/v1/services/{id}:
 *   patch:
 *     summary: Update service
 *     description: Update data service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateServiceRequest'
 *     responses:
 *       200:
 *         description: Service updated successfully
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
 *                   example: Service updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: Service not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', protect, authorize('admin'), resolveIdParam('services'), updateServiceValidation, updateData);

/**
 * @swagger
 * /api/v1/services/{id}:
 *   delete:
 *     summary: Delete service
 *     description: Hapus service (Admin only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *     responses:
 *       204:
 *         description: Service deleted successfully
 *       403:
 *         description: Access forbidden (Admin only)
 *       404:
 *         description: Service not found
 */
router.delete('/:id', protect, authorize('admin'), resolveIdParam('services'), removeData);

module.exports = router;
