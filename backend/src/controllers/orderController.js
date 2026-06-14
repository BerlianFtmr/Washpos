/**
 * Order Controller
 * CRUD logic untuk orders + status update + audit trail
 *
 * FASE 2: payload & filter menerima entity code (customer_code, service_code,
 * order_code) SELAIN legacy id (customer_id, service_id, order_id). Response
 * otomatis menyertakan field `code` via query layer.
 */

const { body, validationResult } = require('express-validator');
const { findAll, findDetail, create, update, updateStatus, updatePaymentStatus, remove, getAuditLogs } = require('../queries/orderQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');
const { resolveCodeToId, isCode } = require('../utils/codeResolver');
const { isEntityCode, isPositiveInt } = require('../validators/codeValidator');

const VALID_STATUSES = ['pending', 'dicuci', 'disetrika', 'siap', 'diambil', 'cancelled'];

/**
 * Validation rules
 *
 * Create/update order menerima referensi entity dalam dua bentuk:
 *   - Legacy: customer_id (int), items[].service_id (int)
 *   - Code   : customer_code (CUS-XXXXXX), items[].service_code (SVC-NN)
 * Field *_id juga boleh berisi code string (flexible).
 */
const createOrderValidation = [
  body('customer_id')
    .optional()
    .custom((v) => isPositiveInt(v) || isEntityCode('CUS', v))
    .withMessage('customer_id must be a positive integer or a valid CUS code'),
  body('customer_code')
    .optional()
    .custom((v) => isEntityCode('CUS', v))
    .withMessage('customer_code must be a valid CUS code (e.g. CUS-4F8KP2)'),
  body().custom((body) => {
    if (body.customer_id === undefined && body.customer_code === undefined) {
      throw new Error('Either customer_id or customer_code is required');
    }
    return true;
  }),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.service_id')
    .optional()
    .custom((v) => isPositiveInt(v) || isEntityCode('SVC', v))
    .withMessage('service_id must be a positive integer or a valid SVC code'),
  body('items.*.service_code')
    .optional()
    .custom((v) => isEntityCode('SVC', v))
    .withMessage('service_code must be a valid SVC code (e.g. SVC-01)'),
  body('items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than 0'),
  body('items.*').custom((item) => {
    if (item.service_id === undefined && item.service_code === undefined) {
      throw new Error('Each item requires service_id or service_code');
    }
    return true;
  })
];

const updateOrderValidation = [
  body('customer_id')
    .optional()
    .custom((v) => isPositiveInt(v) || isEntityCode('CUS', v))
    .withMessage('customer_id must be a positive integer or a valid CUS code'),
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
 * Resolve reference entity (customer/service) ke INT id.
 * Menerima: number (pass-through), code string di `value`, atau code di `codeField`.
 *
 * @param {*} idLike - nilai field *_id (bisa int, code string, atau undefined)
 * @param {*} codeLike - nilai field *_code (bisa code string atau undefined)
 * @param {string} prefix - 'CUS' | 'SVC' | ...
 * @param {string} table - 'customers' | 'services' | ...
 * @param {string} label - label utk pesan error
 * @returns {Promise<{id: number|null, error: string|null}>}
 */
async function resolveEntityRef(idLike, codeLike, prefix, table, label) {
  if (codeLike !== undefined && codeLike !== null && codeLike !== '') {
    const id = await resolveCodeToId(table, codeLike);
    if (id == null) {
      return { id: null, error: `${label} with code '${String(codeLike).toUpperCase()}' not found` };
    }
    return { id, error: null };
  }
  if (idLike !== undefined && idLike !== null) {
    if (isCode(String(idLike))) {
      const id = await resolveCodeToId(table, String(idLike));
      if (id == null) {
        return { id: null, error: `${label} with code '${String(idLike).toUpperCase()}' not found` };
      }
      return { id, error: null };
    }
    // numeric
    return { id: Number(idLike), error: null };
  }
  return { id: null, error: `${label} reference is required` };
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

    // Customer filter: customer_code (resolve) atau customer_id (legacy)
    if (req.query.customer_code) {
      const cid = await resolveCodeToId('customers', req.query.customer_code);
      if (cid != null) filters.customer_id = cid;
    } else if (req.query.customer_id) {
      filters.customer_id = parseInt(req.query.customer_id);
    }

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
 * Detail order dengan items. `req.params.id` sudah di-resolve oleh middleware
 * resolveIdParam (bisa int dari code ATAU legacy numeric).
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
    const cust = await resolveEntityRef(
      req.body.customer_id,
      req.body.customer_code,
      'CUS', 'customers', 'Customer'
    );
    if (cust.error) {
      return errorResponse(res, cust.error, 404);
    }

    // Resolve setiap item service reference
    const resolvedItems = [];
    for (const [i, item] of items.entries()) {
      const svc = await resolveEntityRef(
        item.service_id,
        item.service_code,
        'SVC', 'services', `Service (item ${i + 1})`
      );
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
 * Update order (customer_id/customer_code, notes).
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
    if (req.body.customer_id !== undefined || req.body.customer_code !== undefined) {
      const cust = await resolveEntityRef(
        req.body.customer_id,
        req.body.customer_code,
        'CUS', 'customers', 'Customer'
      );
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

    return successResponse(res, 'Order updated successfully', updated);
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

    return successResponse(res, 'Order status updated successfully', updated);
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
