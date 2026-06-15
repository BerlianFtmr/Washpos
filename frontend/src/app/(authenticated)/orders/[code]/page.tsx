'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, Edit, Trash2, RefreshCw, DollarSign, User, Phone, MapPin,
  FileText, Clock, ShoppingBag, CreditCard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/lib/services/orderService';
import { customerService } from '@/lib/services/customerService';
import Breadcrumb from '@/components/ui/Breadcrumb';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { showSuccess, showError } from '@/components/ui/Toast';
import type { Order, Customer, OrderStatus, PaymentMethod } from '@/types';
import { formatRupiah, formatDate } from '@/lib/format';

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'dicuci', label: 'Dicuci' },
  { value: 'disetrika', label: 'Disetrika' },
  { value: 'siap', label: 'Siap Diambil' },
  { value: 'diambil', label: 'Diambil (Selesai)' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash / Tunai' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'ewallet', label: 'E-Wallet' },
];

export default function OrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [orderId, setOrderId] = useState<string>('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modal states
  const [activeModal, setActiveModal] = useState<'status' | 'payment' | 'edit' | 'delete' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form: Status
  const [formStatus, setFormStatus] = useState<OrderStatus>('pending');

  // Form: Payment
  const [formPayment, setFormPayment] = useState({ amount: '', method: 'cash' as PaymentMethod, note: '' });

  // Form: Edit
  const [formEdit, setFormEdit] = useState({ customerCode: '', notes: '' });

  // Unwrap params
  useEffect(() => {
    params.then((p) => setOrderId(p.code));
  }, [params]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await orderService.getById(orderId);
      setOrder(data);
      // Pre-fill form defaults
      setFormStatus(data.status);
      setFormEdit({ customerCode: data.customer?.code ?? '', notes: data.notes ?? '' });
    } catch {
      showError('Gagal memuat data pesanan');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Fetch customers for edit modal dropdown
  useEffect(() => {
    if (activeModal === 'edit') {
      customerService.list({ limit: 100 }).then((res) => setCustomers(res.data)).catch(() => {});
    }
  }, [activeModal]);

  if (loading || !order) return <PageLoading />;

  // Calculations
  const totalOrder = order.total_price;
  const totalPaid = (order.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, totalOrder - totalPaid);
  const isLocked = order.status === 'diambil' || order.status === 'cancelled';

  // Submit handlers
  const submitStatusChange = async () => {
    setModalLoading(true);
    try {
      await orderService.updateStatus(order.code, { status: formStatus });
      showSuccess('Status pesanan berhasil diubah');
      setActiveModal(null);
      fetchOrder();
    } catch {
      showError('Gagal mengubah status pesanan');
    } finally {
      setModalLoading(false);
    }
  };

  const submitPayment = async () => {
    const amount = parseFloat(formPayment.amount);
    if (!amount || amount <= 0) { showError('Jumlah pembayaran harus lebih dari 0'); return; }
    setModalLoading(true);
    try {
      await orderService.addPayment(order.code, {
        amount,
        method: formPayment.method,
        note: formPayment.note.trim() || undefined,
      });
      showSuccess('Pembayaran berhasil dicatat');
      setActiveModal(null);
      setFormPayment({ amount: '', method: 'cash', note: '' });
      fetchOrder();
    } catch {
      showError('Gagal mencatat pembayaran');
    } finally {
      setModalLoading(false);
    }
  };

  const submitEdit = async () => {
    setModalLoading(true);
    try {
      await orderService.update(order.code, {
        customer_code: formEdit.customerCode || undefined,
        notes: formEdit.notes.trim() || undefined,
      });
      showSuccess('Pesanan berhasil diperbarui');
      setActiveModal(null);
      fetchOrder();
    } catch {
      showError('Gagal memperbarui pesanan');
    } finally {
      setModalLoading(false);
    }
  };

  const submitDelete = async () => {
    setModalLoading(true);
    try {
      await orderService.delete(order.code);
      showSuccess('Pesanan berhasil dihapus');
      /** Navigasi ke SCR-03: Daftar Pesanan */
      router.push('/orders');
    } catch {
      showError('Gagal menghapus pesanan');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div>
      {/* S05-10: Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/' },
        { label: 'Pesanan', href: '/orders' },
        { label: `Detail ${order.code}` },
      ]} />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{order.code}</h1>
              <div className="flex gap-2">
                <StatusBadge variant="order" value={order.status} />
                <StatusBadge variant="payment" value={order.payment_status} />
              </div>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} /> Dibuat pada {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* S05-05: Modal Ubah Status */}
            <button
              onClick={() => setActiveModal('status')}
              disabled={isLocked}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} /> Ubah Status
            </button>
            {/* S05-06: Modal Catat Pembayaran */}
            <button
              onClick={() => setActiveModal('payment')}
              disabled={order.payment_status === 'paid' || isLocked}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign size={16} /> Catat Pembayaran
            </button>
            {/* S05-07: Modal Edit */}
            <button
              onClick={() => setActiveModal('edit')}
              disabled={isLocked}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit size={16} /> Edit
            </button>
            {/* S05-08: Hapus (Admin only) */}
            {isAdmin && (
              <button
                onClick={() => setActiveModal('delete')}
                disabled={isLocked}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> Hapus
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT column */}
          <div className="lg:col-span-2 space-y-6">

            {/* S05-01: Info pelanggan */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <User size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-800">Informasi Pelanggan</h2>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Nama Pelanggan</p>
                  <span className="font-medium text-blue-600">{order.customer?.name ?? '-'}</span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Staff Penanggung Jawab</p>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 uppercase">
                      {order.user?.username?.substring(0, 2) ?? '??'}
                    </div>
                    {order.user?.username ?? '-'}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">No. WhatsApp</p>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <Phone size={14} className="text-slate-400" /> {order.customer?.whatsapp ?? '-'}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Alamat</p>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5 text-sm">
                    <MapPin size={14} className="text-slate-400 shrink-0" /> {order.customer?.address || '-'}
                  </div>
                </div>
                {order.notes && (
                  <div className="md:col-span-2 bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                    <p className="text-sm font-semibold text-yellow-800 mb-1 flex items-center gap-1.5">
                      <FileText size={14} /> Catatan Tambahan
                    </p>
                    <p className="text-sm text-yellow-900">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* S05-02: Daftar item pesanan */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <ShoppingBag size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-800">Daftar Layanan</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-medium">No</th>
                      <th className="px-5 py-3 font-medium">Nama Layanan</th>
                      <th className="px-5 py-3 font-medium text-right">Harga Satuan</th>
                      <th className="px-5 py-3 font-medium text-center">Qty</th>
                      <th className="px-5 py-3 font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(order.items ?? []).map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{item.service?.name ?? '-'}</td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatRupiah(item.service?.price ?? 0)}/{item.service?.unit ?? '-'}
                        </td>
                        <td className="px-5 py-3 text-center text-slate-800 font-medium bg-slate-50/50">
                          {item.quantity} {item.service?.unit ?? ''}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-800">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={4} className="px-5 py-4 text-right font-bold text-slate-700">Total Keseluruhan</td>
                      <td className="px-5 py-4 text-right font-bold text-blue-600 text-lg">{formatRupiah(totalOrder)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* S05-03: Riwayat pembayaran */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-slate-500" />
                  <h2 className="font-bold text-slate-800">Riwayat Pembayaran</h2>
                </div>
                {remaining > 0 && !isLocked && (
                  <button onClick={() => setActiveModal('payment')} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    + Tambah
                  </button>
                )}
              </div>

              {(order.payments ?? []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 font-medium">Tanggal</th>
                        <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                        <th className="px-5 py-3 font-medium">Metode</th>
                        <th className="px-5 py-3 font-medium">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(order.payments ?? []).map((pay) => (
                        <tr key={pay.id}>
                          <td className="px-5 py-3 text-slate-600">{formatDate(pay.created_at)}</td>
                          <td className="px-5 py-3 text-right font-medium text-emerald-600">{formatRupiah(pay.amount)}</td>
                          <td className="px-5 py-3"><StatusBadge variant="paymentMethod" value={pay.method} /></td>
                          <td className="px-5 py-3 text-slate-500 text-xs truncate max-w-[150px]">{pay.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">Belum ada riwayat pembayaran.</div>
              )}

              {/* Summary */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-end gap-6 text-sm">
                <div className="flex justify-between md:flex-col md:text-right gap-1">
                  <span className="text-slate-500 font-medium">Total Pesanan</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(totalOrder)}</span>
                </div>
                <div className="flex justify-between md:flex-col md:text-right gap-1">
                  <span className="text-slate-500 font-medium">Sudah Dibayar</span>
                  <span className="font-semibold text-emerald-600">{formatRupiah(totalPaid)}</span>
                </div>
                <div className="flex justify-between md:flex-col md:text-right gap-1 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-6">
                  <span className="text-slate-700 font-bold">Sisa Tagihan</span>
                  <span className={`font-bold text-lg ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatRupiah(remaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT column: Audit trail */}
          <div className="lg:col-span-1 space-y-6">
            {/* S05-04: Timeline riwayat status */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden sticky top-6">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-800">Riwayat Status</h2>
              </div>
              <div className="p-6 relative">
                <div className="absolute left-8 top-8 bottom-8 w-px bg-slate-200" />
                <div className="space-y-6 relative">
                  {(order.audit_logs ?? []).map((log, idx) => (
                    <div key={log.id} className="flex gap-4 items-start">
                      <div className={`w-4 h-4 mt-1 rounded-full border-2 bg-white relative z-10 ${idx === 0 ? 'border-blue-500' : 'border-slate-300'}`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge variant="order" value={log.new_status} />
                        </div>
                        <p className="text-sm font-medium text-slate-800">
                          {log.old_status
                            ? `Diubah dari ${log.old_status}`
                            : 'Pesanan dibuat'}
                        </p>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span>Oleh: <span className="font-medium">{log.user?.username ?? 'System'}</span></span>
                          <span>•</span>
                          <span>{formatDate(log.changed_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!order.audit_logs || order.audit_logs.length === 0) && (
                    <p className="text-sm text-slate-400 italic">Belum ada riwayat status.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* S05-05: Modal Ubah Status */}
      <Modal title="Ubah Status Pesanan" open={activeModal === 'status'} onClose={() => setActiveModal(null)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status Baru</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Jika diubah menjadi <strong>Diambil</strong> atau <strong>Dibatalkan</strong>, status tidak bisa diubah kembali.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setActiveModal(null)} disabled={modalLoading} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Batal</button>
            <button onClick={submitStatusChange} disabled={modalLoading} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {modalLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* S05-06: Modal Catat Pembayaran */}
      <Modal title="Catat Pembayaran" open={activeModal === 'payment'} onClose={() => setActiveModal(null)} size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex justify-between font-medium">
            <span>Sisa Tagihan:</span>
            <span>{formatRupiah(remaining)}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (Rp)</label>
            <input
              type="number"
              value={formPayment.amount}
              onChange={(e) => setFormPayment({ ...formPayment, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder={`Maks: ${formatRupiah(remaining)}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Metode Pembayaran</label>
            <select
              value={formPayment.method}
              onChange={(e) => setFormPayment({ ...formPayment, method: e.target.value as PaymentMethod })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {paymentMethodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
            <textarea
              rows={2}
              value={formPayment.note}
              onChange={(e) => setFormPayment({ ...formPayment, note: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Catatan pembayaran..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setActiveModal(null)} disabled={modalLoading} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Batal</button>
            <button onClick={submitPayment} disabled={modalLoading} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {modalLoading ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </div>
        </div>
      </Modal>

      {/* S05-07: Modal Edit Pesanan */}
      <Modal title="Edit Data Pesanan" open={activeModal === 'edit'} onClose={() => setActiveModal(null)} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ganti Pelanggan</label>
            <select
              value={formEdit.customerCode}
              onChange={(e) => setFormEdit({ ...formEdit, customerCode: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Pilih Pelanggan --</option>
              {customers.map((c) => (
                <option key={c.code} value={c.code}>{c.name} ({c.whatsapp})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Edit Catatan Pesanan</label>
            <textarea
              rows={4}
              value={formEdit.notes}
              onChange={(e) => setFormEdit({ ...formEdit, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setActiveModal(null)} disabled={modalLoading} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Batal</button>
            <button onClick={submitEdit} disabled={modalLoading} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {modalLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* S05-08: Modal Hapus (Admin only) */}
      <ConfirmDialog
        title="Hapus Pesanan?"
        message={`Anda yakin ingin menghapus pesanan ${order.code}? Data yang dihapus tidak dapat dikembalikan.`}
        open={activeModal === 'delete'}
        onClose={() => setActiveModal(null)}
        onConfirm={submitDelete}
        variant="danger"
        confirmLabel="Ya, Hapus"
        loading={modalLoading}
      />
    </div>
  );
}
