/**
 * Income Recap Controller
 * SCR-15: Rekap Penghasilan (Admin only)
 *
 * Mengelola validasi input (period, date) dan mendelegasikan perhitungan
 * ke query layer.
 */

const {
  getIncomeRecap,
  parseDateLocal,
} = require('../queries/incomeRecapQueries');
const { successResponse, errorResponse } = require('../utils/response');

const VALID_PERIODS = ['week', 'month', 'year'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /stats/income-recap
 * Rekap penghasilan dengan filter periode & perbandingan growth.
 * Query: period ('week'|'month'|'year', default 'month'), date (YYYY-MM-DD).
 */
async function incomeRecap(req, res) {
  try {
    const period = req.query.period || 'month';
    const dateStr = req.query.date;

    // Validasi period
    if (!VALID_PERIODS.includes(period)) {
      return errorResponse(
        res,
        "Query 'period' must be one of: week, month, year",
        400
      );
    }

    // Validasi & parse date (default: hari ini)
    let refDate = new Date();
    if (dateStr) {
      if (!DATE_REGEX.test(dateStr)) {
        return errorResponse(
          res,
          "Query 'date' must be a valid YYYY-MM-DD date",
          400
        );
      }
      refDate = parseDateLocal(dateStr);
      if (isNaN(refDate.getTime())) {
        return errorResponse(res, "Query 'date' is not a valid date", 400);
      }
      // JS Date auto-rolls overflow (e.g. month 13, day 45, Feb 30) →
      // tolak dengan membandingkan komponen hasil parse terhadap input.
      const [y, m, d] = dateStr.split('-').map(Number);
      if (
        refDate.getFullYear() !== y ||
        refDate.getMonth() + 1 !== m ||
        refDate.getDate() !== d
      ) {
        return errorResponse(res, "Query 'date' is not a valid date", 400);
      }
    }

    const data = await getIncomeRecap(period, refDate);
    return successResponse(res, 'Income recap retrieved successfully', data);
  } catch (error) {
    console.error('Income recap error:', error);
    return errorResponse(res, 'Failed to retrieve income recap', 500);
  }
}

module.exports = {
  incomeRecap,
};
