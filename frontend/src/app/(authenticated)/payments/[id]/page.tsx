'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, AlertCircle, Receipt, FileText, Edit } from 'lucide-react';
import { paymentService } from '@/lib/services/paymentService';
import { orderService } from '@/lib/services/orderService';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showSuccess, showError } from '@/components/ui/Toast';
import type { Payment, Order, PaymentMethod } from '@/types';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = Number(params.id);

  // Data state
  const [payment, setPayment] = useState<Payment | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    method: 'cash' as PaymentMethod,
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pay = await paymentService.getById(paymentId);
      setPayment(pay);

      // Fetch related order for payment status and totals
      const ord = await orderService.getById(pay.order_id);
      setOrder(ord);

      // Initialize form with current payment data
      setFormData({
        amount: String(pay.amount),
        method: pay.method,
        note: pay.note ?? '',
      });
    } catch {
      showError('Gagal memuat data pembayaran');
      router.push('/payments');
    } finally {
      setLoading(false);
    }
  }, [paymentId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate payment projection
  const orderTotal = order?.total_price ?? 0;
  // Total payments from other records (excluding current payment)
  const otherPaymentsTotal =
    order?.payments?.filter((p) => p.id !== paymentId).reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const currentAmount = Number(formData.amount) || 0;
  const totalPaid = otherPaymentsTotal + currentAmount;
  const remaining = Math.max(0, orderTotal - totalPaid);

  let projectedStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (totalPaid >= orderTotal && orderTotal > 0) projectedStatus = 'paid';
  else if (totalPaid > 0) projectedStatus = 'partial';

  const validate = () => {
    const errs: Record<string, string> = {};
    const amount = Number(formData.amount);
    if (!formData.amount || isNaN(amount)) {
      errs.amount = 'Jumlah pembayaran wajib diisi.';
    } else if (amount <= 0) {
      errs.amount = 'Jumlah harus lebih besar dari 0.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await paymentService.update(paymentId, {
        amount: Number(formData.amount),
        method: formData.method,
        note: formData.note || undefined,
      });
      showSuccess('Pembayaran berhasil diperbarui');
      router.push('/payments');
    } catch {
      showError('Gagal memperbarui pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await paymentService.delete(paymentId);
      showSuccess(`Pembayaran #${paymentId} berhasil dihapus`);
      router.push('/payments');
    } catch {
      showError('Gagal menghapus pembayaran');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!payment || !order) return null;

  return (
    <div>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/payments')}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={18} />
          Kembali ke Daftar
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          Hapus Pembayaran
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Payment Info + Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Info Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Pembayaran #{payment.id}</h1>
                <p className="text-sm text-slate-500">Tercatat pada: {formatDate(payment.created_at)}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                  Terkait Pesanan
                </p>
                {/* Navigasi ke SCR-05: Detail Pesanan */}
                <Link
                  href={`/orders/${payment.order_id}`}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  #{payment.order_id}
                </Link>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                  Pelanggan
                </p>
                <p className="font-medium text-slate-800">{order.customer?.name ?? '-'}</p>
              </div>
            </div>
          </div>

          {/* Form Edit */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit size={20} className="text-blue-600" />
                Edit Data Pembayaran
              </h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Input Jumlah */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Jumlah Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg shadow-sm max-w-md">
                    <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 font-medium text-sm">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={`flex-1 block w-full px-4 py-2.5 bg-slate-50 border ${
                        errors.amount ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                      } rounded-none rounded-r-lg text-sm transition-colors focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.amount ? (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.amount}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs font-medium text-blue-600">
                      Terbaca: {formatRupiah(Number(formData.amount) || 0)}
                    </p>
                  )}
                </div>

                {/* Input Metode */}
                <div className="max-w-md">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="cash">Cash / Tunai</option>
                    <option value="transfer">Transfer Bank</option>
                    <option value="ewallet">E-Wallet (OVO/Gopay/Dana)</option>
                  </select>
                </div>

                {/* Input Catatan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Catat bank asal transfer, referensi, dll..."
                  />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Status & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden sticky top-6">
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                Status Pesanan
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Status Saat Ini</span>
                <StatusBadge variant="payment" value={order.payment_status} />
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Proyeksi Status Baru</span>
                <StatusBadge variant="payment" value={projectedStatus} />
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Tagihan Order</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(orderTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Dibayar</span>
                  <span className="font-semibold text-emerald-600">{formatRupiah(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Sisa Tagihan</span>
                  <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(remaining)}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 mt-6 border-t border-slate-200">
                <button
                  type="submit"
                  form="editPaymentForm"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm focus:ring-4 focus:ring-blue-100 disabled:opacity-70"
                >
                  <Save size={18} />
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        title="Hapus Pembayaran?"
        message={`Apakah Anda yakin ingin menghapus pembayaran #${paymentId}? Status pembayaran pada pesanan #${payment.order_id} akan dikalkulasi ulang dan dapat berubah.`}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        variant="danger"
        confirmLabel="Ya, Hapus"
        loading={deleteLoading}
      />
    </div>
  );
}
