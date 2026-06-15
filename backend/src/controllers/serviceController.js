/**
 * Service Controller
 * CRUD logic untuk services (admin write, pegawai read)
 */

const { body, validationResult } = require('express-validator');
const { findAll, findById, create, update, remove } = require('../queries/serviceQueries');
const { successResponse, errorResponse, validationError } = require('../utils/response');
const { sanitizeService } = require('../utils/sanitize');

/**
 * Validation rules
 */
const createServiceValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('price')
    .isFloat({ gt: 0 })
    .withMessage('Price must be greater than 0'),
  body('unit')
    .notEmpty()
    .withMessage('Unit is required')
    .isIn(['kg', 'piece', 'meter', 'pair', 'item'])
    .withMessage('Invalid unit (kg, piece, meter, pair, item)'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
];

const updateServiceValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('price')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Price must be greater than 0'),
  body('unit')
    .optional()
    .notEmpty()
    .withMessage('Unit cannot be empty')
    .isIn(['kg', 'piece', 'meter', 'pair', 'item'])
    .withMessage('Invalid unit (kg, piece, meter, pair, item)'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
];

/**
 * GET /services
 * List semua services
 */
async function list(req, res) {
  try {
    const activeOnly = req.query.active_only === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await findAll(activeOnly, page, limit);

    return successResponse(res, 'Services retrieved successfully', result.services.map(sanitizeService), 200, {
      pagination: result.pagination
    });
  } catch (error) {
    console.error('List services error:', error);
    return errorResponse(res, 'Failed to retrieve services', 500);
  }
}

/**
 * GET /services/:id
 * Detail service
 */
async function detail(req, res) {
  try {
    const { id } = req.params;
    const service = await findById(id);

    if (!service) {
      return errorResponse(res, 'Service not found', 404);
    }

    return successResponse(res, 'Service retrieved successfully', sanitizeService(service));
  } catch (error) {
    console.error('Get service error:', error);
    return errorResponse(res, 'Failed to retrieve service', 500);
  }
}

/**
 * POST /services
 * Buat service baru (Admin only)
 */
async function createNew(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { name, price, unit, active } = req.body;

    // Create service
    const serviceId = await create({ name, price, unit, active });

    const service = await findById(serviceId);

    return successResponse(res, 'Service created successfully', sanitizeService(service), 201);
  } catch (error) {
    console.error('Create service error:', error);
    return errorResponse(res, 'Failed to create service', 500);
  }
}

/**
 * PATCH /services/:id
 * Update service (Admin only)
 */
async function updateData(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationError(res, errors.array());
  }

  try {
    const { id } = req.params;
    const data = { ...req.body };

    // Check if service exists
    const service = await findById(id);
    if (!service) {
      return errorResponse(res, 'Service not found', 404);
    }

    // Update service
    await update(id, data);

    const updated = await findById(id);

    return successResponse(res, 'Service updated successfully', sanitizeService(updated));
  } catch (error) {
    console.error('Update service error:', error);
    return errorResponse(res, 'Failed to update service', 500);
  }
}

/**
 * DELETE /services/:id
 * Hapus service (Admin only)
 */
async function removeData(req, res) {
  try {
    const { id } = req.params;

    // Check if service exists
    const service = await findById(id);
    if (!service) {
      return errorResponse(res, 'Service not found', 404);
    }

    await remove(id);

    return successResponse(res, 'Service deleted successfully', null, 204);
  } catch (error) {
    console.error('Delete service error:', error);
    return errorResponse(res, 'Failed to delete service', 500);
  }
}

module.exports = {
  list,
  detail,
  createNew,
  updateData,
  removeData,
  createServiceValidation,
  updateServiceValidation
};
