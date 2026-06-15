/**
 * Payment Controller
 * CRUD logic untuk payments dengan auto-update payment_status order
 */

const { body, validationResult } = require('express-validator');
const { findAll, findById, getOrderForPayment, getTotalPaymentsForOrder, create, update, remove } = require('../queries/paymentQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');
const { resolveCodeToId } = require('../utils/codeResolver');
const { sanitizePayment } = require('../utils/sanitize');

const VALID_METHODS = ['cash', 'transfer', 'ewallet'];

/**
 * Validation rules
 */
const createPaymentValidation = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0'),
  body('method')
    .isIn(VALID_METHODS)
    .withMessage(`Method must be one of: ${VALID_METHODS.join(', ')}`)
];

const updatePaymentValidation = [
  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0'),
  body('method')
    .optional()
    .isIn(VALID_METHODS)
    .withMessage(`Method must be one of: ${VALID_METHODS.join(', ')}`)
];

/**
 * GET /payments
 * List semua payments dengan filters
 */
async function list(req, res) {
  try {
    const filters = {};

    // Filter by order: order_code (resolve ke id internal)
    if (req.query.order_code) {
      const oid = await resolveCodeToId('orders', req.query.order_code);
      if (oid != null) filters.order_id = oid;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(filters, page, limit);

    return successResponse(res, 'Payments retrieved successfully', result.payments.map(sanitizePayment), 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List payments error:', error);
    return errorResponse(res, 'Failed to retrieve payments', 500);
  }
}

/**
 * GET /payments/:id
 * Detail payment
 */
async function detail(req, res) {
  try {
    const { id } = req.params;
    const payment = await findById(id);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    return successResponse(res, 'Payment retrieved successfully', sanitizePayment(payment));
  } catch (error) {
    console.error('Get payment error:', error);
    return errorResponse(res, 'Failed to retrieve payment', 500);
  }
}

/**
 * POST /orders/:id/payments
 * Buat payment untuk order dengan auto-update payment_status
 */
async function createForOrder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id: orderId } = req.params;
    const { amount, method, note } = req.body;

    // Check if order exists
    const order = await getOrderForPayment(orderId);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Create payment (transaction with auto-update payment_status)
    const result = await create({
      order_id: orderId,
      amount,
      method,
      note
    });

    const payment = await findById(result.paymentId);

    return successResponse(res, 'Payment created successfully', sanitizePayment({
      ...payment,
      order_payment_status: result.newPaymentStatus
    }), 201);
  } catch (error) {
    console.error('Create payment error:', error);

    if (error.message === 'Order not found') {
      return errorResponse(res, 'Order not found', 404);
    }

    return errorResponse(res, 'Failed to create payment', 500);
  }
}

/**
 * PATCH /payments/:id
 * Update payment (Admin only)
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Check if payment exists
    const payment = await findById(id);
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    // Update payment
    await update(id, data);

    const updated = await findById(id);

    return successResponse(res, 'Payment updated successfully', sanitizePayment(updated));
  } catch (error) {
    console.error('Update payment error:', error);
    return errorResponse(res, 'Failed to update payment', 500);
  }
}

/**
 * DELETE /payments/:id
 * Hapus payment (Admin only)
 */
async function removeData(req, res) {
  try {
    const { id } = req.params;

    // Check if payment exists
    const payment = await findById(id);
    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    await remove(id);

    return successResponse(res, 'Payment deleted successfully', null, 204);
  } catch (error) {
    console.error('Delete payment error:', error);
    return errorResponse(res, 'Failed to delete payment', 500);
  }
}

module.exports = {
  list,
  detail,
  createForOrder,
  updateData,
  removeData,
  createPaymentValidation,
  updatePaymentValidation
};
