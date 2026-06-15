/**
 * Stats Routes
 * Routes untuk statistics endpoints
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { dashboard } = require('../controllers/statsController');
const { incomeRecap } = require('../controllers/incomeRecapController');

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
 *               code:
 *                 type: string
 *                 example: "ORD-260615-AB12CD"
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

/**
 * @swagger
 * components:
 *   schemas:
 *     IncomeRecapMetric:
 *       type: object
 *       properties:
 *         current:
 *           type: number
 *           example: 2500000
 *         previous:
 *           type: number
 *           example: 2100000
 *         growth_pct:
 *           type: number
 *           nullable: true
 *           description: Null saat previous = 0 (frontend render "N/A")
 *           example: 19.05
 *     IncomeRecapBreakdownRow:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           example: "01 Jun"
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-06-01"
 *         revenue:
 *           type: number
 *           example: 150000
 *         transactions:
 *           type: integer
 *           example: 2
 *         order_value:
 *           type: number
 *           example: 160000
 *         orders:
 *           type: integer
 *           example: 2
 *     IncomeRecap:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           enum: [week, month, year]
 *           example: "month"
 *         granularity:
 *           type: string
 *           enum: [day, month]
 *           example: "day"
 *         current:
 *           type: object
 *           properties:
 *             start_date:
 *               type: string
 *               format: date
 *               example: "2026-06-01"
 *             end_date:
 *               type: string
 *               format: date
 *               description: Exclusive end (hari pertama periode berikutnya)
 *               example: "2026-07-01"
 *         previous:
 *           type: object
 *           properties:
 *             start_date:
 *               type: string
 *               format: date
 *               example: "2026-05-01"
 *             end_date:
 *               type: string
 *               format: date
 *               example: "2026-06-01"
 *         summary:
 *           type: object
 *           properties:
 *             revenue:
 *               $ref: '#/components/schemas/IncomeRecapMetric'
 *             order_value:
 *               $ref: '#/components/schemas/IncomeRecapMetric'
 *             transactions:
 *               $ref: '#/components/schemas/IncomeRecapMetric'
 *             orders:
 *               $ref: '#/components/schemas/IncomeRecapMetric'
 *             avg_per_transaction:
 *               type: number
 *               example: 71428
 *             avg_per_order:
 *               type: number
 *               example: 67500
 *         breakdown:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/IncomeRecapBreakdownRow'
 */

/**
 * @swagger
 * /api/v1/stats/income-recap:
 *   get:
 *     summary: Get income recap (Admin only)
 *     description: |
 *       Rekap penghasilan laundry dengan filter Mingguan/Bulanan/Tahunan
 *       dan perbandingan periode sebelumnya (growth %).
 *       Sumber data: payments.amount (Pendapatan Diterima) +
 *       orders.total_price exclude cancelled (Nilai Order).
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal referensi (YYYY-MM-DD). Default hari ini.
 *     responses:
 *       200:
 *         description: Income recap retrieved successfully
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
 *                   example: Income recap retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/IncomeRecap'
 *       400:
 *         description: Invalid period or date query parameter
 *       401:
 *         description: No token provided / invalid token
 *       403:
 *         description: Access forbidden — admin only
 */
router.get('/income-recap', protect, authorize('admin'), incomeRecap);

module.exports = router;
