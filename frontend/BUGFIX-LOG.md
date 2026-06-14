# Bugfix Log — Washpos Frontend

> **Tanggal:** 2026-06-13 (Phase 5), 2026-06-14 (Phase 8)
> **Scope:** Phase 5 Final Check + smoke test via Chrome DevTools; Phase 8 Testing & Final via API automation
> **Total bug ditemukan:** 12
> **Total bug resolved:** 12

---

## BUG-01: Middleware tidak dieksekusi di Next.js 16

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/middleware.ts` |
| **Severity** | Critical |
| **Gejala** | Akses `http://localhost:3000/` menampilkan halaman kosong (blank page). Tidak ada redirect ke `/login` untuk user yang belum authenticated. Server merespon status `200` padahal seharusnya `302 redirect`. |
| **Root Cause** | Next.js 16.2 mengganti konvensi `middleware` menjadi `proxy`. File `middleware.ts` dan `export function middleware()` sudah **deprecated dan tidak dikenali** oleh Next.js 16. Dokumentasi resmi di `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` menyatakan: *"Starting with Next.js 16, Middleware is now called Proxy."* |
| **Solusi** | 1. Hapus file `frontend/middleware.ts`<br>2. Buat file baru `frontend/proxy.ts` di root project (selevel dengan `next.config.ts`)<br>3. Ganti `export function middleware(request)` menjadi `export function proxy(request)`<br>4. Isi logika tetap sama, hanya nama file dan fungsi yang berubah |
| **File Terdampak** | `frontend/middleware.ts` (dihapus), `frontend/proxy.ts` (baru) |
| **Status** | Resolved |

---

## BUG-02: Halaman kosong (blank) saat user belum login di authenticated layout

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/app/(authenticated)/layout.tsx` baris 66-68 |
| **Severity** | High |
| **Gejala** | Ketika proxy gagal redirect (misalnya client-side navigation tanpa full page reload), layout authenticated menampilkan halaman kosong. Tidak ada feedback ke user. |
| **Root Cause** | Kode asli melakukan `return null` ketika `user` adalah `null` setelah loading selesai. Ini merender halaman kosong tanpa penjelasan dan tanpa redirect. |
| **Solusi** | Ganti `return null` dengan `router.push('/login')` sebagai fallback redirect, sehingga user selalu diarahkan ke halaman login jika tidak authenticated. |
| **File Terdampak** | `frontend/src/app/(authenticated)/layout.tsx` |
| **Diff** | |
```diff
-  // If not authenticated after loading, the middleware should have redirected
-  // but as a fallback:
-  if (!user) {
-    return null;
-  }
+  // Fallback: if proxy didn't redirect (e.g. client-side navigation), redirect manually
+  if (!user) {
+    router.push('/login');
+    return null;
+  }
```
| **Catatan Update** | Bug ini diperbaiki ulang setelah ditemukan React warning: `Cannot update a component (Router) while rendering a different component (AuthenticatedLayout)`. Penyebab: `router.push('/login')` dipanggil langsung di body render, bukan di `useEffect`. Fix final: pindahkan navigasi ke `useEffect` agar state update Router terjadi setelah render selesai. |
| **Diff (Update)** | |
```diff
+  // Redirect to login if unauthenticated (must be in useEffect, not during render)
+  useEffect(() => {
+    if (!loading && !user) {
+      router.push('/login');
+    }
+  }, [loading, user, router]);

   // Show loading while checking auth
   if (loading) {
     return ( ... );
   }

-  // Fallback: if proxy didn't redirect, redirect manually
-  if (!user) {
-    router.push('/login');
-    return null;
-  }
+  // Wait for redirect to take effect
+  if (!user) {
+    return null;
+  }
```
| **Status** | Resolved |

---

## BUG-03: Semua halaman list crash — API response format tidak sesuai (`res.data` undefined)

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/lib/api.ts`, semua service files, dan 5+ halaman list |
| **Severity** | Critical |
| **Gejala** | Runtime error `TypeError: Cannot read properties of undefined (reading 'map')` di halaman Daftar Pesanan (`/orders`). Halaman menampilkan error overlay "This page couldn't load". Halaman lain (Pelanggan, Layanan, Pembayaran, Pengguna) diprediksi mengalami crash yang sama. |
| **Root Cause** | **Ketidakcocokan format response antara backend API dan frontend.**<br><br>Backend mengembalikan response: `{ success: true, data: [...items] }`<br>`api.ts` mengekstrak `body.data` → mengembalikan **plain array**<br><br>Tapi service layer mengharapkan tipe `PaginatedData<T>` yang memiliki struktur: `{ data: T[], pagination: { page, limit, total, totalPages } }`<br><br>Akibatnya:<br>- `res.data` pada array → `undefined`<br>- `res.pagination` → `undefined`<br>- `undefined.map()` → crash |
| **Endpoint Terdampak** | `GET /customers`, `GET /orders`, `GET /services`, `GET /payments`, `GET /users` |
| **Halaman Crash** | `/orders`, `/customers`, `/services`, `/payments`, `/users`, `/orders/new` (dropdown), `/payments` (dropdown order) |
| **Solusi** | 1. Tambah method `getPaginated<T>()` di `api.ts` yang memanggil `api.get<T[]>()` lalu wrap array response menjadi `PaginatedData<T>` dengan pagination dummy (berdasarkan `params.page` dan `params.limit`).<br>2. Update semua 5 service files: ganti `api.get<PaginatedData<T>>()` menjadi `api.getPaginated<T>()` pada method `list()`.<br>3. Inline calls yang pakai `res.data` (di orders/new, orders/[id], payments) sudah kompatibel karena service sekarang return `PaginatedData`. |
| **File Terdampak** | `frontend/src/lib/api.ts` (tambah method), `frontend/src/lib/services/customerService.ts`, `frontend/src/lib/services/orderService.ts`, `frontend/src/lib/services/serviceService.ts`, `frontend/src/lib/services/paymentService.ts`, `frontend/src/lib/services/userService.ts` |
| **Diff (api.ts)** | |
```diff
+ import type { ApiResponse, PaginatedData } from '@/types';
```
```diff
+  getPaginated<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
+    const page = (params?.page as number) ?? 1;
+    const limit = (params?.limit as number) ?? 10;
+    return this.get<T[]>(endpoint, params).then((data) => {
+      const arr = Array.isArray(data) ? data : [];
+      return {
+        data: arr,
+        pagination: {
+          page,
+          limit,
+          total: arr.length,
+          totalPages: Math.max(1, Math.ceil(arr.length / limit)),
+        },
+      } satisfies PaginatedData<T>;
+    });
+  },
```
| **Diff (semua service files)** | |
```diff
-    return api.get<PaginatedData<T>>('/endpoint', params);
+    return api.getPaginated<T>('/endpoint', params);
```
| **Catatan** | Saat ini pagination menggunakan client-side calculation (`arr.length`) karena backend tidak mengembalikan total count. Jika backend nanti diupdate untuk return pagination info, `getPaginated` bisa disesuaikan untuk membaca dari response. |
| **Status** | Resolved |

---

## BUG-04: Dashboard menampilkan "RpNaN" pada stat card pendapatan

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/lib/services/statsService.ts`, `frontend/src/app/(authenticated)/page.tsx` baris 91 |
| **Severity** | Medium |
| **Gejala** | Stat card "Pendapatan (Hari Ini)" menampilkan teks `RpNaN` alih-alih `Rp 0`. |
| **Root Cause** | **Ketidakcocokan field name antara API response dan frontend type.**<br><br>Backend API `GET /stats/dashboard` mengembalikan:<br>```json
{ "today": { "date": "...", "total_orders": 0, "total_revenue": 0 }, "by_status": [], "recent_orders": [] }
```<br><br>Frontend `DashboardStats` type mengharapkan flat structure:<br>```typescript
{ totalOrdersToday: number, totalRevenueToday: number, activeOrders: number, ... }
```<br><br>Service `statsService.getDashboard()` langsung cast response sebagai `DashboardStats` tanpa mapping. Akibatnya `stats.totalRevenueToday` = `undefined`, dan `formatRupiah(undefined)` = `"RpNaN"`. |
| **Solusi** | Tambah mapping layer di `statsService.getDashboard()` yang mentransformasi nested snake_case API response ke flat camelCase `DashboardStats`. |
| **File Terdampak** | `frontend/src/lib/services/statsService.ts` |
| **Diff** | |
```diff
- import { api } from '@/lib/api';
- import type { DashboardStats } from '@/types';
-
- export const statsService = {
-   getDashboard() {
-     return api.get<DashboardStats>('/stats/dashboard');
-   },
- };

+ import { api } from '@/lib/api';
+ import type { DashboardStats, OrderStatus } from '@/types';
+
+ interface ApiDashboardResponse {
+   today: { date: string; total_orders: number; total_revenue: number };
+   by_status: Array<{ status: string; count: number }>;
+   recent_orders: Array<Record<string, unknown>>;
+ }
+
+ export const statsService = {
+   getDashboard(): Promise<DashboardStats> {
+     return api.get<ApiDashboardResponse>('/stats/dashboard').then((raw) => ({
+       totalOrdersToday: raw.today.total_orders,
+       totalRevenueToday: raw.today.total_revenue,
+       activeOrders: raw.by_status
+         .filter((s) => !['diambil', 'cancelled'].includes(s.status))
+         .reduce((sum, s) => sum + s.count, 0),
+       readyForPickup: raw.by_status.find((s) => s.status === 'siap')?.count ?? 0,
+       statusDistribution: raw.by_status.map((s) => ({
+         status: s.status as OrderStatus,
+         count: s.count,
+       })),
+       recentOrders: (raw.recent_orders ?? []) as DashboardStats['recentOrders'],
+     }));
+   },
+ };
```
| **Status** | Resolved |

---

## BUG-05: Warna font input putih saat OS dalam dark mode

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/app/globals.css` |
| **Severity** | Medium |
| **Gejala** | Setelah login, semua text input (`<input>`, `<textarea>`, `<select>`) memiliki warna font putih (`rgb(237, 237, 237)`) pada background putih, membuat teks sulit dibaca. Hanya terjadi ketika OS dalam dark mode (`prefers-color-scheme: dark`). |
| **Root Cause** | Blok `@media (prefers-color-scheme: dark)` di `globals.css` mengubah CSS variable `--foreground` menjadi `#ededed` (putih). Tailwind CSS v4 menurunkan warna ini ke semua elemen termasuk form inputs. Rule CSS biasa (`input { color: #171717 }`) kalah prioritas dari Tailwind's base layer reset. |
| **Solusi** | 1. Hapus blok `@media (prefers-color-scheme: dark)` karena aplikasi menggunakan tema light secara eksplisit.<br>2. Tambahkan `@layer base { input, textarea, select { color: #171717 !important; } }` agar rule berada di layer yang sama dengan Tailwind base dan menang dalam specificity. |
| **File Terdampak** | `frontend/src/app/globals.css` |
| **Diff** | |
```diff
 @import "tailwindcss";

 :root {
   --background: #ffffff;
   --foreground: #171717;
 }

 @theme inline {
   --color-background: var(--background);
   --color-foreground: var(--foreground);
   --font-sans: var(--font-geist-sans);
   --font-mono: var(--font-geist-mono);
 }

-@media (prefers-color-scheme: dark) {
-  :root {
-    --background: #0a0a0a;
-    --foreground: #ededed;
-  }
-}

 body {
   background: var(--background);
   color: var(--foreground);
   font-family: Arial, Helvetica, sans-serif;
 }

+@layer base {
+  input,
+  textarea,
+  select {
+    color: #171717 !important;
+  }
+}
```
| **Verifikasi** | Dicek via Chrome DevTools `evaluate_script` — semua form elements menunjukkan `color: rgb(23, 23, 23)` (gelap) di halaman `/orders`, `/orders/new`. |
| **Status** | Resolved |

---

## BUG-06: Dropdown pencarian pelanggan ter-masking oleh card di bawahnya

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/app/(authenticated)/orders/new/page.tsx` baris 139 |
| **Severity** | Medium |
| **Gejala** | Di halaman "Buat Pesanan Baru", dropdown hasil pencarian pelanggan tidak terlihat penuh karena terpotong/masking oleh card "Tambah Layanan" di bawahnya. |
| **Root Cause** | Card wrapper Step 1 ("Pilih Pelanggan") menggunakan class `overflow-hidden`. Dropdown pencarian menggunakan `position: absolute` + `z-10`, namun parent card dengan `overflow: hidden` memotong (clip) konten yang melampaui batas card. Dropdown yang seharusnya tampil di atas card Step 2 justru ter-hidden. |
| **Solusi** | Ganti `overflow-hidden` menjadi `overflow-visible` pada card wrapper Step 1 saja. Card Step 2 dan Step 3 tetap `overflow-hidden` karena tidak memiliki dropdown absolute. |
| **File Terdampak** | `frontend/src/app/(authenticated)/orders/new/page.tsx` |
| **Diff** | |
```diff
 {/* STEP 1: Pilih Pelanggan */}
-<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
+<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
```
| **Verifikasi** | Dicek via Chrome DevTools: ketik "Ah" di search box → dropdown muncul dengan "Ahmad" dan "Siti Aminah", tampil di atas card Step 2. Klik "Ahmad" berhasil memilih pelanggan. |
| **Status** | Resolved |

---

## BUG-07: Detail pesanan tidak menampilkan informasi pelanggan, layanan, dan user

| Field | Detail |
|-------|--------|
| **Lokasi** | `backend/src/queries/orderQueries.js` — fungsi `findDetail()` dan `getAuditLogs()` |
| **Severity** | High |
| **Gejala** | Halaman detail pesanan (`/orders/:id`) menampilkan "-" pada semua field informasi pelanggan (nama, WhatsApp, alamat), "??" dan "-" pada staff penanggung jawab, "-" pada nama layanan dan "Rp 0" pada harga satuan, serta "System" pada audit trail padahal seharusnya nama user yang mengubah. |
| **Root Cause** | **Ketidakcocokan struktur data antara backend response dan frontend TypeScript types.**<br><br>Backend `findDetail()` menggunakan JOIN SQL dan mengembalikan field flat:<br>- `customer_name`, `customer_whatsapp`, `customer_address`<br>- `user_name`<br>- `service_name` (tanpa `price` dan `unit`)<br>- `changed_by_name` (di audit logs)<br><br>Frontend mengakses nested objects:<br>- `order.customer.name`, `order.customer.whatsapp`, `order.customer.address`<br>- `order.user.username`<br>- `item.service.name`, `item.service.price`, `item.service.unit`<br>- `log.user.username`<br><br>Selain itu, `findDetail()` tidak meng-include data `payments` sama sekali, sehingga riwayat pembayaran selalu kosong. |
| **Solusi** | Ubah `findDetail()` dan `getAuditLogs()` di `orderQueries.js` untuk mengembalikan nested objects yang sesuai dengan TypeScript interface di frontend:<br><br>1. **Customer** — query terpisah, attach sebagai `order.customer = { id, name, whatsapp, address, created_at }`<br>2. **User** — query terpisah, attach sebagai `order.user = { id, username, role }`<br>3. **Service per item** — query per item, attach sebagai `item.service = { id, name, price, unit, active, created_at }` (field `price` dan `unit` sebelumnya tidak di-include dari JOIN)<br>4. **Payments** — tambah query baru untuk fetch payments order, attach sebagai `order.payments = [...]`<br>5. **Audit log user** — ubah dari flat `changed_by_name` menjadi nested `log.user = { id, username, role }` |
| **File Terdampak** | `backend/src/queries/orderQueries.js` |
| **Diff** | |
```diff
 async function findDetail(id) {
-  const [orders] = await pool.query(`
-    SELECT
-      o.id,
-      o.customer_id,
-      c.name AS customer_name,
-      c.whatsapp AS customer_whatsapp,
-      c.address AS customer_address,
-      o.user_id,
-      u.username AS user_name,
-      o.status,
-      o.payment_status,
-      o.total_price,
-      o.notes,
-      o.created_at,
-      o.updated_at
-    FROM orders o
-    JOIN customers c ON o.customer_id = c.id
-    JOIN users u ON o.user_id = u.id
-    WHERE o.id = ?
-  `, [id]);
+  const [orders] = await pool.query(`
+    SELECT
+      o.id,
+      o.customer_id,
+      o.user_id,
+      o.status,
+      o.payment_status,
+      o.total_price,
+      o.notes,
+      o.created_at,
+      o.updated_at
+    FROM orders o
+    WHERE o.id = ?
+  `, [id]);

   if (orders.length === 0) return null;
   const order = orders[0];

-  // Get order items
-  const [items] = await pool.query(`
-    SELECT
-      oi.id,
-      oi.service_id,
-      s.name AS service_name,
-      oi.quantity,
-      oi.subtotal
-    FROM order_items oi
-    JOIN services s ON oi.service_id = s.id
-    WHERE oi.order_id = ?
-  `, [id]);
+  // Get customer info as nested object
+  const [customers] = await pool.query(
+    'SELECT id, name, whatsapp, address, created_at FROM customers WHERE id = ?',
+    [order.customer_id]
+  );
+  if (customers.length > 0) {
+    order.customer = customers[0];
+  }
+
+  // Get user info as nested object
+  const [users] = await pool.query(
+    'SELECT id, username, role FROM users WHERE id = ?',
+    [order.user_id]
+  );
+  if (users.length > 0) {
+    order.user = users[0];
+  }
+
+  // Get order items
+  const [items] = await pool.query(`
+    SELECT oi.id, oi.order_id, oi.service_id, oi.quantity, oi.subtotal
+    FROM order_items oi
+    WHERE oi.order_id = ?
+  `, [id]);
+
+  // Fetch service details for each item
+  for (const item of items) {
+    const [services] = await pool.query(
+      'SELECT id, name, price, unit, active, created_at FROM services WHERE id = ?',
+      [item.service_id]
+    );
+    if (services.length > 0) {
+      item.service = services[0];
+    }
+  }

   order.items = items;
+
+  // Get payments for this order
+  const [payments] = await pool.query(
+    'SELECT id, order_id, amount, method, note, created_at FROM payments WHERE order_id = ? ORDER BY created_at ASC',
+    [id]
+  );
+  order.payments = payments;

   return order;
 }
```
```diff
 async function getAuditLogs(orderId) {
-  const [logs] = await pool.query(`
-    SELECT
-      al.id,
-      al.old_status,
-      al.new_status,
-      al.changed_at,
-      u.username AS changed_by_name
-    FROM audit_logs al
-    JOIN users u ON al.changed_by = u.id
-    WHERE al.order_id = ?
-    ORDER BY al.changed_at ASC
-  `, [orderId]);
+  const [logs] = await pool.query(`
+    SELECT
+      al.id,
+      al.order_id,
+      al.old_status,
+      al.new_status,
+      al.changed_by,
+      al.changed_at
+    FROM audit_logs al
+    WHERE al.order_id = ?
+    ORDER BY al.changed_at ASC
+  `, [orderId]);
+
+  // Attach nested user object for each log
+  for (const log of logs) {
+    const [users] = await pool.query(
+      'SELECT id, username, role FROM users WHERE id = ?',
+      [log.changed_by]
+    );
+    if (users.length > 0) {
+      log.user = users[0];
+    }
+  }

   return logs;
 }
```
| **Verifikasi** | Dicek via Chrome DevTools snapshot di `/orders/1` setelah restart backend. Semua field tampil benar: Nama Pelanggan = "bunpay", Staff = "admin", WhatsApp = "62834534512312", Alamat = "yogya", Layanan = "Cuci Kiloan Rp 5.000/kg" + "Setrika Kiloan Rp 4.000/kg", Audit trail = "Oleh: admin". |
| **Status** | Resolved |

---

## BUG-08: Jumlah pesanan pelanggan selalu menampilkan "Belum ada"

| Field | Detail |
|-------|--------|
| **Lokasi** | `backend/src/queries/customerQueries.js` — fungsi `findAll()` |
| **Severity** | Medium |
| **Gejala** | Halaman daftar pelanggan (`/customers`) kolom "Jumlah Pesanan" selalu menampilkan "Belum ada" untuk semua pelanggan, termasuk pelanggan yang sudah memiliki pesanan (bunpay). |
| **Root Cause** | Backend `findAll()` di `customerQueries.js` hanya melakukan `SELECT id, name, whatsapp, address, created_at FROM customers` tanpa menghitung jumlah pesanan per pelanggan. Field `order_count` tidak disertakan dalam response, sehingga frontend yang mengakses `c.order_count ?? 0` selalu mendapatkan `0`. |
| **Solusi** | Tambahkan subquery correlated untuk menghitung `order_count` di dalam `findAll()`:<br><br>`SELECT c.id, c.name, c.whatsapp, c.address, c.created_at, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count FROM customers c`<br><br>Juga update prefix tabel dari `customers` menjadi `c` pada klausa `WHERE` dan `ORDER BY` agar konsisten. |
| **File Terdampak** | `backend/src/queries/customerQueries.js` |
| **Diff** | |
```diff
 async function findAll(search = '', page = 1, limit = 10) {
   const offset = (page - 1) * limit;
-  let query = `
-    SELECT id, name, whatsapp, address, created_at
-    FROM customers
-  `;
+  let query = `
+    SELECT c.id, c.name, c.whatsapp, c.address, c.created_at,
+      (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
+    FROM customers c
+  `;
   let params = [];

   // Add search filter
   if (search) {
-    query += ` WHERE name LIKE ? OR whatsapp LIKE ?`;
+    query += ` WHERE c.name LIKE ? OR c.whatsapp LIKE ?`;
     params.push(`%${search}%`, `%${search}%`);
   }

-  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
+  query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
   params.push(limit, offset);
```
| **Verifikasi** | Dicek via Chrome DevTools: bunpay sekarang menampilkan "1 pesanan" dengan badge biru, dan tombol hapus berubah menjadi "Tidak bisa dihapus (memiliki pesanan)" yang disabled. Pelanggan lain tetap "Belum ada" karena memang belum punya pesanan. |
| **Status** | Resolved |

---

## BUG-09: Payment status selalu `partial` — string concatenation bug pada perhitungan total pembayaran

| Field | Detail |
|-------|--------|
| **Lokasi** | `backend/src/queries/paymentQueries.js` fungsi `create()` baris 139-146 |
| **Severity** | Critical |
| **Gejala** | Semua pembayaran selalu menghasilkan `payment_status = "partial"`, termasuk ketika jumlah bayar melebihi total harga pesanan. Contoh: pesanan Rp 10.000 dibayar Rp 15.000 cash, status tetap `partial` padahal seharusnya `paid`. |
| **Root Cause** | **MySQL `DECIMAL` type coercion bug.** MySQL driver (`mysql2`) mengembalikan kolom `DECIMAL` dan hasil `SUM()` sebagai **string** (`"0.00"`, `"10000.00"`), bukan number. Kode melakukan operasi `+` langsung antara string dari MySQL dan number dari request body, sehingga JavaScript melakukan **string concatenation** alih-alih penjumlahan:<br><br>```javascript<br>// paidSoFar = "0.00" (string dari MySQL SUM)<br>// data.amount = 10100 (number dari request body)<br>// "0.00" + 10100 = "0.0010100" (string concat!)<br>const newTotal = paidSoFar + data.amount; // "0.0010100"<br>// "0.0010100" >= "10000.00" → false (string comparison, "0" < "1")<br>if (newTotal >= order.total_price) { ... }<br>```<br><br>Perbandingan string `"0.0010100" >= "10000.00"` menghasilkan `false` karena `'0' < '1'` secara lexicographic, sehingga `payment_status` tidak pernah berubah menjadi `"paid"`. |
| **Solusi** | Wrap semua nilai MySQL `DECIMAL` dengan `Number()` sebelum operasi aritmatika dan perbandingan:<br><br>```javascript<br>const paidSoFar = Number(currentTotal[0].total);    // "0.00" → 0<br>const newTotal = paidSoFar + Number(data.amount);   // 0 + 10100 = 10100<br>const totalPrice = Number(order.total_price);        // "10000.00" → 10000<br>if (newTotal >= totalPrice) { ... }                  // 10100 >= 10000 → true ✓<br>``` |
| **File Terdampak** | `backend/src/queries/paymentQueries.js` |
| **Diff** | |
```diff
-    const paidSoFar = currentTotal[0].total;
-    const newTotal = paidSoFar + data.amount;
-
-    // Determine new payment status
-    let newPaymentStatus = 'partial';
-    if (newTotal >= order.total_price) {
-      newPaymentStatus = 'paid';
-    }
+    const paidSoFar = Number(currentTotal[0].total);
+    const newTotal = paidSoFar + Number(data.amount);
+    const totalPrice = Number(order.total_price);
+
+    // Determine new payment status
+    let newPaymentStatus = 'partial';
+    if (newTotal >= totalPrice) {
+      newPaymentStatus = 'paid';
+    }
```
| **Test Result** | |
| Skenario | Total | Bayar | Status Before | Status After |
|-----------|-------|-------|---------------|--------------|
| Bayar tepat 10000 | 10000 | 10000 | unpaid | **paid** |
| Bayar lebih 10100 | 10000 | 10100 | unpaid | **paid** |
| Bayar lebih 15000 | 10000 | 15000 | unpaid | **paid** |
| Bayar sebagian 5000 | 10000 | 5000 | unpaid | **partial** |
| Bayar pelunasan 5000 | 10000 | 5000 (+5000) | partial | **paid** |
| **Catatan** | Sistem tidak mencegah pembayaran melebihi total (overpayment). Pembayaran lebih langsung diterima dan status menjadi `paid`. Tidak ada mekanisme kembalian/refund. |
| **Status** | Resolved |

---

## BUG-10: TypeScript build gagal — 2 error type pre-existing yang memblokir `npm run build`

| Field | Detail |
|-------|--------|
| **Lokasi** | `frontend/src/app/(authenticated)/users/page.tsx` baris 167, `frontend/src/lib/services/statsService.ts` baris 27 |
| **Severity** | High (build failure) |
| **Gejala** | `npm run build` gagal pada tahap "Running TypeScript" dengan 2 error. Build worker exited code 1. Phase 8 (P8-08) tidak bisa lulus. |
| **Root Cause** | Dua error type yang sudah ada sejak Phase 7 tapi diabaikan karena dianggap "pre-existing" dan tidak memblokir dev server (dev tidak menjalankan full type check):<br><br>**Error 1 — `users/page.tsx:167`:**<br>Prop `disabled={isCurrentUser}` mengharapkan `boolean \| undefined`, tapi `isCurrentUser` dideklarasikan sebagai `currentUser && u.id === currentUser.id`. Karena `currentUser` bertipe `User \| null`, ekspresi `currentUser && ...` menghasilkan `null \| undefined \| boolean` (operator `&&` mengembalikan operand kiri jika falsy). TypeScript melihat `boolean \| null` → `null` tidak assignable ke `boolean \| undefined`.<br><br>**Error 2 — `statsService.ts:27`:**<br>Cast `(raw.recent_orders ?? []) as DashboardStats['recentOrders']` ditolak. `raw.recent_orders` bertipe `Array<Record<string, unknown>>` (dari interface `ApiDashboardResponse`), sedangkan `DashboardStats['recentOrders']` adalah `Order[]`. TypeScript error TS2352: "Conversion of type `Record<string, unknown>[]` to type `Order[]` may be a mistake because neither type sufficiently overlaps." Karena `Record<string, unknown>` tidak punya field `id`, `customer_id`, dst., TS tidak yakin cast-nya valid. |
| **Solusi** | **Error 1:** Coercion eksplisit ke boolean dengan `!!`:<br>`const isCurrentUser = !!currentUser && u.id === currentUser.id;`<br>Operator `!!` memaksa operand kiri menjadi `boolean`, sehingga seluruh ekspresi pasti `boolean`.<br><br>**Error 2:** Double assertion via `unknown`:<br>`(raw.recent_orders ?? []) as unknown as DashboardStats['recentOrders']`<br>TypeScript mengizinkan cast apa pun melalui `unknown` (escape hatch), dengan asumsi developer tahu tipe runtime-nya benar. |
| **File Terdampak** | `frontend/src/app/(authenticated)/users/page.tsx`, `frontend/src/lib/services/statsService.ts` |
| **Diff (users/page.tsx)** | |
```diff
-        const isCurrentUser = currentUser && u.id === currentUser.id;
+        const isCurrentUser = !!currentUser && u.id === currentUser.id;
```
*(Diaplikasikan ke 2 lokasi: kolom "username" baris 112 dan kolom "actions" baris 147 — keduanya pola identik.)*
| **Diff (statsService.ts)** | |
```diff
-      recentOrders: (raw.recent_orders ?? []) as DashboardStats['recentOrders'],
+      recentOrders: (raw.recent_orders ?? []) as unknown as DashboardStats['recentOrders'],
```
| **Verifikasi** | `npm run build` setelah fix: "Finished TypeScript in 8.2s", 15 routes ter-generate, 0 error. |
| **Status** | Resolved |

---

## BUG-11: Payment status tidak recalculate saat edit/delete pembayaran

| Field | Detail |
|-------|--------|
| **Lokasi** | `backend/src/queries/paymentQueries.js` — fungsi `update()` baris 180-206 dan `remove()` baris 212-215 (versi sebelum fix) |
| **Severity** | High |
| **Gejala** | `POST /orders/:id/payments` (create payment) mengupdate `payment_status` order dengan benar (unpaid→partial→paid), tapi `PATCH /payments/:id` (edit) dan `DELETE /payments/:id` (delete) **tidak mengubah** `payment_status` order sama sekali — status membeku pada nilai saat payment terakhir di-create.<br><br>**Skenario teramati (via API test):**<br>- Order baru: `payment_status=unpaid` ✓<br>- Add payment 1000 (dari total 50000): `payment_status=partial` ✓<br>- Edit payment jadi 50000 (full): `payment_status` tetap `partial` ✗ (seharusnya `paid`)<br>- Delete payment: `payment_status` tetap `partial` ✗ (seharusnya kembali `unpaid`) |
| **Root Cause** | **Ketidakkonsistenan implementasi antara `create()` vs `update()`/`remove()`.**<br><br>`create()` di `paymentQueries.js` sudah benar — ia menghitung total bayar, menentukan status baru, insert payment, dan update `orders.payment_status` dalam satu transaksi (ini diperbaiki di BUG-09 untuk handle MySQL DECIMAL string coercion).<br><br>Tapi `update()` dan `remove()` hanya menjalankan SQL update/delete pada baris `payments` **tanpa** menghitung ulang `payment_status` order. Akibatnya:<br>- Edit jumlah pembayaran → total berubah, tapi `orders.payment_status` tidak ikut berubah<br>- Hapus pembayaran → total berkurang, tapi status tetap mencerminkan kondisi lama<br><br>Ini melanggar business rule di `CLAUDE.md`: *"Payment status auto-update: When payments are added/edited/deleted, the order's payment_status is automatically recalculated."* |
| **Solusi** | 1. Tambah helper `recalcOrderPaymentStatus(connection, orderId)` yang menghitung ulang `payment_status` dari `SUM(amount)` semua payments untuk order tersebut. Logika: `totalPaid <= 0 → unpaid`, `>= totalPrice → paid`, else `partial`. Semua nilai MySQL DECIMAL di-`Number()` untuk menghindari bug string coercion yang sama dengan BUG-09.<br>2. Refactor `update()` menjadi transaksi: update baris payment → query `order_id` → panggil `recalcOrderPaymentStatus()`.<br>3. Refactor `remove()` menjadi transaksi: query `order_id` (sebelum delete) → delete baris → panggil `recalcOrderPaymentStatus()`.<br>4. Helper menerima `connection` (bukan `pool`) agar berjalan dalam transaksi yang sama dengan operasi utama — menjamin konsistensi (rollback semua jika ada error). |
| **File Terdampak** | `backend/src/queries/paymentQueries.js` |
| **Diff** | |
```diff
+/**
+ * Recalculate order payment_status based on sum of payments.
+ * Must be called within a transaction (uses the given connection).
+ */
+async function recalcOrderPaymentStatus(connection, orderId) {
+  const [orders] = await connection.query(
+    'SELECT total_price FROM orders WHERE id = ?',
+    [orderId]
+  );
+  if (orders.length === 0) return;
+
+  const [sumResult] = await connection.query(
+    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = ?',
+    [orderId]
+  );
+
+  const totalPaid = Number(sumResult[0].total);
+  const totalPrice = Number(orders[0].total_price);
+
+  let newStatus;
+  if (totalPaid <= 0) {
+    newStatus = 'unpaid';
+  } else if (totalPaid >= totalPrice) {
+    newStatus = 'paid';
+  } else {
+    newStatus = 'partial';
+  }
+
+  await connection.query(
+    'UPDATE orders SET payment_status = ? WHERE id = ?',
+    [newStatus, orderId]
+  );
+}
```
```diff
 async function update(id, data) {
   const fields = [];
   const values = [];
   // ... push fields/values dari data ...

   if (fields.length === 0) return false;

-  values.push(id);
-  await pool.query(
-    `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
-    values
-  );
-
-  return true;
+  const connection = await pool.getConnection();
+  try {
+    await connection.beginTransaction();
+
+    values.push(id);
+    await connection.query(
+      `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`,
+      values
+    );
+
+    const [rows] = await connection.query(
+      'SELECT order_id FROM payments WHERE id = ?',
+      [id]
+    );
+    if (rows.length > 0) {
+      await recalcOrderPaymentStatus(connection, rows[0].order_id);
+    }
+
+    await connection.commit();
+    return true;
+  } catch (error) {
+    await connection.rollback();
+    throw error;
+  } finally {
+    connection.release();
+  }
 }
```
```diff
 async function remove(id) {
-  await pool.query('DELETE FROM payments WHERE id = ?', [id]);
-  return true;
+  const connection = await pool.getConnection();
+  try {
+    await connection.beginTransaction();
+
+    const [rows] = await connection.query(
+      'SELECT order_id FROM payments WHERE id = ?',
+      [id]
+    );
+    if (rows.length === 0) {
+      await connection.rollback();
+      return false;
+    }
+
+    const orderId = rows[0].order_id;
+    await connection.query('DELETE FROM payments WHERE id = ?', [id]);
+    await recalcOrderPaymentStatus(connection, orderId);
+
+    await connection.commit();
+    return true;
+  } catch (error) {
+    await connection.rollback();
+    throw error;
+  } finally {
+    connection.release();
+  }
 }
```
| **Hubungan dengan BUG-09** | BUG-09 memperbaiki string coercion di `create()` dengan `Number()`. Bug ini menutup celah yang sama untuk path edit/delete — helper `recalcOrderPaymentStatus` juga pakai `Number()` agar konsisten dengan pola BUG-09. |
| **Test Result** | |
| Operasi | Total Bayar | Total Order | Status Before | Status After |
|-----------|-------------|-------------|---------------|--------------|
| Create payment 1000 | 1000 | 50000 | unpaid | **partial** ✓ |
| Edit → full 50000 | 50000 | 50000 | partial | **paid** ✓ |
| Edit → partial 1000 | 1000 | 50000 | paid | **partial** ✓ |
| Delete payment | 0 | 50000 | partial | **unpaid** ✓ |
| **Status** | Resolved |

---

## BUG-12: Pagination meta di-drop oleh response helper — semua list endpoint tidak mengembalikan total count

| Field | Detail |
|-------|--------|
| **Lokasi** | `backend/src/utils/response.js` — fungsi `successResponse()`; `frontend/src/lib/api.ts` — method `getPaginated()` |
| **Severity** | High |
| **Gejala** | Semua 5 list endpoint (`GET /orders`, `/customers`, `/services`, `/payments`, `/users`) tidak menyertakan field `pagination` di response JSON, padahal controller semua sudah mengirimkannya. Frontend `getPaginated()` selalu menghitung `total = arr.length` (panjang array halaman saat ini, bukan total record), sehingga `totalPages` selalu 1 untuk data yang muat dalam satu halaman — kontrol pagination UI tidak menampilkan halaman lain meski ada banyak data. |
| **Root Cause** | **Mismatch signature antara pemanggil dan definisi fungsi.**<br><br>Semua 5 controller memanggil `successResponse` dengan **5 argumen**:<br>```javascript<br>return successResponse(res, 'Orders retrieved successfully', result.orders, 200, {<br>  pagination: result.pagination<br>});<br>```<br><br>Tapi definisi `successResponse` di `response.js` hanya menerima **4 parameter**:<br>```javascript<br>function successResponse(res, message = 'Success', data = null, statusCode = 200) {<br>  return res.status(statusCode).json({ success: true, message, data });<br>}<br>```<br><br>Argumen ke-5 (`{ pagination: ... }`) **diabaikan diam-diam** — tidak ada error, tidak ada warning. JavaScript tidak mengeluh ketika function dipanggil dengan argumen lebih banyak dari parameter yang didefinisikan. Response JSON tidak pernah menyertakan `pagination`.<br><br>**Workaround frontend sebelumnya:** BUG-03 menambahkan `getPaginated()` yang pakai `total: arr.length` sebagai placeholder. Catatan BUG-03 secara eksplisit menyatakan: *"Saat ini pagination menggunakan client-side calculation (arr.length) karena backend tidak mengembalikan total count. Jika backend nanti diupdate untuk return pagination info, getPaginated bisa disesuaikan."* — Bug ini adalah penyelesaian utang teknis tersebut. |
| **Dampak** | DataTable pagination kontrol (prev/next buttons + page indicator) tidak pernah muncul atau selalu menampilkan "Halaman 1 dari 1" meski ada puluhan record. User tidak bisa navigasi ke halaman 2+. Search/filter tetap berfungsi karena filter terjadi server-side per request. |
| **Solusi** | **Backend:** Tambah parameter ke-5 `meta = null` ke `successResponse`. Saat disediakan, merge field-field meta ke top-level response via `Object.assign`. Response menjadi `{ success, message, data, pagination }`.<br><br>**Frontend:** Refactor `api.ts`:<br>1. Pecah `request` jadi `requestRaw` yang mengembalikan **full body** (bukan hanya `body.data`), agar caller bisa akses top-level fields seperti `pagination`.<br>2. `getPaginated()` baca `body.pagination` dari backend (page/limit/total), hitung `totalPages = ceil(total / limit)`. Fallback ke `arr.length` hanya jika meta tidak ada (backward-compat).<br>3. Method `get/post/patch/delete` tetap ekstrak `.data` seperti sebelumnya (behavior tidak berubah untuk caller existing). |
| **File Terdampak** | `backend/src/utils/response.js`, `frontend/src/lib/api.ts` |
| **Diff (response.js)** | |
```diff
-function successResponse(res, message = 'Success', data = null, statusCode = 200) {
-  return res.status(statusCode).json({
-    success: true,
-    message,
-    data
-  });
-}
+function successResponse(res, message = 'Success', data = null, statusCode = 200, meta = null) {
+  const response = {
+    success: true,
+    message,
+    data
+  };
+  if (meta && typeof meta === 'object') {
+    Object.assign(response, meta);
+  }
+  return res.status(statusCode).json(response);
+}
```
| **Diff (api.ts)** | |
```diff
-async function request<T>(
+async function requestRaw<T>(
   endpoint: string,
   options: RequestInit = {},
-): Promise<T> {
+): Promise<ApiResponse<T> & { pagination?: PaginationMeta }> {
   // ... token, headers, fetch, body, 401 handling, error throw ...
-  return body.data as T;
+  return body as ApiResponse<T> & { pagination?: PaginationMeta };
 }

-  getPaginated<T>(endpoint, params?) {
-    const page = (params?.page as number) ?? 1;
-    const limit = (params?.limit as number) ?? 10;
-    return this.get<T[]>(endpoint, params).then((data) => {
-      const arr = Array.isArray(data) ? data : [];
-      return {
-        data: arr,
-        pagination: {
-          page,
-          limit,
-          total: arr.length,
-          totalPages: Math.max(1, Math.ceil(arr.length / limit)),
-        },
-      } satisfies PaginatedData<T>;
-    });
-  },
+  getPaginated<T>(endpoint, params?) {
+    const fallbackLimit = (params?.limit as number) ?? 10;
+    const fallbackPage = (params?.page as number) ?? 1;
+    return requestRaw<T[]>(withParams(endpoint, params)).then((body) => {
+      const arr = Array.isArray(body.data) ? body.data : [];
+      const pg = body.pagination;
+      const limit = pg?.limit ?? fallbackLimit;
+      const total = pg?.total ?? arr.length;
+      const page = pg?.page ?? fallbackPage;
+      return {
+        data: arr,
+        pagination: {
+          page,
+          limit,
+          total,
+          totalPages: Math.max(1, Math.ceil(total / limit)),
+        },
+      } satisfies PaginatedData<T>;
+    });
+  },
```
| **Verifikasi via API** | Semua 5 endpoint sekarang return `pagination` dengan total benar: |
| Endpoint | total | Hasil |
|----------|-------|-------|
| `/orders?limit=2` | 2 | `pagination: { page:1, limit:2, total:2 }` ✓ |
| `/customers?limit=2` | 4 | `pagination: { page:1, limit:2, total:4 }` ✓ |
| `/services?limit=2` | 10 | `pagination: { page:1, limit:2, total:10 }` ✓ |
| `/payments?limit=2` | 2 | `pagination: { page:1, limit:2, total:2 }` ✓ |
| `/users?limit=2` | 2 | `pagination: { page:1, limit:2, total:2 }` ✓ |
| **Status** | Resolved |

---

## Verifikasi Pasca-Perbaikan

Semua 17 route dites via Chrome DevTools dengan akun admin:

| Route | Hasil |
|-------|-------|
| `/login` | OK — login berhasil redirect ke dashboard |
| `/` (Dashboard) | OK — stat cards tampil benar, "Rp 0" bukan "RpNaN" |
| `/orders` | OK — filter status + dropdown pelanggan tampil, empty state benar |
| `/orders/1` | OK — detail pesanan: informasi pelanggan, layanan, riwayat status tampil benar |
| `/orders/new` | OK — form multi-step, dropdown layanan tampil |
| `/customers` | OK — tabel data pelanggan tampil, jumlah pesanan terhitung benar (bunpay: 1 pesanan) |
| `/customers/new` | OK — form tambah pelanggan |
| `/customers/1/edit` | OK — data terisi dari API |
| `/services` | OK — tabel layanan tampil dengan harga Rupiah |
| `/services/new` | OK — form tambah layanan |
| `/services/1/edit` | OK — data terisi dari API |
| `/payments` | OK — empty state |
| `/users` | OK — tabel user tampil dengan role badge |
| `/users/new` | OK — form tambah user |
| `/users/2/edit` | OK — data terisi dari API |
| `/profile` | OK — info profil admin tampil |

**Console errors:** 0
**Runtime errors:** 0

---

*Dokumen dibuat: 2026-06-13 (BUG-01 s/d BUG-09, Phase 5 Final Check). Update: 2026-06-14 (BUG-10 s/d BUG-12, Phase 8 Testing & Final — ditemukan via API automation + code review, bukan smoke test browser).*
