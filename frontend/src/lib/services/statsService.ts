import { api } from '@/lib/api';
import type { DashboardStats, OrderStatus } from '@/types';

interface ApiDashboardResponse {
  today: {
    date: string;
    total_orders: number;
    total_revenue: number;
  };
  by_status: Array<{ status: string; count: number }>;
  recent_orders: Array<Record<string, unknown>>;
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
};
