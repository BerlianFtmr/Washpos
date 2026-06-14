'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, X, Tag, Hash, AlertCircle } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { serviceService } from '@/lib/services/serviceService';
import { showSuccess, showError } from '@/components/ui/Toast';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import type { ServiceUnit } from '@/types';
import { formatRupiahHint } from '@/lib/format';

const unitOptions: { value: ServiceUnit; label: string }[] = [
  { value: 'kg', label: 'kg (Kilogram)' },
  { value: 'piece', label: 'piece (Potong/Pcs)' },
  { value: 'meter', label: 'meter' },
  { value: 'pair', label: 'pair (Pasang)' },
];

interface FormErrors {
  name?: string;
  price?: string;
  unit?: string;
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = Number(params.id);
  /** P6-02: Halaman admin-only — redirect pegawai ke dashboard */
  const { loading: authLoading, authorized } = useAdminGuard();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    unit: 'kg' as ServiceUnit,
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch service data for edit mode
  useEffect(() => {
    async function fetchService() {
      try {
        const service = await serviceService.getById(serviceId);
        setFormData({
          name: service.name,
          price: String(service.price),
          unit: service.unit,
          isActive: service.active,
        });
      } catch {
        showError('Gagal memuat data layanan');
        router.push('/services');
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [serviceId, router]);

  // P6-02: Admin-only guard — render nothing (redirect handled by hook)
  if (authLoading) return <PageLoading />;
  if (!authorized) return null;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nama layanan wajib diisi.';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nama layanan maksimal 100 karakter.';
    }
    if (!formData.price) {
      newErrors.price = 'Harga wajib diisi.';
    } else if (Number(formData.price) <= 0) {
      newErrors.price = 'Harga harus lebih besar dari 0.';
    }
    if (!formData.unit) {
      newErrors.unit = 'Satuan wajib dipilih.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await serviceService.update(serviceId, {
        name: formData.name.trim(),
        price: Number(formData.price),
        unit: formData.unit,
        active: formData.isActive,
      });
      showSuccess('Data layanan berhasil diperbarui');
      /** Navigasi ke SCR-08: Daftar Layanan */
      router.push('/services');
    } catch {
      showError('Gagal memperbarui layanan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Layanan', href: '/services' }, { label: `Edit #${serviceId}` }]} />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Edit Layanan</h1>
          <p className="text-sm text-slate-500 mt-1">Perbarui harga atau status layanan yang sudah ada.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-8 space-y-6">
              {/* Nama Layanan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="name">
                  Nama Layanan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Tag size={18} />
                  </div>
                  <input
                    id="name"
                    type="text"
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'} rounded-lg text-sm transition-colors focus:outline-none focus:ring-2`}
                    placeholder="Contoh: Cuci Komplit (Reguler)"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.name}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400 text-right">{formData.name.length}/100 karakter</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Harga */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="price">
                    Harga <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg shadow-sm">
                    <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-medium text-sm">
                      Rp
                    </span>
                    <input
                      id="price"
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={`flex-1 block w-full px-4 py-2.5 bg-slate-50 border ${errors.price ? 'border-red-300 focus:ring-red-500 focus:border-red-500 z-10 relative' : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'} rounded-none rounded-r-lg text-sm transition-colors focus:outline-none focus:ring-2`}
                      placeholder="0"
                    />
                  </div>
                  {errors.price ? (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.price}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500 font-medium text-blue-600">
                      Format: {formatRupiahHint(formData.price)}
                    </p>
                  )}
                </div>

                {/* Satuan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="unit">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Hash size={18} />
                    </div>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value as ServiceUnit })}
                      className={`block w-full pl-10 pr-8 py-2.5 appearance-none bg-slate-50 border ${errors.unit ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'} rounded-lg text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2`}
                    >
                      {unitOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                  {errors.unit && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.unit}
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle Aktif */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Status Layanan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Layanan yang dinonaktifkan tidak akan muncul saat membuat pesanan baru.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    <span className={`ml-3 text-sm font-medium ${formData.isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                      {formData.isActive ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/services')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X size={18} />
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
