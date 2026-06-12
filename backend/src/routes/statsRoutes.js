/**
 * Stats Routes
 * Routes untuk statistics endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { dashboard } = require('../controllers/statsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         today:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *               example: "2026-06-04"
 *             total_orders:
 *               type: integer
 *               example: 5
 *             total_revenue:
 *               type: number
 *               format: float
 *               example: 225000
 *         by_status:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: "pending"
 *               count:
 *                 type: integer
 *                 example: 2
 *         recent_orders:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               customer_name:
 *                 type: string
 *                 example: "Ahmad"
 *               status:
 *                 type: string
 *                 example: "pending"
 *               total_price:
 *                 type: number
 *                 format: float
 *                 example: 45000
 *               created_at:
 *                 type: string
 *                 format: date-time
 */

/**
 * @swagger
 * /api/v1/stats/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Mendapatkan statistik dashboard (pegawai hanya stats sendiri)
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                   example: Dashboard statistics retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 */
router.get('/dashboard', protect, dashboard);

module.exports = router;
