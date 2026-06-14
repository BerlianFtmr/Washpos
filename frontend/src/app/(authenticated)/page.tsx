'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  PackageCheck,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { statsService } from '@/lib/services/statsService';
import { formatRupiah, formatDate } from '@/lib/format';
import type { DashboardStats, OrderStatus } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSpinner';

// Chart bar color per status (matches StatusBadge palette)
const chartColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-400',
  dicuci: 'bg-blue-500',
  disetrika: 'bg-purple-500',
  siap: 'bg-emerald-500',
  diambil: 'bg-slate-400',
  cancelled: 'bg-red-500',
};

const chartLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  dicuci: 'Dicuci',
  disetrika: 'Disetrika',
  siap: 'Siap',
  diambil: 'Diambil',
  cancelled: 'Cancelled',
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statsService.getDashboard();
      setStats(data);
    } catch {
      setError('Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // --- Stat Cards ---
  const statCards = stats
    ? [
        {
          label: 'Pesanan Hari Ini',
          value: stats.totalOrdersToday,
          icon: ShoppingBag,
          iconBg: 'bg-blue-50 text-blue-600',
          clickable: false,
        },
        {
          label: 'Pendapatan (Hari Ini)',
          value: formatRupiah(stats.totalRevenueToday),
          icon: TrendingUp,
          iconBg: 'bg-emerald-50 text-emerald-600',
          clickable: false,
        },
        {
          label: 'Pesanan Aktif',
          value: stats.activeOrders,
          icon: Clock,
          iconBg: 'bg-amber-50 text-amber-600',
          clickable: true,
          /** Navigasi ke SCR-03: Daftar Pesanan */
          onClick: () => router.push('/orders'),
        },
        {
          label: 'Siap Diambil',
          value: stats.readyForPickup,
          icon: PackageCheck,
          iconBg: 'bg-teal-50 text-teal-600',
          clickable: true,
          /** Navigasi ke SCR-03: Daftar Pesanan dengan filter status=siap */
          onClick: () => router.push('/orders?status=siap'),
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan operasional laundry hari ini.
            {!isAdmin && ' (Data pesanan Anda saja)'}
          </p>
        </div>
        {/** Navigasi ke SCR-04: Buat Pesanan */}
        <button
          onClick={() => router.push('/orders/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Buat Pesanan Baru
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const inner = (
                <>
                  <div
                    className={`w-12 h-12 rounded-full ${card.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {card.value}
                    </h3>
                  </div>
                </>
              );

              if (card.clickable) {
                return (
                  <button
                    key={card.label}
                    onClick={card.onClick}
                    className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
                  >
                    {inner}
                  </button>
                );
              }

              return (
                <div
                  key={card.label}
                  className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4"
                >
                  {inner}
                </div>
              );
            })}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart: Distribusi Status */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Distribusi Status Order
          </h2>

          {loading ? (
            <div className="flex-1 flex flex-col justify-center gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1 h-3 bg-slate-100 rounded-full animate-pulse" />
                  <div className="w-8 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats?.statusDistribution?.length ? (
            <div className="flex-1 flex flex-col justify-center gap-4">
              {stats.statusDistribution.map((item) => {
                const maxCount = Math.max(
                  ...stats.statusDistribution.map((d) => d.count),
                  1,
                );
                const pct = (item.count / maxCount) * 100;

                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-slate-600 truncate">
                      {chartLabels[item.status]}
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${chartColors[item.status]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-slate-800">
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data order.
            </div>
          )}
        </div>

        {/* Table: Pesanan Terbaru */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Pesanan Terbaru
            </h2>
            {/** Navigasi ke SCR-03: Daftar Pesanan */}
            <button
              onClick={() => router.push('/orders')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Lihat Semua
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : stats?.recentOrders?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">No. Order</th>
                    <th className="px-5 py-3 font-semibold">Pelanggan</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Total Harga</th>
                    <th className="px-5 py-3 font-semibold">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      /** Navigasi ke SCR-05: Detail Pesanan */
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-blue-600">
                        #{order.id}
                      </td>
                      <td className="px-5 py-3 text-slate-800">
                        {order.customer?.name ?? '-'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge variant="order" value={order.status} />
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {formatRupiah(order.total_price)}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              {error ?? 'Belum ada pesanan terbaru.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
