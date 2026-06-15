'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { customerService } from '@/lib/services/customerService';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSuccess, showError } from '@/components/ui/Toast';
import type { Column } from '@/components/ui/DataTable';
import type { Customer } from '@/types';
import { formatDateOnly as formatDate } from '@/lib/format';

export default function CustomersPage() {
  const router = useRouter();

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Search state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      const res = await customerService.list(params);
      setCustomers(res.data);
      setPagination(res.pagination);
    } catch {
      showError('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  /** Navigasi ke SCR-03: Daftar Pesanan terfilter per pelanggan */
  const handleRowClick = (row: Record<string, unknown>) => {
    const customer = row as unknown as Customer;
    router.push(`/orders?customer_code=${customer.code}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await customerService.delete(deleteTarget.code);
      showSuccess(`Pelanggan "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      fetchCustomers();
    } catch {
      showError('Gagal menghapus pelanggan. Mungkin pelanggan ini masih memiliki pesanan.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => {
        const c = row as unknown as Customer;
        return <span className="font-medium text-slate-600">{c.code}</span>;
      },
    },
    {
      key: 'name',
      header: 'Nama',
      render: (row) => {
        const c = row as unknown as Customer;
        return <span className="font-semibold text-slate-800">{c.name}</span>;
      },
    },
    {
      key: 'whatsapp',
      header: 'WhatsApp',
      render: (row) => {
        const c = row as unknown as Customer;
        return <span className="text-slate-600">{c.whatsapp}</span>;
      },
    },
    {
      key: 'address',
      header: 'Alamat',
      render: (row) => {
        const c = row as unknown as Customer;
        return (
          <span className="text-slate-600 truncate max-w-[200px] block">
            {c.address || <span className="text-slate-400 italic">-</span>}
          </span>
        );
      },
    },
    {
      key: 'order_count',
      header: 'Jumlah Pesanan',
      render: (row) => {
        const c = row as unknown as Customer;
        const count = c.order_count ?? 0;
        if (count > 0) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              {count} pesanan
            </span>
          );
        }
        return <span className="text-xs text-slate-400 italic">Belum ada</span>;
      },
    },
    {
      key: 'created_at',
      header: 'Tanggal Terdaftar',
      render: (row) => {
        const c = row as unknown as Customer;
        return <span className="text-slate-600">{formatDate(c.created_at)}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-center',
      render: (row) => {
        const c = row as unknown as Customer;
        const hasOrders = (c.order_count ?? 0) > 0;
        return (
          <div className="flex items-center justify-center gap-1">
            {/* Navigasi ke SCR-07: Form Pelanggan (edit mode) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/customers/${c.code}/edit`);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Pelanggan"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasOrders) return;
                setDeleteTarget(c);
              }}
              disabled={hasOrders}
              className={`p-1.5 rounded-lg transition-colors ${
                hasOrders
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title={hasOrders ? 'Tidak bisa dihapus (memiliki pesanan)' : 'Hapus Pelanggan'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pelanggan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data pelanggan laundry Anda.
          </p>
        </div>
        {/* Navigasi ke SCR-07: Form Pelanggan (create mode) */}
        <Link
          href="/customers/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Tambah Pelanggan
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau WhatsApp..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg font-medium transition-colors text-sm"
          >
            Cari
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={customers as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="Belum ada pelanggan"
        emptyDescription="Tambahkan pelanggan baru untuk memulai."
        emptyAction={{
          label: 'Tambah Pelanggan',
          onClick: () => router.push('/customers/new'),
        }}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        title="Hapus Pelanggan"
        message={`Apakah Anda yakin ingin menghapus pelanggan "${deleteTarget?.name ?? ''}"? Tindakan ini tidak dapat dibatalkan.`}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        confirmLabel="Hapus"
        loading={deleteLoading}
      />
    </div>
  );
}
