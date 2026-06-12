/**
 * Routes Aggregation
 * Mount semua route modules ke Express app
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const customerRoutes = require('./customerRoutes');
const orderRoutes = require('./orderRoutes');
const serviceRoutes = require('./serviceRoutes');
const paymentRoutes = require('./paymentRoutes');
const statsRoutes = require('./statsRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/services', serviceRoutes);
router.use('/payments', paymentRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
