'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { customerService } from '@/lib/services/customerService';
import Modal from '@/components/ui/Modal';
import { showSuccess, showError } from '@/components/ui/Toast';
import type { Customer } from '@/types';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after customer is successfully created */
  onCreated: (customer: Customer) => void;
}

/**
 * Reusable modal form for creating a new customer.
 * Used by SCR-04 (Buat Pesanan) as inline popup — see spec S07-05.
 */
export default function CustomerFormModal({ open, onClose, onCreated }: CustomerFormModalProps) {
  const [form, setForm] = useState({ name: '', whatsapp: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({ name: '', whatsapp: '', address: '' });
    setErrors({});
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
      const created = await customerService.create({
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim() || undefined,
      });
      showSuccess('Pelanggan baru berhasil ditambahkan');
      onCreated(created);
      handleClose();
    } catch {
      showError('Gagal menambah pelanggan. No. WhatsApp mungkin sudah terdaftar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Tambah Pelanggan Baru" open={open} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="Masukkan nama pelanggan"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.name
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle size={12} />
              {errors.name}
            </p>
          )}
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
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.whatsapp
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {errors.whatsapp ? (
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle size={12} />
              {errors.whatsapp}
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Gunakan format 628xxx</p>
          )}
        </div>

        {/* Alamat */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Alamat <span className="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Masukkan alamat lengkap..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
