import { api } from '@/lib/api';
import type {
  DashboardStats,
  OrderStatus,
  IncomeRecap,
  RecapMetric,
  RecapPeriod,
} from '@/types';

interface ApiDashboardResponse {
  today: {
    date: string;
    total_orders: number;
    total_revenue: number;
  };
  by_status: Array<{ status: string; count: number }>;
  recent_orders: Array<Record<string, unknown>>;
}

interface ApiRecapMetric {
  current: number;
  previous: number;
  growth_pct: number | null;
}

interface ApiIncomeRecapResponse {
  period: RecapPeriod;
  granularity: 'day' | 'month';
  current: { start_date: string; end_date: string };
  previous: { start_date: string; end_date: string };
  summary: {
    revenue: ApiRecapMetric;
    order_value: ApiRecapMetric;
    transactions: ApiRecapMetric;
    orders: ApiRecapMetric;
    avg_per_transaction: number;
    avg_per_order: number;
  };
  breakdown: Array<{
    label: string;
    date: string;
    revenue: number;
    transactions: number;
    order_value: number;
    orders: number;
  }>;
}

function mapMetric(m: ApiRecapMetric): RecapMetric {
  return { current: m.current, previous: m.previous, growthPct: m.growth_pct };
}

export const statsService = {
  getDashboard(): Promise<DashboardStats> {
    return api.get<ApiDashboardResponse>('/stats/dashboard').then((raw) => ({
      totalOrdersToday: raw.today.total_orders,
      totalRevenueToday: raw.today.total_revenue,
      activeOrders: raw.by_status
        .filter((s) => !['diambil', 'cancelled'].includes(s.status))
        .reduce((sum, s) => sum + s.count, 0),
      readyForPickup: raw.by_status.find((s) => s.status === 'siap')?.count ?? 0,
      statusDistribution: raw.by_status.map((s) => ({
        status: s.status as OrderStatus,
        count: s.count,
      })),
      recentOrders: (raw.recent_orders ?? []) as unknown as DashboardStats['recentOrders'],
    }));
  },

  getIncomeRecap(params?: {
    period?: RecapPeriod;
    date?: string;
  }): Promise<IncomeRecap> {
    return api
      .get<ApiIncomeRecapResponse>('/stats/income-recap', params)
      .then((raw) => ({
        period: raw.period,
        granularity: raw.granularity,
        current: {
          startDate: raw.current.start_date,
          endDate: raw.current.end_date,
        },
        previous: {
          startDate: raw.previous.start_date,
          endDate: raw.previous.end_date,
        },
        summary: {
          revenue: mapMetric(raw.summary.revenue),
          orderValue: mapMetric(raw.summary.order_value),
          transactions: mapMetric(raw.summary.transactions),
          orders: mapMetric(raw.summary.orders),
          avgPerTransaction: raw.summary.avg_per_transaction,
          avgPerOrder: raw.summary.avg_per_order,
        },
        breakdown: raw.breakdown.map((b) => ({
          label: b.label,
          date: b.date,
          revenue: b.revenue,
          transactions: b.transactions,
          orderValue: b.order_value,
          orders: b.orders,
        })),
      }));
  },
};
