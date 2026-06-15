/**
 * Response Sanitizer (FASE 4 — Deprecation & Cleanup)
 *
 * Menghapus field internal (`id`, FK `*_id`) dari entity sebelum dikirim ke
 * response publik. `id` (PK INT) tetap ada di DB & query layer untuk operasi
 * internal (FK join, pegawai isolation, audit trail), tapi TIDAK boleh bocor
 * ke response API publik.
 *
 * Aturan:
 *   - Entity publik (user, customer, service, order, payment) → hapus `id` &
 *     FK `*_id` (customer_id, user_id, order_id, service_id).
 *   - Entity internal (order_items, audit_logs) → PERTAHANKAN `id` & FK-nya
 *     (sesuai proposal). Hanya nested entity publik di dalamnya yang di-sanitize.
 *
 * Semua fungsi idempoten terhadap input null/undefined (pass-through).
 *
 * @module utils/sanitize
 */

/**
 * Buat shallow copy objek tanpa key tertentu.
 * @param {object} obj
 * @param {string[]} keysToRemove
 * @returns {object}
 */
function omit(obj, keysToRemove) {
  if (!obj || typeof obj !== 'object') return obj;
  const remove = new Set(keysToRemove);
  const out = {};
  for (const k of Object.keys(obj)) {
    if (!remove.has(k)) out[k] = obj[k];
  }
  return out;
}

const USER_INTERNAL = ['id'];
const CUSTOMER_INTERNAL = ['id'];
const SERVICE_INTERNAL = ['id'];
const ORDER_INTERNAL = ['id', 'customer_id', 'user_id'];
const PAYMENT_INTERNAL = ['id', 'order_id'];

/**
 * Sanitize single user object (hapus `id`).
 * @param {object} [u]
 * @returns {object}
 */
function sanitizeUser(u) {
  return u ? omit(u, USER_INTERNAL) : u;
}

/**
 * Sanitize single customer object (hapus `id`).
 * @param {object} [c]
 * @returns {object}
 */
function sanitizeCustomer(c) {
  return c ? omit(c, CUSTOMER_INTERNAL) : c;
}

/**
 * Sanitize single service object (hapus `id`).
 * @param {object} [s]
 * @returns {object}
 */
function sanitizeService(s) {
  return s ? omit(s, SERVICE_INTERNAL) : s;
}

/**
 * Sanitize order LIST row (denormalized flat row dari findAll).
 * Hapus `id`, `customer_id`, `user_id`. Pertahankan `code`, `customer_code`,
 * `customer_name`, `user_code`, dll.
 * @param {object} [o]
 * @returns {object}
 */
function sanitizeOrderRow(o) {
  return o ? omit(o, ORDER_INTERNAL) : o;
}

/**
 * Sanitize full order detail (nested). Hapus `id`, `customer_id`, `user_id`
 * dari order utama, lalu recursively sanitize nested public entities:
 * customer, user, items[].service, payments[], audit_logs[].user.
 *
 * `order_items` (items[]) & `audit_logs`[] dipertahankan apa adanya
 * (id + FK tetap, sesuai proposal "internal"), tetapi nested entity publik
 * di dalamnya (service, user) tetap di-sanitize.
 *
 * @param {object} [o]
 * @returns {object}
 */
function sanitizeOrder(o) {
  if (!o) return o;
  const out = omit(o, ORDER_INTERNAL);

  if (out.customer) out.customer = sanitizeCustomer(out.customer);
  if (out.user) out.user = sanitizeUser(out.user);

  if (Array.isArray(out.items)) {
    // order_items internal — keep id/order_id/service_id; sanitize nested service
    out.items = out.items.map((it) => ({
      ...it,
      ...(it.service ? { service: sanitizeService(it.service) } : {}),
    }));
  }

  if (Array.isArray(out.payments)) {
    out.payments = out.payments.map(sanitizePayment);
  }

  if (Array.isArray(out.audit_logs)) {
    // audit_logs internal — keep id/order_id/changed_by; sanitize nested user
    out.audit_logs = out.audit_logs.map((al) => ({
      ...al,
      ...(al.user ? { user: sanitizeUser(al.user) } : {}),
    }));
  }

  return out;
}

/**
 * Sanitize payment object (hapus `id`, `order_id`). Pertahankan field
 * denormalized `order_code`, `order_total_price`, `order_payment_status`
 * (tampilan). Recursively sanitize nested `order` & `customer` bila ada.
 * @param {object} [p]
 * @returns {object}
 */
function sanitizePayment(p) {
  if (!p) return p;
  const out = omit(p, PAYMENT_INTERNAL);
  if (out.order) out.order = sanitizeOrderRow(out.order);
  if (out.customer) out.customer = sanitizeCustomer(out.customer);
  return out;
}

module.exports = {
  sanitizeUser,
  sanitizeCustomer,
  sanitizeService,
  sanitizeOrder,
  sanitizeOrderRow,
  sanitizePayment,
};
