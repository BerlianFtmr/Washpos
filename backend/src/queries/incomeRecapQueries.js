/**
 * Income Recap SQL Queries
 * Query functions untuk SCR-15: Rekap Penghasilan (Admin only)
 *
 * Sumber data:
 *   - Pendapatan Diterima → dari tabel `payments.amount`
 *   - Nilai Order         → dari tabel `orders.total_price` (exclude cancelled)
 *
 * Range tanggal dihitung di Node.js (bukan MySQL WEEK()) dengan exclusive end:
 *   created_at >= start AND created_at < end  (sargable, index-friendly)
 */

const pool = require('../config/database');

// Indonesian short month names (deterministic — tidak bergantung locale server)
const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

// ─── Date Helpers ─────────────────────────────────────────────────

/**
 * Parse 'YYYY-MM-DD' sebagai LOCAL date (bukan UTC) supaya
 * getDate()/getMonth() tidak off-by-one.
 */
function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date ke 'YYYY-MM-DD' menggunakan komponen local time. */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Range Mingguan (Senin–Minggu, end exclusive = Senin berikutnya). */
function getWeekRange(refDate) {
  const date = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const day = date.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Range Bulanan (end exclusive = hari pertama bulan berikutnya). */
function getMonthRange(refDate) {
  return {
    start: new Date(refDate.getFullYear(), refDate.getMonth(), 1),
    end: new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1),
  };
}

/** Range Tahunan (end exclusive = 1 Jan tahun berikutnya). */
function getYearRange(refDate) {
  return {
    start: new Date(refDate.getFullYear(), 0, 1),
    end: new Date(refDate.getFullYear() + 1, 0, 1),
  };
}

/** Hitung range periode saat ini berdasarkan tipe. */
function getCurrentRange(period, refDate) {
  if (period === 'week') return getWeekRange(refDate);
  if (period === 'year') return getYearRange(refDate);
  return getMonthRange(refDate);
}

/**
 * Hitung range periode sebelumnya.
 * previous_end selalu sama dengan current_start (exclusive).
 */
function getPreviousRange(period, currentRange) {
  if (period === 'week') {
    const start = new Date(currentRange.start);
    start.setDate(start.getDate() - 7);
    return { start, end: new Date(currentRange.start) };
  }
  if (period === 'year') {
    const start = new Date(currentRange.start);
    start.setFullYear(start.getFullYear() - 1);
    return { start, end: new Date(currentRange.start) };
  }
  // month
  const start = new Date(currentRange.start);
  start.setMonth(start.getMonth() - 1);
  return { start, end: new Date(currentRange.start) };
}

// ─── Aggregation Queries ──────────────────────────────────────────

/**
 * Total payments (pendapatan diterima) & jumlah transaksi pada range.
 */
async function getPaymentTotals(start, end) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_amount,
       COUNT(*) AS transaction_count
     FROM payments
     WHERE created_at >= ? AND created_at < ?`,
    [formatDate(start), formatDate(end)]
  );
  return {
    totalAmount: Number(rows[0].total_amount),
    transactionCount: Number(rows[0].transaction_count),
  };
}

/**
 * Total nilai order (exclude cancelled) & jumlah order pada range.
 */
async function getOrderTotals(start, end) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(total_price), 0) AS total_value,
       COUNT(*) AS order_count
     FROM orders
     WHERE status != 'cancelled'
       AND created_at >= ? AND created_at < ?`,
    [formatDate(start), formatDate(end)]
  );
  return {
    totalValue: Number(rows[0].total_value),
    orderCount: Number(rows[0].order_count),
  };
}

/**
 * Normalisasi bucket_date hasil SQL → key 'YYYY-MM-DD'.
 * DATE() mengembalikan Date object (mysql2), DATE_FORMAT mengembalikan string.
 */
function normalizeBucketKey(bucketDate) {
  if (bucketDate instanceof Date) {
    return formatDate(bucketDate);
  }
  // string 'YYYY-MM-DD HH:MM:SS' atau 'YYYY-MM-01' → potong ke 'YYYY-MM-DD'
  return String(bucketDate).slice(0, 10);
}

/**
 * Breakdown payments per bucket (day atau month).
 * Mengembalikan Map { 'YYYY-MM-DD': { revenue, transactions } }.
 */
async function getPaymentBreakdown(start, end, granularity) {
  const bucketExpr =
    granularity === 'month'
      ? "DATE_FORMAT(created_at, '%Y-%m-01')"
      : 'DATE(created_at)';

  const [rows] = await pool.query(
    `SELECT
       ${bucketExpr} AS bucket_date,
       COALESCE(SUM(amount), 0) AS total_amount,
       COUNT(*) AS transaction_count
     FROM payments
     WHERE created_at >= ? AND created_at < ?
     GROUP BY bucket_date`,
    [formatDate(start), formatDate(end)]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(normalizeBucketKey(row.bucket_date), {
      revenue: Number(row.total_amount),
      transactions: Number(row.transaction_count),
    });
  }
  return map;
}

/**
 * Breakdown orders per bucket (exclude cancelled).
 * Mengembalikan Map { 'YYYY-MM-DD': { orderValue, orders } }.
 */
async function getOrderBreakdown(start, end, granularity) {
  const bucketExpr =
    granularity === 'month'
      ? "DATE_FORMAT(created_at, '%Y-%m-01')"
      : 'DATE(created_at)';

  const [rows] = await pool.query(
    `SELECT
       ${bucketExpr} AS bucket_date,
       COALESCE(SUM(total_price), 0) AS total_value,
       COUNT(*) AS order_count
     FROM orders
     WHERE status != 'cancelled'
       AND created_at >= ? AND created_at < ?
     GROUP BY bucket_date`,
    [formatDate(start), formatDate(end)]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(normalizeBucketKey(row.bucket_date), {
      orderValue: Number(row.total_value),
      orders: Number(row.order_count),
    });
  }
  return map;
}

// ─── Bucket Generation & Merge ────────────────────────────────────

/** Generate seluruh bucket pada range (termasuk yang kosong = 0). */
function generateBuckets(start, end, granularity) {
  const buckets = [];
  if (granularity === 'month') {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur < end) {
      buckets.push(new Date(cur.getFullYear(), cur.getMonth(), 1));
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cur < end) {
      buckets.push(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return buckets;
}

/** Label tampilan untuk bucket. */
function bucketLabel(date, granularity) {
  if (granularity === 'month') {
    return MONTHS_ID[date.getMonth()];
  }
  const d = String(date.getDate()).padStart(2, '0');
  return `${d} ${MONTHS_ID[date.getMonth()]}`;
}

// ─── Growth Helper ────────────────────────────────────────────────

/**
 * Growth percentage: null saat previous = 0 (hindari division by zero).
 * Dibulatkan ke 2 desimal. Frontend render "N/A" untuk null.
 */
function growthPct(current, previous) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

// ─── Main Entry ───────────────────────────────────────────────────

/**
 * Get full income recap untuk periode tertentu.
 * @param {'week'|'month'|'year'} period
 * @param {Date} refDate - tanggal referensi (default: hari ini)
 * @returns {Promise<object>} recap data untuk response API
 */
async function getIncomeRecap(period, refDate = new Date()) {
  const granularity = period === 'year' ? 'month' : 'day';

  const currentRange = getCurrentRange(period, refDate);
  const previousRange = getPreviousRange(period, currentRange);

  // Jalankan 6 query secara paralel
  const [
    payCurrent,
    payPrevious,
    orderCurrent,
    orderPrevious,
    payBreakdownMap,
    orderBreakdownMap,
  ] = await Promise.all([
    getPaymentTotals(currentRange.start, currentRange.end),
    getPaymentTotals(previousRange.start, previousRange.end),
    getOrderTotals(currentRange.start, currentRange.end),
    getOrderTotals(previousRange.start, previousRange.end),
    getPaymentBreakdown(currentRange.start, currentRange.end, granularity),
    getOrderBreakdown(currentRange.start, currentRange.end, granularity),
  ]);

  // Rata-rata
  const avgPerTransaction = payCurrent.transactionCount > 0
    ? Math.round(payCurrent.totalAmount / payCurrent.transactionCount)
    : 0;
  const avgPerOrder = orderCurrent.orderCount > 0
    ? Math.round(orderCurrent.totalValue / orderCurrent.orderCount)
    : 0;

  // Breakdown: merge payment + order maps, isi semua bucket (termasuk kosong)
  const buckets = generateBuckets(currentRange.start, currentRange.end, granularity);
  const breakdown = buckets.map((date) => {
    const key = formatDate(date);
    const pay = payBreakdownMap.get(key) ?? { revenue: 0, transactions: 0 };
    const ord = orderBreakdownMap.get(key) ?? { orderValue: 0, orders: 0 };
    return {
      label: bucketLabel(date, granularity),
      date: key,
      revenue: pay.revenue,
      transactions: pay.transactions,
      order_value: ord.orderValue,
      orders: ord.orders,
    };
  });

  return {
    period,
    granularity,
    current: {
      start_date: formatDate(currentRange.start),
      end_date: formatDate(currentRange.end),
    },
    previous: {
      start_date: formatDate(previousRange.start),
      end_date: formatDate(previousRange.end),
    },
    summary: {
      revenue: {
        current: payCurrent.totalAmount,
        previous: payPrevious.totalAmount,
        growth_pct: growthPct(payCurrent.totalAmount, payPrevious.totalAmount),
      },
      order_value: {
        current: orderCurrent.totalValue,
        previous: orderPrevious.totalValue,
        growth_pct: growthPct(orderCurrent.totalValue, orderPrevious.totalValue),
      },
      transactions: {
        current: payCurrent.transactionCount,
        previous: payPrevious.transactionCount,
        growth_pct: growthPct(payCurrent.transactionCount, payPrevious.transactionCount),
      },
      orders: {
        current: orderCurrent.orderCount,
        previous: orderPrevious.orderCount,
        growth_pct: growthPct(orderCurrent.orderCount, orderPrevious.orderCount),
      },
      avg_per_transaction: avgPerTransaction,
      avg_per_order: avgPerOrder,
    },
    breakdown,
  };
}

module.exports = {
  getIncomeRecap,
  // exported untuk unit-test bila diperlukan
  parseDateLocal,
  getWeekRange,
  getMonthRange,
  getYearRange,
  growthPct,
};
