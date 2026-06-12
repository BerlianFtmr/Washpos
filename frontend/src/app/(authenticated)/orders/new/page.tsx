'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Trash2, UserPlus, X, FileText, Info } from 'lucide-react';
import { customerService } from '@/lib/services/customerService';
import { serviceService } from '@/lib/services/serviceService';
import { orderService } from '@/lib/services/orderService';
import Breadcrumb from '@/components/ui/Breadcrumb';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { showSuccess, showError } from '@/components/ui/Toast';
import type { Customer, Service } from '@/types';

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

interface OrderItemDraft {
  tempId: number;
  serviceId: number | '';
  quantity: number;
}

export default function CreateOrderPage() {
  const router = useRouter();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Step 1: Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Step 2: Items
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([
    { tempId: Date.now(), serviceId: '', quantity: 1 },
  ]);

  // Step 3: Notes
  const [notes, setNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal for inline customer creation
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    customerService.list({ limit: 100 }).then((res) => setCustomers(res.data)).catch(() => {});
    serviceService.list({ active: true, limit: 100 }).then((res) => setServices(res.data)).catch(() => {});
  }, []);

  // Derived: filtered customers for autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.whatsapp.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // Derived: grand total
  const getService = (id: number | '') => services.find((s) => s.id === Number(id));
  const calcSubtotal = (item: OrderItemDraft) => {
    const srv = getService(item.serviceId);
    if (!srv) return 0;
    return srv.price * (parseFloat(String(item.quantity)) || 0);
  };
  const grandTotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + calcSubtotal(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderItems, services]
  );

  // Handlers
  const handleAddItem = () => {
    setOrderItems([...orderItems, { tempId: Date.now(), serviceId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (tempId: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((i) => i.tempId !== tempId));
    }
  };

  const handleItemChange = (tempId: number, field: 'serviceId' | 'quantity', value: string | number) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  };

  // Inline customer modal save handler
  const handleCustomerCreated = (created: Customer) => {
    setSelectedCustomer(created);
    setCustomers((prev) => [...prev, created]);
  };

  // Submit order
  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!selectedCustomer) errs.customer = 'Pelanggan wajib dipilih.';
    const hasInvalid = orderItems.some((i) => !i.serviceId || parseFloat(String(i.quantity)) <= 0);
    if (hasInvalid) errs.items = 'Pastikan semua layanan dipilih dan quantity lebih dari 0.';
    if (orderItems.length === 0) errs.items = 'Minimal 1 item layanan.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const created = await orderService.create({
        customer_id: selectedCustomer!.id,
        items: orderItems.map((i) => ({
          service_id: Number(i.serviceId),
          quantity: parseFloat(String(i.quantity)),
        })),
        notes: notes.trim() || undefined,
      });
      showSuccess('Pesanan berhasil dibuat');
      /** Navigasi ke SCR-05: Detail Pesanan */
      router.push(`/orders/${created.id}`);
    } catch {
      showError('Gagal membuat pesanan. Periksa kembali data Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Pesanan', href: '/orders' }, { label: 'Buat Baru' }]} />

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: FORM */}
        <div className="w-full lg:w-2/3 space-y-6">
          {/* STEP 1: Pilih Pelanggan */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs">1</span>
                Pilih Pelanggan
              </h2>
            </div>
            <div className="p-5">
              {!selectedCustomer ? (
                <div className="space-y-4">
                  {errors.customer && <p className="text-sm text-red-600 font-medium">{errors.customer}</p>}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Cari nama atau nomor WhatsApp..."
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true); }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {customerDropdownOpen && customerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((cust) => (
                              <button
                                key={cust.id}
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setCustomerDropdownOpen(false);
                                  setCustomerSearch('');
                                  setErrors((prev) => { const { customer, ...rest } = prev; return rest; });
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                              >
                                <div className="font-medium text-slate-800">{cust.name}</div>
                                <div className="text-xs text-slate-500">{cust.whatsapp}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">Pelanggan tidak ditemukan.</div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      <UserPlus size={18} />
                      Tambah Baru
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-800">{selectedCustomer.name}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium border border-blue-200">Terpilih</span>
                    </div>
                    <p className="text-sm text-slate-600">{selectedCustomer.whatsapp}</p>
                    {selectedCustomer.address && (
                      <p className="text-sm text-slate-600 mt-1">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Ganti Pelanggan">
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Tambah Layanan */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs">2</span>
                Tambah Layanan
              </h2>
            </div>
            <div className="p-5">
              {errors.items && <p className="text-sm text-red-600 font-medium mb-3">{errors.items}</p>}

              <div className="space-y-3 mb-4">
                {orderItems.map((item) => {
                  const srv = getService(item.serviceId);
                  return (
                    <div key={item.tempId} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Layanan</label>
                        <select
                          value={item.serviceId}
                          onChange={(e) => handleItemChange(item.tempId, 'serviceId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Pilih Layanan --</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({formatRupiah(s.price)}/{s.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-24">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.tempId, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Subtotal</label>
                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 text-right">
                          {formatRupiah(calcSubtotal(item))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.tempId)}
                        disabled={orderItems.length === 1}
                        className="w-full sm:w-auto px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 flex justify-center items-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <Plus size={16} />
                Tambah Item Layanan
              </button>
            </div>
          </div>

          {/* STEP 3: Catatan */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs">3</span>
                Catatan Pesanan <span className="text-slate-400 font-normal text-sm ml-1">(Opsional)</span>
              </h2>
            </div>
            <div className="p-5">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Baju putih dipisah, cucian urgent..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* RIGHT: RINGKASAN */}
        <div className="w-full lg:w-1/3 lg:sticky lg:top-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                Ringkasan Pesanan
              </h2>
            </div>
            <div className="p-5">
              {/* Customer info */}
              <div className="mb-4 pb-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pelanggan</p>
                {selectedCustomer ? (
                  <p className="font-medium text-slate-800">{selectedCustomer.name}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Belum dipilih</p>
                )}
              </div>

              {/* Service details */}
              <div className="mb-4 pb-4 border-b border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Detail Layanan</p>
                {orderItems.map((item) => {
                  const srv = getService(item.serviceId);
                  if (!srv) return null;
                  return (
                    <div key={item.tempId} className="flex justify-between text-sm">
                      <div className="text-slate-600">
                        {srv.name} <span className="text-slate-400">x {item.quantity} {srv.unit}</span>
                      </div>
                      <div className="font-medium text-slate-800">{formatRupiah(calcSubtotal(item))}</div>
                    </div>
                  );
                })}
                {orderItems.every((i) => !i.serviceId) && (
                  <p className="text-sm text-slate-400 italic">Belum ada layanan ditambahkan</p>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-end mb-6">
                <p className="text-sm font-semibold text-slate-500">Total Harga</p>
                <p className="text-2xl font-bold text-blue-600">{formatRupiah(grandTotal)}</p>
              </div>

              {/* Info status */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium mb-6">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p>Setelah disimpan, pesanan akan masuk dengan status <strong>Pending</strong> dan pembayaran <strong>Unpaid</strong>.</p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pesanan'}
                </button>
                {/* Navigasi ke SCR-03: Daftar Pesanan */}
                <Link
                  href="/orders"
                  className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors block text-center"
                >
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Pelanggan Baru — reusable CustomerFormModal (S07-05) */}
      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}
