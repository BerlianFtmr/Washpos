/**
 * Stats SQL Queries
 * Query functions untuk dashboard statistics
 */

const pool = require('../config/database');

/**
 * Get dashboard statistics
 * @param {number} userId - User ID (optional, for pegawai filter)
 * @param {string} userRole - User role (admin/pegawai)
 */
async function getDashboard(userId = null, userRole = 'admin') {
  const today = new Date().toISOString().split('T')[0];

  // Base query filters
  const userFilter = userRole === 'pegawai' ? 'AND o.user_id = ?' : '';
  const userParam = userRole === 'pegawai' ? [userId] : [];

  // Today's stats
  const [todayStats] = await pool.query(`
    SELECT
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(o.total_price), 0) as total_revenue
    FROM orders o
    WHERE DATE(o.created_at) = ?
      ${userFilter}
  `, [today, ...userParam]);

  // Orders by status
  const [byStatus] = await pool.query(`
    SELECT
      o.status,
      COUNT(*) as count
    FROM orders o
    WHERE 1=1
      ${userFilter}
    GROUP BY o.status
    ORDER BY
      FIELD(o.status, 'pending', 'dicuci', 'disetrika', 'siap', 'diambil', 'cancelled')
  `, userParam);

  // Recent orders (last 5) — FASE 4: expose `code`, not internal `id`
  const [recentOrders] = await pool.query(`
    SELECT
      o.code,
      c.name as customer_name,
      o.status,
      o.total_price,
      o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
      ${userFilter}
    ORDER BY o.created_at DESC
    LIMIT 5
  `, userParam);

  return {
    today: {
      date: today,
      total_orders: todayStats[0].total_orders,
      total_revenue: parseFloat(todayStats[0].total_revenue)
    },
    by_status: byStatus.map(row => ({
      status: row.status,
      count: row.count
    })),
    recent_orders: recentOrders
  };
}

module.exports = {
  getDashboard
};
