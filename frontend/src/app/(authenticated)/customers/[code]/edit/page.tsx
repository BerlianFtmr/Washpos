'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { customerService } from '@/lib/services/customerService';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Spinner } from '@/components/ui/LoadingSpinner';
import { showSuccess, showError } from '@/components/ui/Toast';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerCode = (params?.code as string) ?? '';

  const [form, setForm] = useState({ name: '', whatsapp: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerCode) {
      showError('Kode pelanggan tidak valid');
      router.push('/customers');
      return;
    }

    customerService
      .getById(customerCode)
      .then((data) => {
        setForm({
          name: data.name,
          whatsapp: data.whatsapp,
          address: data.address ?? '',
        });
      })
      .catch(() => {
        showError('Gagal memuat data pelanggan');
        router.push('/customers');
      })
      .finally(() => setLoading(false));
  }, [customerCode, router]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = 'Nama wajib diisi';
    } else if (form.name.trim().length > 100) {
      errs.name = 'Nama maksimal 100 karakter';
    }
    if (!form.whatsapp.trim()) {
      errs.whatsapp = 'No. WhatsApp wajib diisi';
    } else if (!/^628\d{7,11}$/.test(form.whatsapp.trim())) {
      errs.whatsapp = 'Format WhatsApp tidak valid. Gunakan format 628xxx (10-14 digit)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await customerService.update(customerCode, {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim() || undefined,
      });
      showSuccess('Data pelanggan berhasil diperbarui');
      /** Navigasi ke SCR-06: Daftar Pelanggan */
      router.push('/customers');
    } catch {
      showError('Gagal memperbarui pelanggan. No. WhatsApp mungkin sudah digunakan.');
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
          { label: 'Pelanggan', href: '/customers' },
          { label: `Edit ${customerCode}` },
        ]}
      />

      <div className="max-w-2xl mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h1 className="text-xl font-bold text-slate-800">Edit Pelanggan</h1>
            <p className="text-sm text-slate-500 mt-1">
              Perbarui data pelanggan {customerCode}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                maxLength={100}
                placeholder="Masukkan nama lengkap pelanggan"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  errors.name
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <div className="flex justify-between mt-1.5">
                {errors.name ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.name}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-slate-400">{form.name.length}/100</span>
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                No. WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => {
                  setForm({ ...form, whatsapp: e.target.value });
                  if (errors.whatsapp) setErrors({ ...errors, whatsapp: '' });
                }}
                placeholder="Contoh: 6281234567890"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                  errors.whatsapp
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.whatsapp ? (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1.5">
                  <AlertCircle size={12} />
                  {errors.whatsapp}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5">
                  Gunakan format 628xxx (tanpa +, spasi, atau 0 di depan)
                </p>
              )}
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Alamat <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Masukkan alamat lengkap pelanggan..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {/* Navigasi ke SCR-06: Daftar Pelanggan */}
              <Link
                href="/customers"
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
