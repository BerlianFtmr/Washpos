'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Power, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { serviceService } from '@/lib/services/serviceService';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Column } from '@/components/ui/DataTable';
import type { Service } from '@/types';
import { showSuccess, showError } from '@/components/ui/Toast';
import { formatRupiah } from '@/lib/format';

export default function ServicesPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  // Data state
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter state
  const [showInactive, setShowInactive] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle status state
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      // If admin and showInactive is off, only show active. Otherwise show all.
      // Pegawai always sees only active.
      if (!showInactive || !isAdmin) {
        params.active = true;
      }
      const res = await serviceService.list(params as never);
      setServices(res.data);
      setPagination(res.pagination);
    } catch {
      showError('Gagal memuat data layanan');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, showInactive, isAdmin]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  /** Toggle active/nonactive for a service (Admin only) */
  const handleToggleStatus = async (service: Service) => {
    setTogglingCode(service.code);
    try {
      await serviceService.update(service.code, { active: !service.active });
      showSuccess(`Layanan "${service.name}" berhasil ${service.active ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchServices();
    } catch {
      showError('Gagal mengubah status layanan');
    } finally {
      setTogglingCode(null);
    }
  };

  /** Delete service handler (Admin only) */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await serviceService.delete(deleteTarget.code);
      showSuccess(`Layanan "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      fetchServices();
    } catch {
      showError('Gagal menghapus layanan');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => {
        const s = row as unknown as Service;
        return <span className="font-medium text-slate-500">{s.code}</span>;
      },
    },
    {
      key: 'name',
      header: 'Nama Layanan',
      render: (row) => {
        const s = row as unknown as Service;
        return <span className={`font-semibold ${s.active ? 'text-slate-800' : 'text-slate-400'}`}>{s.name}</span>;
      },
    },
    {
      key: 'price',
      header: 'Harga per Satuan',
      className: 'text-right',
      render: (row) => {
        const s = row as unknown as Service;
        return <span className={`font-medium ${s.active ? 'text-slate-800' : 'text-slate-400'}`}>{formatRupiah(s.price)}</span>;
      },
    },
    {
      key: 'unit',
      header: 'Satuan',
      render: (row) => {
        const s = row as unknown as Service;
        return (
          <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium uppercase tracking-wider">
            /{s.unit}
          </span>
        );
      },
    },
    {
      key: 'active',
      header: 'Status',
      className: 'text-center',
      render: (row) => {
        const s = row as unknown as Service;
        return s.active ? (
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs border border-emerald-200">
            Aktif
          </span>
        ) : (
          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-bold text-xs border border-slate-200">
            Non-aktif
          </span>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            key: 'actions' as const,
            header: 'Aksi',
            className: 'text-center',
            render: (row: Record<string, unknown>) => {
              const s = row as unknown as Service;
              const isToggling = togglingCode === s.code;
              return (
                <div className="flex items-center justify-center gap-1">
                  {/* Toggle Aktif/Nonaktif */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(s); }}
                    disabled={isToggling}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      s.active
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    title={s.active ? 'Nonaktifkan Layanan' : 'Aktifkan Layanan'}
                  >
                    <Power size={18} />
                  </button>

                  {/* Navigasi ke SCR-09: Form Layanan — mode edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/services/${s.code}/edit`); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Data"
                  >
                    <Edit size={18} />
                  </button>

                  {/* Hapus */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Layanan"
                  >
                    <Trash2 size={18} />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Layanan</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola jenis layanan pencucian beserta harganya.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Toggle Tampilkan Non-Aktif */}
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showInactive}
                  onChange={() => { setShowInactive(!showInactive); setPagination((p) => ({ ...p, page: 1 })); }}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${showInactive ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showInactive ? 'transform translate-x-4' : ''}`} />
              </div>
              Tampilkan Non-Aktif
            </label>

            {/* Navigasi ke SCR-09: Form Layanan — mode create */}
            <Link
              href="/services/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Tambah Layanan
            </Link>
          </div>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={services as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="Tidak ada layanan yang tersedia"
        emptyDescription="Belum ada layanan yang terdaftar."
        emptyAction={isAdmin ? { label: 'Tambah Layanan', onClick: () => router.push('/services/new') } : undefined}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Confirm Dialog: Hapus Layanan */}
      <ConfirmDialog
        title="Hapus Layanan?"
        message={
          deleteTarget
            ? `Anda yakin ingin menghapus layanan "${deleteTarget.name}" secara permanen?`
            : ''
        }
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        confirmLabel="Ya, Hapus"
        loading={deleting}
      />
    </div>
  );
}
