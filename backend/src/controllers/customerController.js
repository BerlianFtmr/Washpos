/**
 * Customer Controller
 * CRUD logic untuk customers
 */

const { body, validationResult } = require('express-validator');
const { findAll, findById, findByWhatsapp, create, update, remove } = require('../queries/customerQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');
const { sanitizeCustomer } = require('../utils/sanitize');
const pool = require('../config/database');

/**
 * Validation rules
 */
const createCustomerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('whatsapp')
    .notEmpty()
    .withMessage('WhatsApp is required')
    .matches(/^628[0-9]{8,11}$/)
    .withMessage('Invalid WhatsApp format (use 628xxxxxxxxxx)')
];

const updateCustomerValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('whatsapp')
    .optional()
    .notEmpty()
    .withMessage('WhatsApp cannot be empty')
    .matches(/^628[0-9]{8,11}$/)
    .withMessage('Invalid WhatsApp format (use 628xxxxxxxxxx)')
];

/**
 * GET /customers
 * List semua customers dengan search
 */
async function list(req, res) {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(search, page, limit);

    return successResponse(res, 'Customers retrieved successfully', result.customers.map(sanitizeCustomer), 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List customers error:', error);
    return errorResponse(res, 'Failed to retrieve customers', 500);
  }
}

/**
 * GET /customers/:id
 * Detail customer
 */
async function detail(req, res) {
  try {
    const { id } = req.params;
    const customer = await findById(id);

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, 'Customer retrieved successfully', sanitizeCustomer(customer));
  } catch (error) {
    console.error('Get customer error:', error);
    return errorResponse(res, 'Failed to retrieve customer', 500);
  }
}

/**
 * POST /customers
 * Buat customer baru
 */
async function createNew(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { name, whatsapp, address } = req.body;

    // Check if whatsapp already exists
    const existing = await findByWhatsapp(whatsapp);
    if (existing) {
      return errorResponse(res, 'WhatsApp number already registered', 400);
    }

    // Create customer
    const customerId = await create({ name, whatsapp, address });

    const customer = await findById(customerId);

    return successResponse(res, 'Customer created successfully', sanitizeCustomer(customer), 201);
  } catch (error) {
    console.error('Create customer error:', error);
    return errorResponse(res, 'Failed to create customer', 500);
  }
}

/**
 * PATCH /customers/:id
 * Update customer
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Check if customer exists
    const customer = await findById(id);
    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // If updating whatsapp, check if already exists
    if (data.whatsapp && data.whatsapp !== customer.whatsapp) {
      const existing = await findByWhatsapp(data.whatsapp);
      if (existing) {
        return errorResponse(res, 'WhatsApp number already registered', 400);
      }
    }

    // Update customer
    await update(id, data);

    const updated = await findById(id);

    return successResponse(res, 'Customer updated successfully', sanitizeCustomer(updated));
  } catch (error) {
    console.error('Update customer error:', error);
    return errorResponse(res, 'Failed to update customer', 500);
  }
}

/**
 * DELETE /customers/:id
 * Hapus customer
 */
async function removeData(req, res) {
  try {
    const { id } = req.params;

    // Check if customer exists
    const customer = await findById(id);
    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Cek apakah customer punya orders
    const [orders] = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE customer_id = ?',
      [id]
    );

    if (orders[0].count > 0) {
      return errorResponse(
        res,
        'Cannot delete customer: has existing orders',
        400
      );
    }

    // Hapus customer
    const deleted = await remove(id);

    if (!deleted) {
      return errorResponse(res, 'Failed to delete customer', 500);
    }

    return successResponse(res, 'Customer deleted successfully', null, 200);
  } catch (error) {
    console.error('Delete customer error:', error);

    // Handle foreign key constraint error
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return errorResponse(
        res,
        'Cannot delete customer: has existing orders',
        400
      );
    }

    return errorResponse(res, 'Failed to delete customer', 500);
  }
}

module.exports = {
  list,
  detail,
  createNew,
  updateData,
  removeData,
  createCustomerValidation,
  updateCustomerValidation
};
