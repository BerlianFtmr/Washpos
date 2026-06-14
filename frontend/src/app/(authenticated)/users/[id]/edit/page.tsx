'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { userService } from '@/lib/services/userService';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Spinner, PageLoading } from '@/components/ui/LoadingSpinner';
import { showSuccess, showError } from '@/components/ui/Toast';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import type { UserRole } from '@/types';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params?.id);
  /** P6-02: Halaman admin-only — redirect pegawai ke dashboard */
  const { loading: authLoading, authorized } = useAdminGuard();

  const [form, setForm] = useState({ username: '', password: '', role: 'pegawai' as UserRole });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || isNaN(userId)) {
      showError('ID pengguna tidak valid');
      router.push('/users');
      return;
    }

    userService
      .getById(userId)
      .then((data) => {
        setForm({
          username: data.username,
          password: '',
          role: data.role,
        });
      })
      .catch(() => {
        showError('Gagal memuat data pengguna');
        router.push('/users');
      })
      .finally(() => setLoading(false));
  }, [userId, router]);

  // P6-02: Admin-only guard — render nothing (redirect handled by hook)
  if (authLoading) return <PageLoading />;
  if (!authorized) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!form.username.trim()) {
      errs.username = 'Username wajib diisi';
    } else if (form.username.length < 3 || form.username.length > 50) {
      errs.username = 'Username harus 3-50 karakter';
    } else if (!usernameRegex.test(form.username)) {
      errs.username = 'Username hanya boleh huruf, angka, dan underscore (_)';
    }

    if (form.password && form.password.length < 6) {
      errs.password = 'Password minimal 6 karakter';
    }

    if (!form.role) {
      errs.role = 'Role wajib dipilih';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: { username?: string; password?: string; role?: UserRole } = {
        username: form.username.trim(),
        role: form.role,
      };
      if (form.password) {
        payload.password = form.password;
      }
      await userService.update(userId, payload);
      showSuccess('Data pengguna berhasil diperbarui');
      /** Navigasi ke SCR-12: Daftar Pengguna */
      router.push('/users');
    } catch {
      showError('Gagal memperbarui pengguna. Username mungkin sudah digunakan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Pengguna', href: '/users' },
          { label: `Edit #${userId}` },
        ]}
      />

      <div className="max-w-2xl mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h1 className="text-xl font-bold text-slate-800">Edit Pengguna</h1>
            <p className="text-sm text-slate-500 mt-1">
              Perbarui data username, role, atau ganti password pengguna #{userId}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="username">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                maxLength={50}
                value={form.username}
                onChange={(e) => {
                  setForm({ ...form, username: e.target.value });
                  if (errors.username) setErrors({ ...errors, username: '' });
                }}
                placeholder="Contoh: pegawai_budi123"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  errors.username
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.username ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
                  <AlertCircle size={12} />
                  {errors.username}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5">
                  3-50 karakter. Hanya huruf, angka, dan underscore (_).
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Password <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                    errors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
                  <AlertCircle size={12} />
                  {errors.password}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5">
                  Kosongkan jika tidak ingin mengubah password.
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hak Akses (Role) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Pegawai */}
                <label
                  className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all ${
                    form.role === 'pegawai'
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="pegawai"
                    checked={form.role === 'pegawai'}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="sr-only"
                  />
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full border shrink-0 mr-3 mt-0.5 ${
                      form.role === 'pegawai' ? 'border-blue-500' : 'border-slate-300'
                    }`}
                  >
                    {form.role === 'pegawai' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-semibold text-sm ${
                        form.role === 'pegawai' ? 'text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      Pegawai
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hanya bisa mengelola pesanan milik sendiri.
                    </p>
                  </div>
                </label>

                {/* Admin */}
                <label
                  className={`relative flex items-start p-4 cursor-pointer rounded-xl border-2 transition-all ${
                    form.role === 'admin'
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={form.role === 'admin'}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="sr-only"
                  />
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full border shrink-0 mr-3 mt-0.5 ${
                      form.role === 'admin' ? 'border-amber-500' : 'border-slate-300'
                    }`}
                  >
                    {form.role === 'admin' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-semibold text-sm ${
                        form.role === 'admin' ? 'text-amber-800' : 'text-slate-700'
                      }`}
                    >
                      Admin
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Memiliki akses penuh ke seluruh sistem.
                    </p>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
                  <AlertCircle size={12} />
                  {errors.role}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {/* Navigasi ke SCR-12: Daftar Pengguna */}
              <Link
                href="/users"
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
