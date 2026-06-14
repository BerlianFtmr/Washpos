'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Edit, Trash2, Filter } from 'lucide-react';
import { paymentService } from '@/lib/services/paymentService';
import { orderService } from '@/lib/services/orderService';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSuccess, showError } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Column } from '@/components/ui/DataTable';
import type { Payment, Order } from '@/types';
import { formatRupiah, formatDate } from '@/lib/format';

export default function PaymentsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  // Data state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterOrderId, setFilterOrderId] = useState<number | ''>('');
  const [orderOptions, setOrderOptions] = useState<Order[]>([]);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch order options for dropdown filter
  useEffect(() => {
    orderService.list({ limit: 100 }).then((res) => {
      setOrderOptions(res.data);
    }).catch(() => {});
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filterOrderId) params.order_id = filterOrderId;
      const res = await paymentService.list(params);
      setPayments(res.data);
      setPagination(res.pagination);
    } catch {
      showError('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filterOrderId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await paymentService.delete(deleteTarget.id);
      showSuccess(`Pembayaran #${deleteTarget.id} berhasil dihapus`);
      setDeleteTarget(null);
      fetchPayments();
    } catch {
      showError('Gagal menghapus pembayaran');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Client-side search filter (search by ID payment or order)
  const filteredPayments = search
    ? payments.filter(
        (p) =>
          String(p.id).includes(search) ||
          String(p.order_id).includes(search) ||
          (p.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => {
        const p = row as unknown as Payment;
        return <span className="font-medium text-slate-600">#{p.id}</span>;
      },
    },
    {
      key: 'order_id',
      header: 'ID Order',
      render: (row) => {
        const p = row as unknown as Payment;
        return (
          /** Navigasi ke SCR-05: Detail Pesanan */
          <Link
            href={`/orders/${p.order_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            #{p.order_id}
          </Link>
        );
      },
    },
    {
      key: 'customer',
      header: 'Pelanggan',
      render: (row) => {
        const p = row as unknown as Payment;
        return <span className="text-slate-800">{p.customer?.name ?? '-'}</span>;
      },
    },
    {
      key: 'amount',
      header: 'Jumlah',
      className: 'text-right',
      render: (row) => {
        const p = row as unknown as Payment;
        return <span className="font-semibold text-slate-800">{formatRupiah(p.amount)}</span>;
      },
    },
    {
      key: 'method',
      header: 'Metode',
      render: (row) => {
        const p = row as unknown as Payment;
        return <StatusBadge variant="paymentMethod" value={p.method} />;
      },
    },
    {
      key: 'note',
      header: 'Catatan',
      render: (row) => {
        const p = row as unknown as Payment;
        return (
          <span className="text-slate-500 max-w-[150px] truncate block">
            {p.note || <span className="text-slate-400 italic">-</span>}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Tanggal',
      render: (row) => {
        const p = row as unknown as Payment;
        return <span className="text-slate-500 text-xs">{formatDate(p.created_at)}</span>;
      },
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            className: 'text-center',
            render: (row: Record<string, unknown>) => {
              const p = row as unknown as Payment;
              return (
                <div className="flex items-center justify-center gap-1">
                  {/* Navigasi ke SCR-11: Detail Pembayaran (edit mode) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/payments/${p.id}`);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Pembayaran"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(p);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Pembayaran"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau riwayat seluruh transaksi dan penerimaan uang.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari ID Pembayaran, ID Order, atau pelanggan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Dropdown Filter Order ID */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterOrderId}
              onChange={(e) => {
                setFilterOrderId(e.target.value ? Number(e.target.value) : '');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-8 py-2 appearance-none border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Semua Order</option>
              {orderOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.id} — {o.customer?.name ?? 'Pelanggan'}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredPayments as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="Belum ada data pembayaran"
        emptyDescription="Data pembayaran akan muncul setelah ada transaksi yang dicatat."
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        title="Hapus Pembayaran?"
        message={`Apakah Anda yakin ingin menghapus pembayaran #${deleteTarget?.id ?? ''} sebesar ${deleteTarget ? formatRupiah(deleteTarget.amount) : ''}? Status pembayaran pada pesanan #${deleteTarget?.order_id ?? ''} akan dikalkulasi ulang.`}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        confirmLabel="Ya, Hapus"
        loading={deleteLoading}
      />
    </div>
  );
}
