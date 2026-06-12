/**
 * Order Controller
 * CRUD logic untuk orders + status update + audit trail
 */

const { body, validationResult } = require('express-validator');
const { findAll, findDetail, create, update, updateStatus, updatePaymentStatus, remove, getAuditLogs } = require('../queries/orderQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');

const VALID_STATUSES = ['pending', 'dicuci', 'disetrika', 'siap', 'diambil', 'cancelled'];

/**
 * Validation rules
 */
const createOrderValidation = [
  body('customer_id')
    .isInt()
    .withMessage('Customer ID must be an integer'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.service_id')
    .isInt()
    .withMessage('Service ID must be an integer'),
  body('items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than 0')
];

const updateOrderValidation = [
  body('customer_id')
    .optional()
    .isInt()
    .withMessage('Customer ID must be an integer'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
];

const updateStatusValidation = [
  body('status')
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`)
];

/**
 * GET /orders
 * List semua orders dengan filters
 */
async function list(req, res) {
  try {
    const filters = {
      status: req.query.status,
      customer_id: req.query.customer_id ? parseInt(req.query.customer_id) : undefined
    };

    // Pegawai hanya bisa lihat order sendiri
    if (req.user.role === 'pegawai') {
      filters.user_id = req.user.id;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(filters, page, limit);

    return successResponse(res, 'Orders retrieved successfully', result.orders, 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List orders error:', error);
    return errorResponse(res, 'Failed to retrieve orders', 500);
  }
}

/**
 * GET /orders/:id
 * Detail order dengan items
 */
async function detail(req, res) {
  try {
    const { id } = req.params;
    const order = await findDetail(id);

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Pegawai hanya bisa lihat order sendiri
    if (req.user.role === 'pegawai' && order.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You can only view your own orders', 403);
    }

    // Get audit logs
    const auditLogs = await getAuditLogs(id);
    order.audit_logs = auditLogs;

    return successResponse(res, 'Order retrieved successfully', order);
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse(res, 'Failed to retrieve order', 500);
  }
}

/**
 * POST /orders
 * Buat order baru dengan items
 */
async function createNew(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  const connection = require('../config/database'); // For transaction

  try {
    const { customer_id, items, notes } = req.body;

    // Create order
    const orderId = await create({
      customer_id,
      user_id: req.user.id,
      items,
      notes
    });

    const order = await findDetail(orderId);

    return successResponse(res, 'Order created successfully', order, 201);
  } catch (error) {
    console.error('Create order error:', error);

    if (error.message && error.message.includes('not found or inactive')) {
      return errorResponse(res, error.message, 400);
    }

    return errorResponse(res, 'Failed to create order', 500);
  }
}

/**
 * PATCH /orders/:id
 * Update order (customer_id, notes)
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Check if order exists
    const order = await findDetail(id);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Pegawai hanya bisa update order sendiri
    if (req.user.role === 'pegawai' && order.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You can only update your own orders', 403);
    }

    // Update order
    await update(id, data);

    const updated = await findDetail(id);

    return successResponse(res, 'Order updated successfully', updated);
  } catch (error) {
    console.error('Update order error:', error);
    return errorResponse(res, 'Failed to update order', 500);
  }
}

/**
 * PATCH /orders/:id/status
 * Update status order dengan audit trail
 */
async function updateStatusHandler(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if order exists
    const order = await findDetail(id);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Pegawai hanya bisa update status order sendiri
    if (req.user.role === 'pegawai' && order.user_id !== req.user.id) {
      return errorResponse(res, 'Access forbidden: You can only update your own orders', 403);
    }

    // Validate status flow
    if (order.status === 'diambil' || order.status === 'cancelled') {
      return errorResponse(res, 'Cannot update status of completed/cancelled order', 400);
    }

    // Update status
    await updateStatus(id, status, req.user.id);

    const updated = await findDetail(id);

    return successResponse(res, 'Order status updated successfully', updated);
  } catch (error) {
    console.error('Update status error:', error);
    return errorResponse(res, 'Failed to update order status', 500);
  }
}

/**
 * DELETE /orders/:id
 * Hapus order (Admin only)
 */
async function removeData(req, res) {
  try {
    const { id } = req.params;

    // Check if order exists
    const order = await findDetail(id);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    await remove(id);

    return successResponse(res, 'Order deleted successfully', null, 204);
  } catch (error) {
    console.error('Delete order error:', error);
    return errorResponse(res, 'Failed to delete order', 500);
  }
}

module.exports = {
  list,
  detail,
  createNew,
  updateData,
  updateStatusHandler,
  removeData,
  createOrderValidation,
  updateOrderValidation,
  updateStatusValidation
};
