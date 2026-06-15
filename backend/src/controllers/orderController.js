/**
 * Order Controller
 * CRUD logic untuk orders + status update + audit trail
 *
 * FASE 4: payload & filter HANYA menerima entity code (customer_code,
 * service_code). Legacy `*_id` ditolak. Response publik di-sanitize: field
 * internal `id`/`customer_id`/`user_id` dihapus (lihat utils/sanitize.js).
 */

const { body, validationResult } = require('express-validator');
const { findAll, findDetail, create, update, updateStatus, updatePaymentStatus, remove, getAuditLogs } = require('../queries/orderQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');
const { resolveCodeToId } = require('../utils/codeResolver');
const { isEntityCode } = require('../validators/codeValidator');
const { sanitizeOrder, sanitizeOrderRow } = require('../utils/sanitize');

const VALID_STATUSES = ['pending', 'dicuci', 'disetrika', 'siap', 'diambil', 'cancelled'];

/**
 * Validation rules (FASE 4 — code-only)
 *
 * Create/update order wajib menerima referensi entity sebagai code:
 *   - customer_code (CUS-XXXXXX)
 *   - items[].service_code (SVC-NN)
 * Field `customer_id` / `items[].service_id` (legacy) ditolak eksplisit.
 */
const createOrderValidation = [
  body('customer_id')
    .optional()
    .custom(() => {
      throw new Error('customer_id is no longer supported; use customer_code (e.g. CUS-4F8KP2)');
    }),
  body('customer_code')
    .custom((v) => isEntityCode('CUS', v))
    .withMessage('customer_code is required and must be a valid CUS code (e.g. CUS-4F8KP2)'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.service_id')
    .optional()
    .custom(() => {
      throw new Error('service_id is no longer supported; use service_code (e.g. SVC-01)');
    }),
  body('items.*.service_code')
    .custom((v) => isEntityCode('SVC', v))
    .withMessage('service_code is required and must be a valid SVC code (e.g. SVC-01)'),
  body('items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than 0')
];

const updateOrderValidation = [
  body('customer_id')
    .optional()
    .custom(() => {
      throw new Error('customer_id is no longer supported; use customer_code');
    }),
  body('customer_code')
    .optional()
    .custom((v) => isEntityCode('CUS', v))
    .withMessage('customer_code must be a valid CUS code'),
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
 * Resolve reference entity code ke INT id internal.
 *
 * @param {*} codeLike - nilai field *_code (code string)
 * @param {string} table - 'customers' | 'services' | ...
 * @param {string} label - label utk pesan error
 * @returns {Promise<{id: number|null, error: string|null}>}
 */
async function resolveEntityCode(codeLike, table, label) {
  if (codeLike === undefined || codeLike === null || codeLike === '') {
    return { id: null, error: `${label} code is required` };
  }
  const id = await resolveCodeToId(table, codeLike);
  if (id == null) {
    return { id: null, error: `${label} with code '${String(codeLike).toUpperCase()}' not found` };
  }
  return { id, error: null };
}

/**
 * GET /orders
 * List semua orders dengan filters. Support customer_code (di-resolve ke id).
 */
async function list(req, res) {
  try {
    const filters = {
      status: req.query.status
    };

    // Customer filter: customer_code (resolve ke id internal)
    if (req.query.customer_code) {
      const cid = await resolveCodeToId('customers', req.query.customer_code);
      if (cid != null) filters.customer_id = cid;
    }

    // Pegawai hanya bisa lihat order sendiri
    if (req.user.role === 'pegawai') {
      filters.user_id = req.user.id;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(filters, page, limit);

    return successResponse(res, 'Orders retrieved successfully', result.orders.map(sanitizeOrderRow), 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List orders error:', error);
    return errorResponse(res, 'Failed to retrieve orders', 500);
  }
}

/**
 * GET /orders/:id
 * Detail order dengan items. `req.params.id` sudah di-resolve oleh middleware
 * resolveIdParam (code → int). Pegawai isolation pakai user_id internal
 * (sebelum di-sanitize dari response).
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

    return successResponse(res, 'Order retrieved successfully', sanitizeOrder(order));
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse(res, 'Failed to retrieve order', 500);
  }
}

/**
 * POST /orders
 * Buat order baru. Resolve customer_code / service_code ke id sebelum insert.
 */
async function createNew(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { items, notes } = req.body;

    // Resolve customer reference
    const cust = await resolveEntityCode(req.body.customer_code, 'customers', 'Customer');
    if (cust.error) {
      return errorResponse(res, cust.error, 404);
    }

    // Resolve setiap item service reference
    const resolvedItems = [];
    for (const [i, item] of items.entries()) {
      const svc = await resolveEntityCode(item.service_code, 'services', `Service (item ${i + 1})`);
      if (svc.error) {
        return errorResponse(res, svc.error, 404);
      }
      resolvedItems.push({ service_id: svc.id, quantity: item.quantity });
    }

    // Create order (auto-generate ORD-YYMMDD-XXXXXX)
    const orderId = await create({
      customer_id: cust.id,
      user_id: req.user.id,
      items: resolvedItems,
      notes
    });

    const order = await findDetail(orderId);

    return successResponse(res, 'Order created successfully', sanitizeOrder(order), 201);
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
 * Update order (customer_code, notes).
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = {};

    // Resolve customer reference bila ada
    if (req.body.customer_code !== undefined) {
      const cust = await resolveEntityCode(req.body.customer_code, 'customers', 'Customer');
      if (cust.error) {
        return errorResponse(res, cust.error, 404);
      }
      data.customer_id = cust.id;
    }

    if (req.body.notes !== undefined) {
      data.notes = req.body.notes;
    }

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

    return successResponse(res, 'Order updated successfully', sanitizeOrder(updated));
  } catch (error) {
    console.error('Update order error:', error);
    return errorResponse(res, 'Failed to update order', 500);
  }
}

/**
 * PATCH /orders/:id/status
 * Update status order dengan audit trail.
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

    return successResponse(res, 'Order status updated successfully', sanitizeOrder(updated));
  } catch (error) {
    console.error('Update status error:', error);
    return errorResponse(res, 'Failed to update order status', 500);
  }
}

/**
 * DELETE /orders/:id
 * Hapus order (Admin only).
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
