'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/lib/services/orderService';
import { customerService } from '@/lib/services/customerService';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Column } from '@/components/ui/DataTable';
import type { Order, Customer, OrderStatus } from '@/types';
import { showError } from '@/components/ui/Toast';
import { formatRupiah, formatDate } from '@/lib/format';

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'dicuci', label: 'Dicuci' },
  { value: 'disetrika', label: 'Disetrika' },
  { value: 'siap', label: 'Siap Diambil' },
  { value: 'diambil', label: 'Diambil' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');

  // Fetch customers for filter dropdown
  useEffect(() => {
    customerService.list({ limit: 100 })
      .then((res) => setCustomers(res.data))
      .catch(() => {});
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;
      if (customerFilter) params.customer_id = Number(customerFilter);
      const res = await orderService.list(params);
      setOrders(res.data);
      setPagination(res.pagination);
    } catch {
      showError('Gagal memuat data pesanan');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, customerFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  /** Navigasi ke SCR-05: Detail Pesanan */
  const handleRowClick = (row: Record<string, unknown>) => {
    const order = row as unknown as Order;
    router.push(`/orders/${order.id}`);
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      header: 'ID Order',
      render: (row) => {
        const order = row as unknown as Order;
        return <span className="font-medium text-blue-600">#{order.id}</span>;
      },
    },
    {
      key: 'customer',
      header: 'Pelanggan & WA',
      render: (row) => {
        const order = row as unknown as Order;
        return (
          <div>
            <div className="font-medium text-slate-800">{order.customer?.name ?? '-'}</div>
            <div className="text-xs text-slate-500">{order.customer?.whatsapp ?? ''}</div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Tanggal',
      render: (row) => {
        const order = row as unknown as Order;
        return <span className="text-slate-600">{formatDate(order.created_at)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const order = row as unknown as Order;
        return <StatusBadge variant="order" value={order.status} />;
      },
    },
    {
      key: 'payment_status',
      header: 'Status Bayar',
      render: (row) => {
        const order = row as unknown as Order;
        return <StatusBadge variant="payment" value={order.payment_status} />;
      },
    },
    {
      key: 'total_price',
      header: 'Total Harga',
      render: (row) => {
        const order = row as unknown as Order;
        return <span className="font-semibold text-slate-800">{formatRupiah(order.total_price)}</span>;
      },
    },
    ...(isAdmin
      ? [
          {
            key: 'user' as const,
            header: 'Ditangani Oleh',
            render: (row: Record<string, unknown>) => {
              const order = row as unknown as Order;
              return <span className="text-slate-600">{order.user?.username ?? '-'}</span>;
            },
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-center',
      render: (row) => {
        const order = row as unknown as Order;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/orders/${order.id}`);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Lihat Detail"
          >
            <Eye size={18} />
          </button>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Pesanan</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Kelola dan pantau semua pesanan laundry.' : 'Kelola dan pantau pesanan laundry Anda.'}
          </p>
        </div>
        {/* Navigasi ke SCR-04: Buat Pesanan */}
        <Link
          href="/orders/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Buat Pesanan Baru
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="w-full pl-10 pr-4 py-2 appearance-none border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={(e) => { setCustomerFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
              className="min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Semua Pelanggan</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Client-side search filtering on customer name */}
      <DataTable
        columns={columns}
        data={search
          ? orders.filter((o) =>
              o.customer?.name?.toLowerCase().includes(search.toLowerCase())
            ) as unknown as Record<string, unknown>[]
          : (orders as unknown as Record<string, unknown>[])}
        loading={loading}
        emptyMessage="Belum ada pesanan"
        emptyDescription="Buat pesanan baru untuk memulai."
        emptyAction={{ label: 'Buat Pesanan', onClick: () => router.push('/orders/new') }}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
