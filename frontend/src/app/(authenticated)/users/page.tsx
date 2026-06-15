'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { userService } from '@/lib/services/userService';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSuccess, showError } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { Column } from '@/components/ui/DataTable';
import type { User } from '@/types';
import { formatDateOnly as formatDate } from '@/lib/format';

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  /** P6-02: Halaman admin-only — redirect pegawai ke dashboard */
  const { loading: authLoading, authorized } = useAdminGuard();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      const res = await userService.list(params);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch {
      showError('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // P6-02: Admin-only guard — render nothing (redirect handled by hook)
  if (authLoading) return <PageLoading />;
  if (!authorized) return null;

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
      await userService.delete(deleteTarget.code);
      showSuccess(`Pengguna "${deleteTarget.username}" berhasil dihapus`);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      showError('Gagal menghapus pengguna');
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
        const u = row as unknown as User;
        return <span className="font-medium text-slate-600">{u.code}</span>;
      },
    },
    {
      key: 'username',
      header: 'Username',
      render: (row) => {
        const u = row as unknown as User;
        const isCurrentUser = !!currentUser && u.code === currentUser.code;
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{u.username}</span>
            {isCurrentUser && (
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">
                Anda
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const u = row as unknown as User;
        return <StatusBadge variant="role" value={u.role} />;
      },
    },
    {
      key: 'created_at',
      header: 'Tanggal Dibuat',
      render: (row) => {
        const u = row as unknown as User;
        return <span className="text-slate-600">{formatDate(u.created_at)}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-center',
      render: (row) => {
        const u = row as unknown as User;
        const isCurrentUser = !!currentUser && u.code === currentUser.code;
        return (
          <div className="flex items-center justify-center gap-1">
            {/* Navigasi ke SCR-13: Form Pengguna (edit mode) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/users/${u.code}/edit`);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Pengguna"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrentUser) return;
                setDeleteTarget(u);
              }}
              disabled={isCurrentUser}
              className={`p-1.5 rounded-lg transition-colors ${
                isCurrentUser
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title={isCurrentUser ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
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
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data akun pegawai dan administrator sistem.
          </p>
        </div>
        {/* Navigasi ke SCR-13: Form Pengguna (create mode) */}
        <Link
          href="/users/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          Tambah Pengguna
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari berdasarkan username..."
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
        data={users as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="Belum ada pengguna"
        emptyDescription="Tambahkan pengguna baru untuk memberikan akses ke sistem."
        emptyAction={{
          label: 'Tambah Pengguna',
          onClick: () => router.push('/users/new'),
        }}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        title="Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus pengguna "${deleteTarget?.username ?? ''}"? Pengguna ini tidak akan bisa login lagi ke sistem.`}
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
