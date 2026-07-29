---
title: "Laporan Bug & Daftar Perbaikan — Washpos"
date: 2026-07-26
project: Washpos (Laundry/POS Management System)
tim: "TIM 03"
stack: "Backend Express+MySQL 8, Frontend Next.js 16+React 19+TS+Tailwind v4"
dibuat_oleh: "Audit & pengujian otomatis (Claude Code)"
status: "Aktif - untuk perbaikan"
---

# 📋 Laporan Bug & Daftar Perbaikan — Washpos

> Dokumen ini merangkum **seluruh** error, bug, celah keamanan, dan kekurangan yang ditemukan
> selama proses **pembacaan kode + pengujian langsung** (unit test, integration test, build,
> live API via curl, dan browser test dengan Chrome asli). Diurutkan berdasarkan **prioritas perbaikan**.

---

## 📊 Ringkasan Eksekutif

| Aspek | Hasil |
|-------|-------|
| Unit test backend | ✅ 71/71 lulus |
| `next build` frontend | ✅ Berhasil (16 route, TS lulus) |
| `eslint` frontend | ⚠️ 12 error, 11 warning |
| `npm audit` backend | ⚠️ 4 vulnerability (1 low, 3 high) |
| `npm audit` frontend | ⚠️ 5 high |
| Tes live API (curl) | ⚠️ 3 bug terkonfirmasi |
| Tes browser (Chrome) | ✅ 0 error runtime di 8 halaman utama |
| **Verdict** | Fondasi arsitektur bagus, **ada beberapa bug logika & celah keamanan yang perlu ditambal** |

**Total temuan: 100+ item** (12 P0/P1 kritis, ~30 P2, sisanya P3/polish).

---

## 🚨 CARA MEMBACA PRIORITAS

- **P0 — Kritis**: aplikasi rusak / kebocoran data / tidak bisa dipakai. Wajib duluan.
- **P1 — Tinggi**: bug correctness & keamanan yang berdampak nyata ke user/bisnis.
- **P2 — Sedang**: robustness, konsistensi, aksesibilitas, testability.
- **P3 — Rendah**: polish, fitur tambahan, cleanup, dokumentasi.

---

# 🔴 P0 — KRITIS (kerjakan pertama)

## P0-1. Fresh install: aplikasi total rusak, login selalu gagal
- **Lokasi**: `backend/docker-compose.yml:15-17`, `backend/migrations/`, `backend/src/queries/userQueries.js:20`
- **Gejala**: instalasi baru sesuai README → `POST /auth/login` selalu `500 "Login failed"`.
- **Root cause** (terkonfirmasi live):
  - `docker-compose.yml` me-mount seluruh folder `./migrations` ke `/docker-entrypoint-initdb.d`.
  - MySQL **hanya menjalankan init script saat data-directory kosong**. Volume `mysql_data` persisten → setelah `001_init.sql` pernah jalan, penambahan `002` & `003` **tidak pernah di-apply** walau file ter-mount.
  - Kode aplikasi hard-depend pada kolom `code` (dari `002`): `findByUsername` SELECT `id, code, username, ...` → tanpa kolom itu → error `Unknown column 'code'` → login throw → 500.
- **Bukti live**: `SELECT SHOW COLUMNS FROM users LIKE 'code'` → kosong; log server: `ER_BAD_FIELD_ERROR Unknown column 'code'`.
- **Status di tes ini**: sudah saya tambal manual (apply 002 + backfill + 003) supaya bisa ditest.
- **Saran perbaikan**:
  1. Pakai migration runner sungguhan (mis. `node-mysql-migrate` / `db-migrate` / Knex) yang melacak skema & apply migration tertunda ke DB eksisting.
  2. Atau: jalankan `002` + `scripts/backfillCodes.js` + `003` sebagai **satu skrip post-init** terurut, otomatis saat server start (idempotent).
  3. Tambah health-check di startup yang **fail-fast** jika kolom `code` tidak ada.

## P0-2. Isolasi pegawai BOCOR di modul Payment
- **Lokasi**: `backend/src/controllers/paymentController.js` (list/detail/createForOrder)
- **Gejala**: pegawai seharusnya hanya lihat data miliknya (README baris 301-303), tapi **bisa lihat SEMUA payment milik semua pegawai**.
- **Bukti live** (terkonfirmasi):
  - pegawai1 lihat `/orders` → 1 order (miliknya) ✅ isolasi order OK
  - pegawai1 lihat `/payments` → **7 payment (semua pegawai)** ❌
- **Root cause**: `orderController` memfilter `user_id`, tapi `paymentController` **tidak**. Tidak ada JOIN/cek kepemilikan order.
- **Saran perbaikan**: di list/detail/create, filter `payments` berdasarkan `orders.user_id = req.user.id` untuk role pegawai (sama seperti pola di `orderController.js:110,144`).

## P0-3. Arsitektur autentikasi frontend rentan (XSS + tamper)
- **Lokasi**: `frontend/src/lib/auth.ts:4-21,38`, `frontend/src/proxy.ts:27,46-56`
- **Gejala**:
  1. JWT disimpan di `localStorage` → **rentan XSS** (script injeksi bisa curi token).
  2. Token diduplikasi ke cookie non-httpOnly `washpos_token`.
  3. Cookie `washpos_role` dipakai proxy untuk gate route admin → **bisa di-tamper client**: `document.cookie='washpos_role=admin'` membuat halaman admin ter-render (backend masih tolak via JWT, tapi shell/label bocor).
- **Saran perbaikan**:
  1. Pindahkan JWT ke **httpOnly cookie** yang di-set backend (`Set-Cookie`, `HttpOnly; Secure; SameSite=Strict`).
  2. Hapus duplikasi token/role ke cookie JS-readable.
  3. Ganti cek role di `proxy.ts` dengan **decode JWT server-side**, bukan baca cookie role.

## P0-4. CORS terlalu terbuka + credensial
- **Lokasi**: `backend/server.js:19-22`
- **Gejala**: `origin: process.env.CORS_ORIGIN || '*'` digabung `credentials: true`. Saat `CORS_ORIGIN` kosong, header `Access-Control-Allow-Origin` memantik Origin request apa pun + `Allow-Credentials: true` → situs mana pun bisa kirim request ber-credensial.
- **Saran perbaikan**: pakai **allowlist eksplisit** ATAU `credentials: false`. Jangan pernah `*` + `credentials: true` bersamaan.

---

# 🟠 P1 — TINGGI

## P1-1. Respon 204 tapi berisi body JSON (melanggar HTTP spec)
- **Lokasi**: `backend/src/utils/response.js:14-24` + pemanggil: `orderController.js:318`, `serviceController.js:171`, `paymentController.js:178`, `userController.js:211`
- **Bukti live**: `DELETE /orders/{code}` → `HTTP/1.1 204 No Content` tapi ada `ETag W/"43"` (ada body JSON `{"success":true,...}`). Client ketat (axios strict, mobile SDK) akan error.
- **Saran**: jangan kirim body untuk 204; atau ganti ke `200` dengan body.

## P1-2. Statistik dashboard bug timezone (UTC vs WIB)
- **Lokasi**: `backend/src/queries/statsQueries.js:14`
- **Gejala**: `new Date().toISOString().split('T')[0]` menghasilkan tanggal **UTC**, padahal pool `timezone:'+07:00'`. Antara 00:00–07:00 WIB, "pesanan hari ini" salah hitung ( ambil tanggal kemarin).
- **Saran**: hitung tanggal "hari ini" di zona WIB (`Asia/Jakarta`).

## P1-3. DELETE order = hard delete, bukan "batalkan"
- **Lokasi**: `backend/src/controllers/orderController.js:306-323` → `orderQueries.js:360-363`
- **Gejala**: README menyebutnya "Batalkan pesanan", tapi kode `DELETE FROM orders` + `ON DELETE CASCADE` menghapus permanen `order_items`, `payments`, `audit_logs`. Kehilangan data.
- **Saran**: ubah jadi **soft-cancel** (set `status='cancelled'`) atau arsipkan, jangan hard delete.

## P1-4. Order status flow tidak ditegakkan
- **Lokasi**: `backend/src/controllers/orderController.js:286-288`
- **Gejala**: hanya blok status terminal (`diambil`/`cancelled`). Transisi mundur (`siap→pending`) dan skip-ahead diperbolehkan, bertentangan dengan diagram alur di README.
- **Saran**: validasi transisi sesuai state machine `pending→dicuci→disetrika→siap→diambil`.

## P1-5. Tidak ada rate-limit login & security headers
- **Lokasi**: `backend/src/routes/authRoutes.js` (login), `backend/server.js`
- **Gejala**: brute-force mudah (apalagi password default `password123`). Tidak ada `helmet` (HSTS, X-Content-Type-Options, dll).
- **Saran**: tambah `express-rate-limit` di `/auth/login`; tambah `helmet()`.

## P1-6. RBAC role basi & jendela user-terhapus 5 menit
- **Lokasi**: `backend/src/middleware/auth.js:49-54`, `role.js:20`, `src/utils/codeResolver.js:71,101`
- **Gejala**:
  1. Role diambil dari JWT (disign 24 jam lalu), bukan DB. Admin yang di-demote tetap punya hak admin sampai token expired.
  2. Cache `code→id` 5 menit termasuk hasil negatif/stale → user yang dihapus masih bisa akses sampai 5 menit.
- **Saran**: re-fetch role dari DB di middleware (atau token versi/`iat` check); kurangi TTL cache & jangan cache negatif.

## P1-7. Logout no-op (tidak ada revocation token)
- **Lokasi**: `backend/src/controllers/authController.js:163-172`
- **Gejala**: logout hanya return 200. Token bocor tetap valid 24 jam.
- **Saran**: implementasi blacklist token atau token-version check di DB.

## P1-8. Menu "Rekap Penghasilan" tidak ada di navigasi
- **Lokasi**: `frontend/src/app/(authenticated)/layout.tsx:21-28`
- **Gejala**: halaman `/reports/income` ada & berfungsi, tapi **tidak terlink** di sidebar. Admin harus ketik URL manual. Link hanya ada di `Sidebar.tsx` yang **dead code**.
- **Saran**: tambahkan ke `NAV_ITEMS` di layout aktif.

## P1-9. Dead code service menunjuk endpoint yang tidak ada
- **Lokasi**: `frontend/src/lib/services/paymentService.ts:19-21` (`create` → `POST /payments`)
- **Gejala**: `POST /payments` **tidak ada** di backend (yang benar `POST /orders/:code/payments`). Method ini tidak pernah dipanggil UI, tapi menyesatkan maintainer & bertentangan dengan README baris 267.
- **Saran**: hapus method `paymentService.create`, atau arahkan ke endpoint benar; perbarui README & Swagger `CreatePaymentRequest`.

## P1-10. Migration `003` gagal tanpa backfill otomatis
- **Lokasi**: `backend/migrations/003_code_not_null.sql`, `backend/scripts/backfillCodes.js`
- **Gejala** (terkonfirmasi live): `003` SET `code NOT NULL` → `ERROR 1138 Invalid use of NULL value` karena `002` baru menambah kolom (semua NULL) tanpa mengisi kode. Harus run `backfillCodes.js` dulu, **tapi tidak ada otomasi** yang menghubungkan keduanya.
- **Saran**: gabungkan `002 → backfill → 003` jadi pipeline terurut otomatis (lihat juga P0-1).

## P1-11. Password policy lemah
- **Lokasi**: `backend/src/controllers/authController.js:22`, `userController.js:21`
- **Gejala**: hanya `isLength({ min: 6 })`. Tidak ada kompleksitas/daftar password umum. Password default `password123`.
- **Saran**: minimum kompleksitas + denylist password umum; ganti default seed.

---

# 🟡 P2 — SEDANG (robustness, konsistensi, aksesibilitas, test)

### P2-1. Race condition uniqueness (whatsapp & username)
- **Lokasi**: `customerController.js:97-101,136-140`; `authController.js:103-105`; `userController.js:121-124`
- **Gejala**: pola check-then-insert tanpa transaksi/`SELECT...FOR UPDATE`. Dua request konkuren bisa lolos cek, kedua INSERT → salah satu 500.
- **Saran**: bungkus transaksi ATAU tangani error `ER_DUP_ENTRY` → 409.

### P2-2. N+1 query di order detail
- **Lokasi**: `backend/src/queries/orderQueries.js:163-171` (loop SELECT service per item), `369-393` (audit→users)
- **Saran**: pakai JOIN batch.

### P2-3. Kurang transaction wrapping
- **Lokasi**: pembuatan order multi-tabel, `customerController.removeData:159-205`, `serviceQueries.js:84-118` (SVC code race, hanya 3 retry)
- **Saran**: bungkus operasi multi-langkah dalam transaksi.

### P2-4. Filter query stale / parameter tak dihormati
- **Lokasi**: `orderController.js:97-107` (abaikan `?customer_id`, pakai `?customer_code`); `paymentController.js:46-49` (`?order_id` vs `?order_code`)
- **Saran**: samakan dengan dokumentasi atau perbarui dokumen.

### P2-5. Error MySQL bocor ke client
- **Lokasi**: `backend/server.js:164-167` (`message: err.message`)
- **Saran**: di production, mask pesan error; log detail di server.

### P2-6. Parameter pagination tak dibatasi
- **Lokasi**: semua list controller (`customerController.js:50-51`, dll)
- **Gejala**: `?limit=1000000` diterima; `?page=-1` → OFFSET negatif → 500.
- **Saran**: clamp `limit` (mis. max 100) & validasi `page >= 1`.

### P2-7. Code cache tidak dibatasi
- **Lokasi**: `backend/src/utils/codeResolver.js:72` — `Map()` tanpa max-size, hanya TTL.
- **Saran**: LRU eviction.

### P2-8. Status code hapus tidak konsisten & FK error jadi 500
- `customerController.js:190` → 200+body; user/order → 204+body.
- `userController.js:194-216` & `orderController.js:319-322`: `ON DELETE RESTRICT` → 500 generik, bukan 409/400.
- **Saran**: tangani `ER_ROW_ISREFERENCED_2` → 409; samakan kontrak delete.

### P2-9. Dead code backend
- `orderQueries.updatePaymentStatus:348-354`, `findDetailByCode:189-197`; `customerQueries.findByCode:78-85`; `paymentQueries.findByCode:103-124`, `getTotalPaymentsForOrder:142-148`; import `createForOrder` di `paymentRoutes.js:14` (route-nya ada di orderRoutes).
- **Saran**: hapus.

### P2-10. Frontend: `DataTable` generic salah + key pakai index
- **Lokasi**: `frontend/src/components/ui/DataTable.tsx:34` (`T extends Record<string,unknown>`), `:79-83` (`key={rowIdx}`)
- **Gejala**: memaksa `as unknown as` / `as never` di ~50 tempat (customers:242, orders:241, payments:277, services:241, users:229, reports:541); key index → bug reconciliasi saat baris dihapus/urut.
- **Saran**: ganti constraint jadi `<T>` + prop `rowKey: (row)=>string` wajib.

### P2-11. Frontend: race condition semua list page (tanpa AbortController)
- **Lokasi**: `customers/page.tsx:36-52`, `orders/page.tsx:49-66`, `payments/page.tsx:49-65`, `services/page.tsx:35-55`, `users/page.tsx:43-59`, `reports/income/page.tsx:301-314`, dashboard `page.tsx:46-57`, `orders/[code]/page.tsx:64-78`
- **Saran**: tambah `AbortController` atau pakai React Query/SWR.

### P2-12. Frontend: aksesibilitas Modal/ConfirmDialog
- **Lokasi**: `ui/Modal.tsx:21-70`, `ui/ConfirmDialog.tsx:16-52`, `(authenticated)/layout.tsx:161-203`
- **Gejala**: tidak ada `role="dialog"`, `aria-modal`, focus trap, `aria-expanded` di dropdown. Sidebar mobile tidak lock scroll. StatusBadge beda warna saja (buta warna).
- **Saran**: tambah semantik ARIA + focus trap + ikon/pola status.

### P2-13. Frontend: bug kecil correctness
- `payments/[code]/page.tsx:212,319-320`: `form="editPaymentForm"` mati (form tak ber-id) + `onClick={handleSubmit}` type-mismatch.
- `lib/format.ts:25-34`: `formatDate` pakai opsi jam tapi nama "Date".
- `hooks/useAdminGuard.ts:21-27`: redirect terlalu agresif saat network flaky (admin sah bisa di-logout).
- `lib/api.ts:51-55`: 401 tunggal langsung hard-redirect `/login` (mis. clock skew).
- `contexts/AuthContext.tsx:24-33`: `refreshUser` swallow error, logout diam-diam.
- `orders/page.tsx:235-242`: search client-side per-halaman saja.

### P2-14. Coverage test minim
- **Lokasi**: `backend/jest.config.js:8-10` (hanya `src/utils/**`); frontend **tidak ada test**.
- **Gejala**: controller/query/middleware/RBAC **0%**. Aturan bisnis kritis **recalc `payment_status`** tidak ada test. Integration test men-mock pool (FK/transaction tak teruji). Tidak ada test isolasi pegawai (makanya P0-2 lolos).
- **Saran**: perluas coverage; tambah integration test vs MySQL asli; test RBAC + recalc payment + isolasi pegawai.

### P2-15. Duplikasi & code smell backend
- `MAX_CODE_RETRY` diulang di 5 file queries; dynamic-UPDATE builder diulang; pola check-then-mutate diulang.
- `WHERE 1=1` anti-pattern; nilai hardcoded (port 5000/3307, connectionLimit 10, CACHE_TTL).
- `paymentQueries.create:156-231` reimplementasi `recalcOrderPaymentStatus:239-267` (drift).
- **Saran**: ekstrak helper bersama.

---

# 🟢 P3 — RENDAH (polish, fitur, cleanup, dokumen)

### P3-1. Dead code & cleanup frontend
- `components/layout/{AppLayout,Sidebar,Topbar}.tsx`, `lib/auth.ts:31-33` (`isAuthenticated`), import `PaginatedData` tak terpakai di 5 service file.
- Toaster `sonner` dirender di `app/layout.tsx:35` **dan** `AppLayout.tsx:27` (risiko dobel toast jika AppLayout diaktifkan).
- `profile/page.tsx:66`: "Terdaftar Sejak" hardcode "-" (tipe `AuthUser` tak punya `created_at`).

### P3-2. Fitur yang belum ada
- Halaman detail: customer, service, user (hanya list+new+edit).
- Print/struck invoice order.
- Refresh token, forgot-password, change-password (untuk user login sendiri).
- Global search, pagination size selector, undo pada hapus.
- Filter rentang tanggal di `/orders` & `/payments`.
- Endpoint GET `/orders/:id/payments`; endpoint `/health`.

### P3-3. Operability backend
- Tidak ada request logging (`morgan`/`pino-http`).
- Tidak ada graceful shutdown (`SIGTERM`/`SIGINT` drain pool).
- Tidak ada handler `unhandledRejection`/`uncaughtException`.
- Tes koneksi DB saat module-load tapi tidak fail-fast (`database.js:27-36`).

### P3-4. Konsistensi kontrak API
- Snake vs camel: `statsService` memetakan ke camelCase, service lain tetap snake_case (`total_price`, `payment_status`). Samakan.
- `next.config.ts:3-7`: tidak ada `headers()` CSP/X-Frame-Options/Referrer-Policy.
- `tsconfig.json target:"ES2017"` konservatif (bisa `ES2022`).

### P3-5. Dependency & lint
- `npm audit`: backend 4 vuln (body-parser DoS, brace-expansion, fast-uri, js-yaml — sebagian besar transitive Jest), frontend 5 high. Jalankan `npm audit fix`.
- `eslint` frontend 12 error / 11 warning (mayoritas `react-hooks/set-state-in-effect` — efek React Compiler). Tambah `eslint-plugin-react-compiler` & perbaiki.
- `lucide-react: ^1.18.0` — versi tidak standar (line stabil 0.x), verifikasi keberadaan di npm.

### P3-6. Dokumentasi vs realitas (README perlu update)
- Struktur folder & migration stale: README hanya sebut `001_init.sql` & 3 file utils; nyata ada `002`,`003`,`codeGenerator/Resolver`,`sanitize`,`resolveIdParam`,`incomeRecapController/Queries`,`validators/`,`scripts/`.
- Contoh curl README kirim `{"customer_id":1,"items":[{"service_id":1,...}]}` → **controller menolak** (yang valid pakai `customer_code`/`service_code`).
- Query param mismatch: `?customer_id` (orders) & `?order_id` (payments) terdokumentasi tapi diabaikan kode.
- Endpoint `/stats/income-recap` ada di kode tapi tidak di tabel endpoint/RBAC README.
- Swagger response schema masih tampilkan field `id` (di-strip sanitizer).
- `docker-compose.yml` buat user least-privilege `laundry_user` tapi app connect sebagai `root`.
- Strategi hybrid ID↔code (FASE 1-4) tidak dijelaskan di README.

---

# ✅ LAMPIRAN A — Yang BUKAN bug (perilaku benar, jangan "ditambal" salah)

| Kemunculan | Kenyataan |
|------------|-----------|
| `POST /payments` → 404 "Endpoint not found" | **By design**. Endpoint payment ada di `POST /orders/:code/payments`. Yang bermasalah hanya `paymentService.ts` & README masih merujuk yg lama (lihat P1-9, P3-6). |
| Buat customer/order "gagal" saat tes | Data tes bentrok (whatsapp duplikat / customer sudah dihapus). Customer dgn whatsapp unik → 201. |
| Order detail 400 di tes awal | Kode order terpotong regex tes (`ORD-260726` vs `ORD-260726-92VFT6`). Kode lengkap → 200. |
| `DELETE /customers` punya order → 400 | Benar (FK RESTRICT). Hanya debatable status 400 vs 409 (lihat P2-8). |
| Pegawai 403 di `/users`, `POST /services` | Benar (RBAC jalan). |

---

# ✅ LAMPIRAN B — Log Hasil Tes (referensi)

**Backend unit test**: `jest tests/unit` → 4 suite, **71/71 lulus**.
**Backend live API** (Docker MySQL + server port 5000):
- `POST /auth/login` (admin/pegawai) ✅; `GET /auth/me`, `/stats/dashboard`, `/stats/income-recap` ✅
- `GET /customers`, `/services`, `/orders`, `/payments`, `/users` ✅
- `GET /customers/CUS-xxxxxx` (by code) ✅; `GET /customers/1` (legacy numeric) → 400 (sesuai desain) ✅
- `POST /customers` (unik) → 201 ✅; `POST /orders` → 201 ✅; `PATCH /orders/:code/status` → 200 ✅
- `POST /orders/:code/payments` → 201 ✅
- Pegawai `GET /orders` (1 own) ✅ tapi `GET /payments` (7 semua) ❌ P0-2
- Pegawai `DELETE /users`, `POST /services` → 403 ✅
- `DELETE /orders/:code` → 204 + body ❌ P1-1

**Frontend**:
- `next build` ✅ (Turbopack, 16 route, TS strict lulus)
- `eslint`: 12 error, 11 warning (P3-5)
- Browser test (Chrome asli, puppeteer-core): login ✅; 8 halaman utama **0 console/page error**; order detail ✅; catat pembayaran via UI → `POST /orders/:code/payments` **201** ✅

---

# 📌 USULAN URUTAN KERJA

1. **Sprint 1 (P0)**: P0-1 migration runner → P0-2 isolasi payment → P0-3/P0-4 hardening auth & CORS.
2. **Sprint 2 (P1)**: P1-1 204-body → P1-2 timezone → P1-3/1-4 order delete & status flow → P1-5/1-6/1-7 rate-limit+helmet+RBAC+logout → P1-8 menu income → P1-9/1-10 cleanup payment+backfill.
3. **Sprint 3 (P2)**: transaksi & race condition → N+1 → DataTable & AbortController → aksesibilitas → perluas test.
4. **Sprint 4 (P3)**: dead code, fitur detail, operability, update README/Swagger, `npm audit fix`.

---

**Terakhir diperbarui**: 2026-07-26
**Dibuat oleh**: sesi audit & pengujian otomatis (Claude Code)
