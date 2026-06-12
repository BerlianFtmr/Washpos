/**
 * Stats Controller
 * Dashboard statistics logic
 */

const { getDashboard } = require('../queries/statsQueries');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /stats/dashboard
 * Dashboard statistics (pegawai hanya stats sendiri)
 */
async function dashboard(req, res) {
  try {
    const stats = await getDashboard(req.user.id, req.user.role);

    return successResponse(res, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return errorResponse(res, 'Failed to retrieve dashboard statistics', 500);
  }
}

module.exports = {
  dashboard
};
