# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
# WASHPOS — Laundry Management System

| Metadata | Detail |
|----------|--------|
| **Produk** | Washpos |
| **Versi Dokumen** | 1.0 |
| **Tanggal** | 2026-06-12 |
| **Tim** | TIM 03 — Rekayasa Web |
| **Konteks** | Tugas Mata Kuliah Rekayasa Web, Semester 4 Informatika |
| **Status** | Approved for Development |
| **Standar Acuan** | IEEE Std 830-1998 (Recommended Practice for SRS) |
| **Dokumen Turunan** | `PRD_Washpos.md`, `2026-06-12_washpos-ui-specification.md` |

---

## Daftar Isi

1. [Bab 1 — Pendahuluan](#bab-1--pendahuluan)
2. [Bab 2 — Deskripsi Keseluruhan](#bab-2--deskripsi-keseluruhan)
3. [Bab 3 — Persyaratan Fungsional](#bab-3--persyaratan-fungsional)
4. [Bab 4 — Persyaratan Antarmuka Eksternal](#bab-4--persyaratan-antarmuka-eksternal)
5. [Bab 5 — Persyaratan Non-Fungsional](#bab-5--persyaratan-non-fungsional)
6. [Bab 6 — Analisis Use Case](#bab-6--analisis-use-case)
7. [Bab 7 — Aturan Bisnis & Constraint](#bab-7--aturan-bisnis--constraint)
8. [Bab 8 — Lampiran](#bab-8--lampiran)

---

## Bab 1 — Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen **Software Requirements Specification (SRS)** ini mendefinisikan secara lengkap, terstruktur, dan tidak ambigu seluruh persyaratan fungsional maupun non-fungsional dari aplikasi **Washpos — Laundry Management System**. Dokumen ini disusun mengacu pada standar **IEEE Std 830-1998** dan ditujukan untuk:

1. **Stakeholder akademik** (Dosen Rekayasa Web) — sebagai dokumen penilaian kelengkapan analisis kebutuhan.
2. **Tim pengembang (TIM 03)** — sebagai kontrak teknis dan rujukan tunggal selama fase desain, implementasi, pengujian, dan validasi.
3. **Tester** — sebagai dasar penyusunan test case dan kriteria penerimaan (acceptance criteria).

Dokumen ini **bukan** dokumen desain. Keputusan implementasi spesifik (pilihan library, pola kode) berada di luar lingkup SRS dan ditangani oleh dokumen arsitektur terpisah.

### 1.2 Lingkup Produk

**Washpos** adalah aplikasi web manajemen laundry untuk segmen **UMKM (Usaha Mikro, Kecil, dan Menengah)** single-outlet. Produk menggantikan pencatatan operasional manual (buku tulis, kertas) dengan sistem digital terstruktur.

**Dalam Lingkup (In Scope):**
- Autentikasi berbasis JWT dengan dua peran: **Admin** dan **Pegawai**.
- Manajemen pesanan laundry end-to-end (lifecycle: `pending` → `diambil`/`cancelled`).
- Manajemen data pelanggan, layanan, dan pengguna.
- Pencatatan pembayaran parsial/lunas dengan auto-recalculation status bayar.
- Audit trail perubahan status pesanan.
- Dashboard statistik operasional.
- Role-Based Access Control (RBAC) untuk diferensiasi hak akses.
- 14 layar (screen) fungsional yang responsif (desktop, tablet, mobile).

**Di Luar Lingkup (Out of Scope):**
- Notifikasi WhatsApp/SMS otomatis.
- Multi-branch / multi-outlet.
- Ekspor laporan (PDF/Excel).
- Real-time push notification (WebSocket).
- Aplikasi native mobile (cukup PWA-ready via responsive web).
- Integrasi payment gateway eksternal.
- Multi-language (i18n) — hanya Bahasa Indonesia.
- Dark mode toggle manual (hanya mengikuti `prefers-color-scheme`).

### 1.3 Definisi, Akronim, dan Singkatan

| Istilah | Definisi |
|---------|----------|
| **SRS** | Software Requirements Specification — dokumen spesifikasi kebutuhan perangkat lunak |
| **PRD** | Product Requirements Document |
| **Washpos** | Nama produk aplikasi manajemen laundry |
| **UMKM** | Usaha Mikro, Kecil, dan Menengah |
| **Admin** | Role dengan hak akses penuh ke seluruh fitur sistem |
| **Pegawai** | Role dengan akses terbatas (hanya pesanan miliknya, read-only pada layanan, tanpa akses manajemen pengguna) |
| **Order / Pesanan** | Transaksi layanan laundry dari satu pelanggan |
| **Item** | Satuan baris layanan dalam satu pesanan (service + quantity) |
| **Audit Trail** | Log perubahan status pesanan (old/new status, actor, timestamp) |
| **Terminal State** | Status order yang tidak dapat diubah lagi (`diambil`, `cancelled`) |
| **RBAC** | Role-Based Access Control — pengendalian akses berbasis peran |
| **JWT** | JSON Web Token (HS256) — skema autentikasi stateless |
| **REST** | Representational State Transfer — gaya arsitektur API |
| **CRUD** | Create, Read, Update, Delete — operasi dasar data |
| **FK** | Foreign Key — relasi antar tabel pada database relasional |
| **SSR** | Server-Side Rendering |
| **App Router** | Sistem routing Next.js berbasis filesystem |
| **FCP / TTI** | First Contentful Paint / Time to Interactive — metrik performa web |
| **WCAG** | Web Content Accessibility Guidelines |
| **SCR-XX** | Identifier layar (Screen XX) sesuai katalog UI |

### 1.4 Referensi

| # | Dokumen / Sumber | Kegunaan |
|---|------------------|----------|
| 1 | `PRD_Washpos.md` | Product Requirements (induk) |
| 2 | `2026-06-12_washpos-ui-specification.md` | Spesifikasi 14 layar & peta navigasi |
| 3 | `referensi-ui/*.tsx` (14 file) | Implementasi referensi visual/interaksi tiap layar |
| 4 | `frontend/AGENTS.md` | Catatan kompatibilitas Next.js 16 |
| 5 | IEEE Std 830-1998 | Kerangka penyusunan SRS |
| 6 | RFC 7519 (JWT) | Standar token autentikasi |
| 7 | OWASP Top 10 (2021) | Acuan keamanan aplikasi web |
| 8 | WCAG 2.1 Level AA | Acuan aksesibilitas |
| 9 | Swagger/OpenAPI `http://localhost:5000/api-docs` | Dokumentasi interaktif API |

### 1.5 Ikhtisar Dokumen

- **Bab 1** — memberikan konteks umum, lingkup, dan terminologi.
- **Bab 2** — mendeskripsikan produk secara holistik: perspektif, fungsi utama, karakteristik pengguna, batasan, dan asumsi.
- **Bab 3** — menjabarkan **persyaratan fungsional** per modul/screen dengan format `FR-XX-YY` (Functional Requirement) yang dapat ditelusuri.
- **Bab 4** — menetapkan persyaratan antarmuka eksternal (pengguna, perangkat keras, perangkat lunak, komunikasi).
- **Bab 5** — menetapkan persyaratan non-fungsional (performa, keamanan, usability, reliability, maintainability) berstandar ISO/IEC 25010.
- **Bab 6** — menyajikan analisis Use Case terhadap dua aktor utama.
- **Bab 7** — merangkum aturan bisnis dan constraint yang mengikat.
- **Bab 8** — lampiran (skema DB, enum, katalog data seed, matriks traceability).

---

## Bab 2 — Deskripsi Keseluruhan

### 2.1 Perspektif Produk

Washpos adalah produk **baru (greenfield)**, bukan modul tambahan atau pengganti sistem yang sudah ada. Produk direncanakan sebagai **full-stack web application** yang berdiri sendiri (standalone), tidak bergantung pada sistem eksternal apa pun selain infrastruktur pendukung (database, browser).

Arsitektur produk terdiri atas **tiga lapisan**:

1. **Frontend** — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 sebagai client SPA-like dengan SSR opsional.
2. **Backend** — Express.js REST API yang menyajikan **32 endpoint** di port 5000.
3. **Database** — MySQL 8.0 (di-container-kan via Docker) di port host 3307.

Backend telah 100% selesai dan dikontraktualkan **stabil** (no breaking changes). Frontend berada pada fase awal (fresh scaffold `create-next-app`) dan merupakan target utama pengembangan berdasarkan dokumen ini.

#### 2.1.1 Diagram Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (Browser)                  │
│           Next.js 16 App Router (SPA-like)           │
│      React 19 + TypeScript + Tailwind CSS v4         │
│                                                       │
│  14 Screens │ Shared Components │ API Client │ Auth   │
└────────────────────┬────────────────────────────────┘
                      │ HTTPS — Authorization: Bearer <JWT>
                      ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND (API)                      │
│              Express.js REST — Port 5000              │
│   Routes │ Middleware (CORS/JWT/RBAC/Validation)     │
│                Controllers (raw SQL)                  │
└────────────────────┬────────────────────────────────┘
                      │ mysql2 (Promise Pool)
                      ▼
┌─────────────────────────────────────────────────────┐
│                  DATABASE (MySQL 8)                   │
│           Docker Container — Port 3307                │
│  users, customers, services, orders, order_items,    │
│            payments, audit_logs                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 Fungsi-Fungsi Produk

Berikut ringkasan fungsi tingkat tinggi. Detail persyaratan fungsional ber-ID tercantum di **Bab 3**.

| Kode | Fungsi Utama |
|------|--------------|
| F-01 | Autentikasi pengguna (login/logout) berbasis JWT |
| F-02 | Manajemen sesi & proteksi rute berbasis peran |
| F-03 | Dashboard statistik operasional (role-filtered) |
| F-04 | CRUD Pesanan dengan alur status & audit trail |
| F-05 | Pencatatan pembayaran parsial dengan auto-status |
| F-06 | CRUD Pelanggan |
| F-07 | CRUD Layanan (Admin), Read-only (Pegawai) |
| F-08 | CRUD Pengguna (Admin only) |
| F-09 | Profil pengguna yang sedang login |
| F-10 | RBAC penuh pada seluruh layar & aksi destruktif |

### 2.3 Karakteristik Pengguna

Dua persona pengguna terdaftar, ditambah satu kategori non-terdaftar:

#### 2.3.1 Admin (Pemilik Laundry)
- **Latar belakang teknis:** Rendah-Menengah. Terbiasa dengan aplikasi web.
- **Frekuensi penggunaan:** Harian.
- **Tanggung jawab:** Seluruh aspek bisnis (pesanan, pembayaran, layanan, pengguna, pelanggan).
- **Hak khusus:** Hapus entitas, CRUD layanan, CRUD pengguna, lihat seluruh pesanan tanpa filter `user_id`.

#### 2.3.2 Pegawai (Staff Operasional)
- **Latar belakang teknis:** Rendah. Pengguna komputer dasar.
- **Frekuensi penggunaan:** Harian, beberapa kali sehari.
- **Tanggung jawab:** Menerima pesanan baru, memperbarui status cucian, menerima pembayaran dari pelanggan.
- **Batasan eksplisit:** Hanya melihat pesanan yang ditangani sendiri; tidak dapat menghapus pesanan/pembayaran; tidak dapat mengelola pengguna; layanan hanya read-only.

#### 2.3.3 Pengguna Non-Terdaftar
- Hanya dapat mengakses layar login (`/login`). Tidak ada fitur registrasi mandiri (registrasi hanya oleh Admin).

### 2.4 Batasan (Constraints)

| Kode | Batasan |
|------|---------|
| C-01 | Backend API tidak boleh diubah; dianggap stabil (kontrak tetap). |
| C-02 | Frontend wajib menggunakan Next.js 16.2.9 + React 19.2.4 (sesuai scaffold). |
| C-03 | Styling wajib Tailwind CSS v4 (sintaks `@import "tailwindcss"` + `@theme inline`). |
| C-04 | React Compiler wajib aktif (`reactCompiler: true`). |
| C-05 | Bahasa antarmuka tunggal: Bahasa Indonesia. |
| C-06 | Format mata uang: Rupiah (IDR, `id-ID` locale). |
| C-07 | Tidak ada fitur yang memerlukan infrastruktur berbayar tambahan (mis. SMS gateway berbayar). |
| C-08 | Lingkup tunggal outlet (no multi-branch). |
| C-09 | Kompatibilitas browser: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+. |
| C-10 | Tidak boleh menyimpan password dalam plain-text di mana pun (wajib bcrypt). |

### 2.5 Asumsi dan Ketergantungan

| Kode | Asumsi / Ketergantungan |
|------|-------------------------|
| A-01 | Backend berjalan di `http://localhost:5000` selama pengembangan. |
| A-02 | Frontend berjalan di `http://localhost:3000`. |
| A-03 | CORS backend sudah mengizinkan origin `http://localhost:3000`. |
| A-04 | Docker terpasang untuk menjalankan MySQL 8.0 pada port host 3307. |
| A-05 | Database sudah di-seed dengan minimal: 1 Admin (`admin`), 1 Pegawai (`pegawai1`), 10 layanan default, dan data sampel. |
| A-06 | Kredensial default: `admin`/`password123` dan `pegawai1`/`password123`. |
| A-07 | Koneksi internet tersedia untuk CDN font Google (Geist) dan avatar generator (jika dipakai). |
| A-08 | Token JWT memiliki masa berlaku 24 jam; sistem harus menangani expiry dengan redirect ke login. |
| A-09 | Tidak ada kebutuhan offline-first; aplikasi memerlukan koneksi API aktif. |

### 2.6 Apikasi (Skema Penomoran Persyaratan)

Setiap persyaratan diberi ID unik dengan format berikut untuk menjamin traceability:

- **`FR-MOD-NN`** — Functional Requirement, di mana `MOD` = kode modul (AUT, DASH, ORD, CUST, SRV, PAY, USR, PRF), `NN` = nomor urut.
- **`NFR-XX-NN`** — Non-Functional Requirement, di mana `XX` = kategori (PERF, SEC, USA, REL, MAINT, COMP, ACC).
- **`BR-NN`** — Business Rule.
- **`UC-NN`** — Use Case.

---

## Bab 3 — Persyaratan Fungsional

### 3.1 Modul Autentikasi (AUT)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-AUT-01 | Sistem wajib menyediakan layar login publik di rute `/login` yang dapat diakses tanpa token. | P0 |
| FR-AUT-02 | Sistem wajib menerima input username dan password, lalu memanggil `POST /auth/login`. | P0 |
| FR-AUT-03 | Sistem wajib menyediakan toggle show/hide pada input password. | P1 |
| FR-AUT-04 | Sistem wajib menyediakan checkbox "Ingat Saya" (menentukan strategi penyimpanan token: localStorage). | P2 |
| FR-AUT-05 | Setelah login berhasil, sistem wajib menyimpan JWT token di client dan mengarahkan pengguna ke `/` (Dashboard). | P0 |
| FR-AUT-06 | Jika login gagal, sistem wajib menampilkan pesan error yang jelas tanpa mengungkap field mana yang salah. | P0 |
| FR-AUT-07 | Sistem wajib melakukan validasi sisi-klien: username wajib diisi, password wajib diisi. | P0 |
| FR-AUT-08 | Jika pengguna sudah login mengakses `/login`, sistem wajib mengarahkan ulang ke Dashboard. | P1 |
| FR-AUT-09 | Sistem wajib menyediakan mekanisme logout yang menghapus token dari client dan mengarahkan ke `/login`. | P0 |
| FR-AUT-10 | Setiap request ke endpoint terproteksi wajib menyertakan header `Authorization: Bearer <token>`. | P0 |
| FR-AUT-11 | Jika token kedaluwarsa atau tidak valid, sistem wajib menghapus token dan mengarahkan ke `/login`. | P0 |
| FR-AUT-12 | Sistem wajib mempertahankan data sesi pengguna (`id`, `username`, `role`) di AuthContext. | P0 |
| FR-AUT-13 | Sistem wajib menyediakan endpoint `GET /auth/me` untuk memvalidasi token & memuat info pengguna. | P0 |

### 3.2 Modul Dashboard (DASH)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-DASH-01 | Dashboard wajib ditampilkan di rute `/` dan memanggil `GET /stats/dashboard`. | P0 |
| FR-DASH-02 | Dashboard wajib menampilkan 4 Stat Card: (a) Total Pesanan Hari Ini, (b) Total Pendapatan Hari Ini (format Rupiah), (c) Pesanan Aktif (status selain `diambil`/`cancelled`), (d) Pesanan Siap Diambil (status = `siap`). | P0 |
| FR-DASH-03 | Dashboard wajib menampilkan chart distribusi status order (pending, dicuci, disetrika, siap, diambil, cancelled) dalam bentuk bar chart atau donut chart. | P1 |
| FR-DASH-04 | Dashboard wajib menampilkan tabel "Pesanan Terbaru" (5–10 entri terakhir) dengan kolom: No. Order, Nama Pelanggan, Status, Total Harga, Tanggal. | P0 |
| FR-DASH-05 | Baris tabel pesanan terbaru harus dapat diklik dan mengarah ke `/orders/:id`. | P0 |
| FR-DASH-06 | Kartu "Pesanan Aktif" harus dapat diklik dan mengarah ke `/orders?filter=active`. | P1 |
| FR-DASH-07 | Kartu "Siap Diambil" harus dapat diklik dan mengarah ke `/orders?status=siap`. | P1 |
| FR-DASH-08 | Dashboard wajib menyediakan tombol CTA "Buat Pesanan Baru" yang mengarah ke `/orders/new`. | P1 |
| FR-DASH-09 | Untuk Pegawai, statistik wajib difilter hanya untuk pesanan milik sendiri (backend yang menangani via token). | P0 |
| FR-DASH-10 | Dashboard wajib menampilkan indikator loading (skeleton/spinner) selama pengambilan data. | P1 |
| FR-DASH-11 | Dashboard wajib menampilkan empty state yang informatif ketika belum ada pesanan. | P2 |

### 3.3 Modul Pesanan (ORD)

#### 3.3.1 Daftar Pesanan (SCR-03)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-ORD-01 | Daftar pesanan wajib ditampilkan di rute `/orders` dan memanggil `GET /orders`. | P0 |
| FR-ORD-02 | Header halaman wajib menampilkan judul "Pesanan" dan tombol "+ Buat Pesanan Baru". | P0 |
| FR-ORD-03 | Sistem wajib menyediakan filter bar berisi: dropdown status, dropdown pelanggan (opsional), search field (nama pelanggan atau ID order). | P0 |
| FR-ORD-04 | Tabel wajib menampilkan kolom: ID Order, Nama Pelanggan, No. WhatsApp, Tanggal, Status Order (badge berwarna), Status Bayar (badge), Total Harga, Ditangani Oleh (khusus Admin), Aksi. | P0 |
| FR-ORD-05 | Warna badge status order mengikuti peta warna (lihat Bab 4.1.4). | P0 |
| FR-ORD-06 | Sistem wajib menyediakan pagination di bawah tabel. | P0 |
| FR-ORD-07 | Klik baris/baris aksi pada pesanan mengarah ke `/orders/:id`. | P0 |
| FR-ORD-08 | Perubahan filter wajib memicu reload data dengan parameter query yang relevan. | P0 |
| FR-ORD-09 | Untuk Pegawai, daftar wajib hanya berisi pesanan miliknya (`user_id` filter). | P0 |
| FR-ORD-10 | Tabel wajib mendukung scroll horizontal pada layar kecil (responsive). | P1 |

#### 3.3.2 Buat Pesanan (SCR-04)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-ORD-11 | Form buat pesanan wajib di rute `/orders/new` dengan 3 langkah: Pilih Pelanggan → Tambah Layanan → Catatan (opsional). | P0 |
| FR-ORD-12 | Langkah 1 wajib menyediakan: search field (nama/WhatsApp), autocomplete dropdown pelanggan, dan tombol "+ Tambah Pelanggan Baru" yang membuka modal SCR-07. | P0 |
| FR-ORD-13 | Setelah pelanggan dipilih, sistem wajib menampilkan info ringkas: Nama, WhatsApp, Alamat. | P0 |
| FR-ORD-14 | Langkah 2 wajib menyediakan tabel dinamis item layanan dengan: dropdown layanan (hanya `active`), input quantity (angka desimal), perhitungan otomatis subtotal = price × quantity. | P0 |
| FR-ORD-15 | Sistem wajib menyediakan tombol "+ Tambah Item" dan tombol hapus per item. | P0 |
| FR-ORD-16 | Total harga wajib dihitung real-time sebagai penjumlahan seluruh subtotal. | P0 |
| FR-ORD-17 | Langkah 3 wajib menyediakan textarea catatan opsional. | P1 |
| FR-ORD-18 | Sistem wajib menampilkan panel ringkasan pesanan (pelanggan, daftar item + subtotal, total, catatan). | P1 |
| FR-ORD-19 | Tombol "Simpan Pesanan" wajib memanggil `POST /orders`. `user_id` wajib otomatis dari pengguna yang login. | P0 |
| FR-ORD-20 | Setelah simpan berhasil, sistem mengarahkan ke `/orders/:id` dari order yang baru dibuat. | P0 |
| FR-ORD-21 | Tombol "Batal" wajib mengarah kembali ke `/orders`. | P0 |
| FR-ORD-22 | Modal "Tambah Pelanggan Baru" wajib memanggil `POST /customers` dan saat sukses, pelanggan otomatis terpilih di Langkah 1. | P0 |
| FR-ORD-23 | Validasi sisi-klien: pelanggan wajib dipilih, minimal 1 item, setiap quantity > 0, layanan harus `active`. | P0 |

#### 3.3.3 Detail Pesanan (SCR-05)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-ORD-24 | Detail pesanan wajib di rute `/orders/:id`, memanggil `GET /orders/:id`. | P0 |
| FR-ORD-25 | Header wajib menampilkan ID, badge status order, badge status bayar, dan tombol aksi kontekstual. | P0 |
| FR-ORD-26 | Card Info Pesanan wajib berisi: nama pelanggan (link ke `/customers/:id/edit`), WhatsApp, alamat, username staff, tanggal dibuat, catatan. | P0 |
| FR-ORD-27 | Tabel Item Pesanan wajib berisi: No, Nama Layanan, Quantity + Satuan, Harga Satuan, Subtotal, dan baris total. | P0 |
| FR-ORD-28 | Card Riwayat Pembayaran wajib menampilkan tabel (Tanggal, Jumlah, Metode, Catatan) dan ringkasan: Total Terbayar, Total Pesanan, Sisa. | P0 |
| FR-ORD-29 | Sistem wajib menampilkan Audit Trail dalam bentuk timeline vertikal (status lama → baru, oleh siapa, kapan), urutan terbaru ke terlama. | P1 |
| FR-ORD-30 | Tombol "Ubah Status" wajib membuka modal dengan dropdown status; tombol dinonaktifkan jika status terminal (`diambil`/`cancelled`). | P0 |
| FR-ORD-31 | Aksi ubah status wajib memanggil `PATCH /orders/:id/status` dan setelah sukses me-refresh halaman. | P0 |
| FR-ORD-32 | Tombol "Catat Pembayaran" wajib membuka modal: input jumlah (Rp), dropdown metode, textarea catatan; submit memanggil `POST /orders/:id/payments`. | P0 |
| FR-ORD-33 | Tombol "Edit Pesanan" wajib membuka modal: ganti pelanggan (dropdown) + edit catatan; submit memanggil `PATCH /orders/:id`. | P1 |
| FR-ORD-34 | Tombol "Hapus Pesanan" (Admin only) wajib membuka modal konfirmasi; konfirmasi memanggil `DELETE /orders/:id` lalu mengarah ke `/orders`. | P0 |
| FR-ORD-35 | Breadcrumb "Pesanan" wajib mengarah ke `/orders`. | P1 |
| FR-ORD-36 | Pegawai tidak boleh melihat/mengakses detail pesanan milik pengguna lain. | P0 |

### 3.4 Modul Pelanggan (CUST)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-CUST-01 | Daftar pelanggan wajib di rute `/customers`, memanggil `GET /customers`. | P0 |
| FR-CUST-02 | Header wajib berisi judul "Pelanggan" dan tombol "+ Tambah Pelanggan". | P0 |
| FR-CUST-03 | Search bar wajib memfilter berdasarkan nama atau WhatsApp. | P0 |
| FR-CUST-04 | Tabel wajib berisi kolom: ID, Nama, WhatsApp, Alamat, Jumlah Pesanan, Tanggal Terdaftar, Aksi (Edit, Hapus). | P0 |
| FR-CUST-05 | Tombol Hapus wajib dinonaktifkan jika pelanggan memiliki pesanan terkait. | P0 |
| FR-CUST-06 | Hapus pelanggan (jika diizinkan) wajib memanggil `DELETE /customers/:id` dengan konfirmasi dialog. | P0 |
| FR-CUST-07 | Klik baris pelanggan wajib mengarah ke `/orders?customer=:id`. | P1 |
| FR-CUST-08 | Form Pelanggan (create) wajib di `/customers/new`, memanggil `POST /customers`. | P0 |
| FR-CUST-09 | Form Pelanggan (edit) wajib di `/customers/:id/edit`, memanggil `GET /customers/:id` (preload) lalu `PATCH /customers/:id`. | P0 |
| FR-CUST-10 | Form wajib berisi: Nama (wajib, maks 100 karakter), WhatsApp (wajib, regex `^628\d{7,11}$`), Alamat (opsional, textarea). | P0 |
| FR-CUST-11 | Validasi sisi-klien wajib mencegah submit jika ada field tidak valid. | P0 |
| FR-CUST-12 | Tombol "Simpan" sukses mengarah ke `/customers`; tombol "Batal" mengarah ke `/customers`. | P0 |
| FR-CUST-13 | Form Pelanggan wajib dapat di-render sebagai modal ketika dipanggil dari SCR-04. | P1 |
| FR-CUST-14 | Jika disimpan dari modal, pelanggan langsung terpilih di form pesanan induk. | P1 |
| FR-CUST-15 | Pagination wajib tersedia pada daftar pelanggan. | P1 |

### 3.5 Modul Layanan (SRV)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-SRV-01 | Daftar layanan wajib di rute `/services`, memanggil `GET /services`. | P0 |
| FR-SRV-02 | Untuk Admin, header wajib menampilkan tombol "+ Tambah Layanan" dan toggle "Tampilkan non-aktif". | P0 |
| FR-SRV-03 | Tabel wajib berisi kolom: ID, Nama Layanan, Harga per Satuan, Satuan, Status (Aktif/Nonaktif), Aksi (Admin). | P0 |
| FR-SRV-04 | Pegawai hanya melihat daftar aktif (read-only) tanpa tombol aksi. | P0 |
| FR-SRV-05 | Admin dapat mengedit/hapus/meng-toggle status aktif layanan. | P0 |
| FR-SRV-06 | Toggle aktif wajib memanggil `PATCH /services/:id` dengan payload `{ active: <bool> }`. | P0 |
| FR-SRV-07 | Hapus layanan wajib dengan konfirmasi dialog; memanggil `DELETE /services/:id`. | P0 |
| FR-SRV-08 | Form Layanan (create) wajib di `/services/new`, memanggil `POST /services`. Admin only. | P0 |
| FR-SRV-09 | Form Layanan (edit) wajib di `/services/:id/edit`, memanggil `GET /services/:id` lalu `PATCH /services/:id`. Admin only. | P0 |
| FR-SRV-10 | Form wajib berisi: Nama (wajib, maks 100), Harga (wajib, > 0, format Rupiah), Satuan (dropdown: kg/piece/meter/pair/item), Toggle Aktif (default true). | P0 |
| FR-SRV-11 | Pegawai yang mencoba mengakses `/services/new` atau `/services/:id/edit` wajib diarahkan ke halaman 403 atau kembali ke `/services`. | P0 |
| FR-SRV-12 | Pagination wajib tersedia pada daftar layanan. | P1 |

### 3.6 Modul Pembayaran (PAY)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-PAY-01 | Daftar pembayaran wajib di rute `/payments`, memanggil `GET /payments`. | P0 |
| FR-PAY-02 | Filter bar wajib menyediakan dropdown order ID dan search field (ID pembayaran atau order). | P0 |
| FR-PAY-03 | Tabel wajib berisi kolom: ID Pembayaran, ID Order (link), Nama Pelanggan, Jumlah (Rp), Metode (badge), Catatan, Tanggal, Aksi (Admin). | P0 |
| FR-PAY-04 | Klik ID Order wajib mengarah ke `/orders/:id`. | P0 |
| FR-PAY-05 | Admin dapat Edit (→ `/payments/:id`) dan Hapus pembayaran. | P0 |
| FR-PAY-06 | Pegawai hanya melihat daftar tanpa aksi edit/hapus. | P0 |
| FR-PAY-07 | Hapus pembayaran wajib dengan konfirmasi dialog; memanggil `DELETE /payments/:id`. | P0 |
| FR-PAY-08 | Detail Pembayaran wajib di `/payments/:id`, Admin only. | P0 |
| FR-PAY-09 | Detail wajib menampilkan info order terkait (ID Order, Nama Pelanggan, link). | P0 |
| FR-PAY-10 | Form edit wajib berisi: Jumlah (Rp), Metode (Cash/Transfer/E-Wallet), Catatan. | P0 |
| FR-PAY-11 | Sistem wajib menampilkan preview status bayar yang diproyeksikan setelah edit. | P1 |
| FR-PAY-12 | Tombol "Simpan Perubahan" memanggil `PATCH /payments/:id`, lalu mengarah ke `/payments`. | P0 |
| FR-PAY-13 | Tombol "Hapus Pembayaran" memanggil `DELETE /payments/:id`, lalu mengarah ke `/payments`. | P0 |
| FR-PAY-14 | Tombol "Kembali" mengarah ke `/payments`. | P0 |
| FR-PAY-15 | Pegawai yang mencoba mengakses `/payments/:id` wajib diarahkan ke `/payments`. | P0 |
| FR-PAY-16 | Setiap perubahan pada pembayaran wajib memicu backend melakukan recompute `payment_status` pada order terkait. | P0 |

### 3.7 Modul Pengguna (USR)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-USR-01 | Daftar pengguna wajib di rute `/users`, Admin only. Memanggil `GET /users`. | P0 |
| FR-USR-02 | Header wajib berisi judul "Pengguna" dan tombol "+ Tambah Pengguna". | P0 |
| FR-USR-03 | Search wajib memfilter berdasarkan username. | P0 |
| FR-USR-04 | Tabel wajib berisi kolom: ID, Username, Role (badge), Tanggal Dibuat, Aksi (Edit, Hapus). | P0 |
| FR-USR-05 | Baris untuk user yang sedang login: tombol Hapus wajib dinonaktifkan. | P0 |
| FR-USR-06 | Hapus user (yang bukan diri sendiri) wajib dengan konfirmasi; memanggil `DELETE /users/:id`. | P0 |
| FR-USR-07 | Form Pengguna (create) wajib di `/users/new`, memanggil `POST /users`. Admin only. | P0 |
| FR-USR-08 | Form Pengguna (edit) wajib di `/users/:id/edit`, memanggil `GET /users/:id` lalu `PATCH /users/:id`. Admin only. | P0 |
| FR-USR-09 | Form wajib berisi: Username (wajib, 3–50 karakter, regex `^[a-zA-Z0-9_]+$`), Password (wajib create min 6, opsional edit), Role (dropdown/cards: Admin/Pegawai). | P0 |
| FR-USR-10 | Pada edit, jika password dikosongkan, backend tidak mengubah password existing. | P0 |
| FR-USR-11 | Pegawai yang mencoba mengakses rute `/users*` wajib diarahkan ke `/` (Dashboard) dengan notifikasi. | P0 |

### 3.8 Modul Profil (PRF)

| ID | Deskripsi | Prioritas |
|----|-----------|-----------|
| FR-PRF-01 | Profil wajib di rute `/profile`, memanggil `GET /auth/me`. | P0 |
| FR-PRF-02 | Profil wajib menampilkan: Username, Role, Terdaftar Sejak (tanggal dibuat). | P0 |
| FR-PRF-03 | Tombol "Logout" wajib menghapus token dan mengarah ke `/login`. | P0 |
| FR-PRF-04 | Akses tersedia untuk Admin dan Pegawai. | P0 |

---

## Bab 4 — Persyaratan Antarmuka Eksternal

### 4.1 Antarmuka Pengguna (User Interface)

#### 4.1.1 Tata Letak Umum
- Aplikasi menggunakan **Sidebar (kiri) + Topbar (atas) + Content Area**.
- Sidebar fixed-width: 256px (expanded) / 64px (collapsed) di desktop; di mobile menggunakan drawer (hamburger).
- Topbar berisi: tombol toggle sidebar, info user yang login (username + role badge), dropdown (Profil, Logout).

#### 4.1.2 Komponen Shared UI
Sistem wajib menyediakan komponen reusable:
1. **Sidebar** — navigasi berbasis peran (Admin: 6 menu, Pegawai: 5 menu).
2. **Topbar** — info sesi + dropdown.
3. **DataTable** — header + body + pagination + loading skeleton + empty state.
4. **StatusBadge** — badge seragam untuk order/payment/method/role/service status.
5. **Modal** — overlay dengan backdrop blur, header/body/footer, animasi fade-in.
6. **Toast** — notifikasi top-right (success/error/warning/info), auto-dismiss.
7. **LoadingSpinner** — untuk submit button.
8. **EmptyState** — ilustrasi + pesan + CTA.
9. **ConfirmDialog** — konfirmasi aksi destruktif.
10. **Breadcrumb** — navigasi hierarki.

#### 4.1.3 Prinsip Desain
- Bahasa: Bahasa Indonesia.
- Format mata uang: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- Format tanggal: `DD MMM YYYY, HH:mm` (locale `id-ID`).
- Ikon: Lucide React.
- Tipografi: Geist Sans (default), Geist Mono (mono).

#### 4.1.4 Peta Warna Badge

| Kategori | Nilai | Background | Text | Border |
|----------|-------|------------|------|--------|
| Order | pending | yellow-100 | yellow-800 | yellow-200 |
| Order | dicuci | blue-100 | blue-800 | blue-200 |
| Order | disetrika | purple-100 | purple-800 | purple-200 |
| Order | siap | emerald-100 | emerald-800 | emerald-200 |
| Order | diambil | slate-100 | slate-800 | slate-200 |
| Order | cancelled | red-100 | red-800 | red-200 |
| Payment | unpaid | red-100 | red-700 | red-200 |
| Payment | partial | yellow-100 | yellow-700 | yellow-200 |
| Payment | paid | emerald-100 | emerald-700 | emerald-200 |
| Method | cash | emerald-100 | emerald-700 | emerald-200 |
| Method | transfer | blue-100 | blue-700 | blue-200 |
| Method | ewallet | purple-100 | purple-700 | purple-200 |
| Role | admin | orange-100 | orange-700 | orange-200 |
| Role | pegawai | blue-100 | blue-700 | blue-200 |
| Service | active | emerald-100 | emerald-700 | emerald-200 |
| Service | inactive | slate-100 | slate-700 | slate-200 |

#### 4.1.5 Responsivitas

| Breakpoint | Lebar | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, sidebar hidden (drawer) |
| Tablet | 640–1024px | Compact, collapsible sidebar |
| Desktop | > 1024px | Full layout, persistent sidebar |

### 4.2 Antarmuka Perangkat Keras

Tidak ada kebutuhan perangkat keras khusus. Aplikasi berjalan pada:
- Server: satu mesin (dev) dengan Docker untuk MySQL.
- Klien: perangkat dengan browser modern (komputer desktop, laptop, tablet, smartphone).

### 4.3 Antarmuka Perangkat Lunak

| Komponen | Versi | Tujuan |
|----------|-------|--------|
| Node.js | ≥ 20 LTS | Runtime backend & build frontend |
| MySQL | 8.0 | Database relasional |
| Docker | ≥ 20 | Containerisasi database |
| Browser (klien) | lihat C-09 | Runtime frontend |

### 4.4 Antarmuka Komunikasi

- **Protokol:** HTTP/1.1 (HTTPS saat produksi).
- **Format Pertukaran Data:** JSON (`Content-Type: application/json`).
- **Autentikasi:** `Authorization: Bearer <JWT>` pada setiap request terproteksi.
- **Base URL API:** `http://localhost:5000/api/v1`.
- **CORS:** Hanya origin `http://localhost:3000` yang diizinkan.
- **Dokumentasi API interaktif:** Swagger UI di `http://localhost:5000/api-docs`.

### 4.5 Standar Response API

```json
// Sukses
{ "success": true, "message": "...", "data": { ... } }

// Error umum
{ "success": false, "message": "..." }

// Validation error
{ "success": false, "message": "Validation failed",
  "errors": [{ "field": "username", "message": "..." }] }
```

---

## Bab 5 — Persyaratan Non-Fungsional

Dikelompokkan mengacu karakteristik **ISO/IEC 25010**.

### 5.1 Performa (PERF)

| ID | Persyaratan |
|----|-------------|
| NFR-PERF-01 | First Contentful Paint (FCP) < 2 detik pada koneksi 4G. |
| NFR-PERF-02 | Time to Interactive (TTI) < 3 detik pada koneksi 4G. |
| NFR-PERF-03 | Response time API rata-rata < 500 ms untuk endpoint baca. |
| NFR-PERF-04 | Initial bundle size JavaScript < 300 KB (gzip). |
| NFR-PERF-05 | Paginasi default 10 entri/halaman untuk menjaga beban render. |
| NFR-PERF-06 | Image/aset wajib dioptimasi via Next.js Image bila memungkinkan. |
| NFR-PERF-07 | React Compiler aktif untuk auto-memoization komponen. |

### 5.2 Keamanan (SEC)

| ID | Persyaratan |
|----|-------------|
| NFR-SEC-01 | Password wajib di-hash dengan bcrypt di sisi backend. |
| NFR-SEC-02 | Token JWT (HS256) berlaku 24 jam; disimpan di client (localStorage). |
| NFR-SEC-03 | Semua endpoint (kecuali `POST /auth/login` dan `POST /auth/register`) wajib proteksi `Authorization: Bearer`. |
| NFR-SEC-04 | RBAC middleware backend menjadi sumber kebenaran; frontend hanya menyembunyikan UI. |
| NFR-SEC-05 | Input wajib divalidasi sisi-klien dan sisi-server (express-validator). |
| NFR-SEC-06 | Parameterized query wajib digunakan (mysql2) untuk mencegah SQL Injection. |
| NFR-SEC-07 | React auto-escaping aktif untuk mencegah XSS; tidak boleh menggunakan `dangerouslySetInnerHTML`. |
| NFR-SEC-08 | Tidak ada kredensial yang di-hardcode pada source frontend. |
| NFR-SEC-09 | Pesan error login tidak boleh mengungkapkan field mana yang salah. |
| NFR-SEC-10 | CORS membatasi origin ke `http://localhost:3000` di fase pengembangan. |
| NFR-SEC-11 | Aksi destruktif (delete) wajib dengan konfirmasi dialog. |

### 5.3 Keandalan (REL)

| ID | Persyaratan |
|----|-------------|
| NFR-REL-01 | Sistem harus menangani network error dengan menampilkan pesan & opsi retry bila memungkinkan. |
| NFR-REL-02 | Token kedaluwarsa wajib ditangani: hapus token + redirect ke `/login`. |
| NFR-REL-03 | Form submit wajib menonaktifkan tombol selama proses untuk mencegah double-submit. |
| NFR-REL-04 | Sistem harus konsisten menampilkan loading state dan empty state. |
| NFR-REL-05 | Transaksi status terminal (`diambil`/`cancelled`) tidak boleh dapat diubah oleh UI. |

### 5.4 Usability (USA)

| ID | Persyaratan |
|----|-------------|
| NFR-USA-01 | Seluruh teks antarmuka dalam Bahasa Indonesia. |
| NFR-USA-02 | Konsistensi visual: warna, spacing, ikon, terminologi seragam di seluruh layar. |
| NFR-USA-03 | Validasi form menampilkan pesan spesifik per field. |
| NFR-USA-04 | Toast notification untuk feedback aksi (sukses/gagal). |
| NFR-USA-05 | Feedback visual untuk hover, focus, active, disabled state. |
| NFR-USA-06 | Breadcrumb pada layar dengan hierarki (detail, form). |
| NFR-USA-07 | Tabel dapat di-scroll horizontal pada layar kecil. |

### 5.5 Maintainability (MAINT)

| ID | Persyaratan |
|----|-------------|
| NFR-MAINT-01 | TypeScript strict mode aktif; tidak ada `any` tanpa alasan kuat. |
| NFR-MAINT-02 | Struktur folder mengikuti pola App Router (lihat Bab 8.2). |
| NFR-MAINT-03 | Komponen reusable dipisahkan dari halaman (`src/components/`). |
| NFR-MAINT-04 | ESLint (flat config) dengan `next/core-web-vitals` & `next/typescript`. |
| NFR-MAINT-05 | Konstanta (status, rute, warna) terpusat di `src/lib/constants.ts`. |
| NFR-MAINT-06 | Tipe data shared terdefinisi di `src/types/index.ts`. |
| NFR-MAINT-07 | Tidak ada duplikasi logika format (formatters terpusat). |

### 5.6 Portabilitas/Kompatibilitas (COMP)

| ID | Persyaratan |
|----|-------------|
| NFR-COMP-01 | Kompatibel: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+. |
| NFR-COMP-02 | Responsif pada resolusi 360px hingga 1920px. |
| NFR-COMP-03 | Mendukung `prefers-color-scheme: dark` (dark mode otomatis). |
| NFR-COMP-04 | Tidak boleh bergantung pada fitur browser non-stabil. |

### 5.7 Aksesibilitas (ACC)

| ID | Persyaratan |
|----|-------------|
| NFR-ACC-01 | Menggunakan semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<table>`, dst.). |
| NFR-ACC-02 | Atribut ARIA pada elemen interaktif (modal, dropdown, toggle). |
| NFR-ACC-03 | Navigasi penuh via keyboard (Tab, Enter, Esc untuk modal). |
| NFR-ACC-04 | Color contrast ratio WCAG AA (≥ 4.5:1 untuk teks normal). |
| NFR-ACC-05 | Focus management pada modal (trap focus, return focus on close). |
| NFR-ACC-06 | Label eksplisit pada setiap input form. |

---

## Bab 6 — Analisis Use Case

### 6.1 Aktor

| Aktor | Deskripsi |
|-------|-----------|
| **Admin** | Pengguna terdaftar dengan role `admin`; akses penuh. |
| **Pegawai** | Pengguna terdaftar dengan role `pegawai`; akses terbatas. |
| **Sistem (Backend)** | Aktor sekunder yang menangani autentikasi, persistence, dan recompute status. |

### 6.2 Daftar Use Case

| Kode | Use Case | Aktor Utama | Modul |
|------|----------|-------------|-------|
| UC-01 | Login ke sistem | Admin, Pegawai | AUT |
| UC-02 | Logout | Admin, Pegawai | AUT |
| UC-03 | Melihat dashboard | Admin, Pegawai | DASH |
| UC-04 | Membuat pesanan baru | Admin, Pegawai | ORD |
| UC-05 | Melihat daftar pesanan | Admin, Pegawai | ORD |
| UC-06 | Melihat detail pesanan | Admin, Pegawai | ORD |
| UC-07 | Mengubah status pesanan | Admin, Pegawai | ORD |
| UC-08 | Mencatat pembayaran dari order | Admin, Pegawai | PAY |
| UC-09 | Mengedit pesanan | Admin, Pegawai (pemilik) | ORD |
| UC-10 | Menghapus pesanan | Admin | ORD |
| UC-11 | CRUD Pelanggan | Admin, Pegawai | CUST |
| UC-12 | CRUD Layanan | Admin | SRV |
| UC-13 | Melihat daftar layanan (read-only) | Pegawai | SRV |
| UC-14 | Edit/Hapus Pembayaran | Admin | PAY |
| UC-15 | CRUD Pengguna | Admin | USR |
| UC-16 | Melihat profil sendiri | Admin, Pegawai | PRF |

### 6.3 Use Case Detail (Contoh Tergambar)

#### UC-04 — Membuat Pesanan Baru

| Atribut | Detail |
|---------|--------|
| **Aktor Utama** | Admin / Pegawai |
| **Pre-kondisi** | Pengguna sudah login. |
| **Post-kondisi (sukses)** | Pesanan baru tercipta dengan status `pending` & payment_status `unpaid`; audit log awal tercipta. |
| **Flow Utama** | 1. Pengguna klik "+ Buat Pesanan Baru".<br>2. Sistem tampilkan form 3-langkah.<br>3. Pengguna memilih pelanggan (atau membuat baru via modal).<br>4. Pengguna menambahkan ≥1 item layanan dengan quantity.<br>5. Pengguna (opsional) mengisi catatan.<br>6. Pengguna klik "Simpan Pesanan".<br>7. Sistem memanggil `POST /orders`.<br>8. Sistem mengarahkan ke detail pesanan baru. |
| **Alternate Flow** | A1: Pelanggan belum terdaftar → buka modal SCR-07 → simpan → pelanggan terpilih otomatis.<br>A2: Validasi gagal → tampilkan error per field tanpa submit. |
| **Exception Flow** | E1: API error → tampilkan toast error, tetap di form. |

#### UC-07 — Mengubah Status Pesanan

| Atribut | Detail |
|---------|--------|
| **Aktor Utama** | Admin / Pegawai (pemilik) |
| **Pre-kondisi** | Status order bukan terminal. |
| **Post-kondisi (sukses)** | Status order berubah; audit log baru tercipta. |
| **Flow Utama** | 1. Pengguna buka detail pesanan.<br>2. Klik "Ubah Status".<br>3. Pilih status baru dari dropdown.<br>4. Klik "Simpan".<br>5. Sistem memanggil `PATCH /orders/:id/status`.<br>6. Halaman di-refresh; timeline audit diperbarui. |
| **Exception Flow** | E1: Status terminal → tombol dinonaktifkan; tidak dapat diakses. |

### 6.4 Matriks Aksi × Role

| Aksi | Admin | Pegawai |
|------|:-----:|:-------:|
| Lihat semua pesanan | ✓ | ✗ (hanya miliknya) |
| Buat pesanan | ✓ | ✓ |
| Ubah status pesanan | ✓ | ✓ (miliknya) |
| Hapus pesanan | ✓ | ✗ |
| CRUD pelanggan | ✓ | ✓ |
| CRUD layanan | ✓ | ✗ (read-only) |
| Edit/hapus pembayaran | ✓ | ✗ |
| Catat pembayaran dari order | ✓ | ✓ |
| CRUD pengguna | ✓ | ✗ |
| Lihat statistik semua | ✓ | ✗ (miliknya) |

---

## Bab 7 — Aturan Bisnis & Constraint

### 7.1 Aturan Bisnis (Business Rules)

| Kode | Aturan |
|------|--------|
| BR-01 | Alur status order: `pending` → `dicuci` → `disetrika` → `siap` → `diambil`. Status `cancelled` dapat dicapai dari status non-terminal manapun. |
| BR-02 | Status `diambil` dan `cancelled` bersifat terminal; tidak dapat diubah lagi oleh siapapun. |
| BR-03 | Setiap perubahan status order wajib menciptakan entri pada `audit_logs` (old_status, new_status, changed_by, changed_at). |
| BR-04 | `payment_status` dihitung otomatis backend: `unpaid` (total bayar = 0), `partial` (0 < total < total harga), `paid` (total ≥ total harga). |
| BR-05 | Recompute `payment_status` wajib dipicu pada setiap insert/update/delete pembayaran. |
| BR-06 | Pelanggan yang memiliki pesanan terkait tidak boleh dihapus (FK RESTRICT). |
| BR-07 | Layanan yang sudah dipakai pada `order_items` tidak boleh dihapus secara fisik (FK RESTRICT); gunakan toggle `active=false` sebagai soft-delete. |
| BR-08 | Pengguna tidak boleh menghapus akunnya sendiri. |
| BR-09 | `user_id` pada pesanan baru wajib otomatis terisi dari pengguna yang sedang login. |
| BR-10 | Pegawai hanya boleh melihat/mengelola pesanan dengan `user_id` = dirinya. |
| BR-11 | WhatsApp pelanggan harus unik. |
| BR-12 | Username harus unik. |
| BR-13 | Harga layanan harus > 0. |
| BR-14 | Quantity item harus > 0 dan mendukung desimal (mis. 2.5 kg). |

### 7.2 Constraint Data

| Kode | Constraint |
|------|------------|
| DC-01 | Username: VARCHAR(50), regex `^[a-zA-Z0-9_]+$`, panjang 3–50. |
| DC-02 | Password: minimal 6 karakter (panjang bcrypt hash 255). |
| DC-03 | Nama pelanggan: VARCHAR(100), NOT NULL. |
| DC-04 | WhatsApp: VARCHAR(20), format `^628\d{7,11}$`, UNIQUE. |
| DC-05 | Nama layanan: VARCHAR(100), NOT NULL. |
| DC-06 | Harga layanan: DECIMAL(10,2), > 0. |
| DC-07 | Enum satuan: `kg`, `piece`, `meter`, `pair`, `item`. |
| DC-08 | Enum status order: `pending`, `dicuci`, `disetrika`, `siap`, `diambil`, `cancelled`. |
| DC-09 | Enum payment_status: `unpaid`, `partial`, `paid`. |
| DC-10 | Enum metode pembayaran: `cash`, `transfer`, `ewallet`. |
| DC-11 | Enum role: `admin`, `pegawai`. |
| DC-12 | Quantity: DECIMAL(10,2). |
| DC-13 | Total harga: DECIMAL(12,2). |

---

## Bab 8 — Lampiran

### 8.1 Skema Database (Ringkas)

Tujuh tabel relasional:

- **users** (id PK, username UNIQUE, password, role, created_at)
- **customers** (id PK, name, whatsapp UNIQUE, address, created_at)
- **services** (id PK, name, price, unit, active, created_at)
- **orders** (id PK, customer_id FK→customers, user_id FK→users, status, payment_status, total_price, notes, created_at, updated_at)
- **order_items** (id PK, order_id FK→orders CASCADE, service_id FK→services RESTRICT, quantity, subtotal)
- **payments** (id PK, order_id FK→orders CASCADE, amount, method, note, created_at)
- **audit_logs** (id PK, order_id FK→orders CASCADE, old_status, new_status, changed_by FK→users RESTRICT, changed_at)

### 8.2 Struktur Folder Frontend (Target)

```
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── (auth)/login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx                         # Dashboard
│       ├── orders/{page,new/page,[id]/page}
│       ├── customers/{page,new/page,[id]/edit/page}
│       ├── services/{page,new/page,[id]/edit/page}
│       ├── payments/{page,[id]/page}
│       ├── users/{page,new/page,[id]/edit/page}
│       └── profile/page.tsx
├── components/{layout,ui,forms}/
├── lib/{api.ts,auth.ts,constants.ts,validators.ts}
├── hooks/{useAuth,useApi,useToast}
├── context/{AuthContext,ToastContext}
└── types/index.ts
```

### 8.3 API Endpoint (32 Endpoint)

| Modul | Endpoint | Jumlah |
|-------|----------|--------|
| Auth | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout` | 4 |
| Users | GET/POST `/users`, GET/PATCH/DELETE `/users/:id` | 5 |
| Customers | GET/POST `/customers`, GET/PATCH/DELETE `/customers/:id` | 5 |
| Orders | GET/POST `/orders`, GET/PATCH/DELETE `/orders/:id`, PATCH `/orders/:id/status`, POST `/orders/:id/payments` | 7 |
| Services | GET/POST `/services`, GET/PATCH/DELETE `/services/:id` | 5 |
| Payments | GET/POST `/payments`, GET/PATCH/DELETE `/payments/:id` | 5 |
| Stats | GET `/stats/dashboard` | 1 |
| **Total** | | **32** |

### 8.4 Katalog Seed Data

**Users default:** `admin`/`password123` (admin), `pegawai1`/`password123` (pegawai).

**Layanan default (10):**

| Layanan | Harga | Satuan |
|---------|-------|--------|
| Cuci Kiloan Reguler | 7.000 | kg |
| Cuci Kiloan Express | 12.000 | kg |
| Setrika Saja | 5.000 | kg |
| Cuci + Setrika Premium | 15.000 | kg |
| Cuci Bedcover | 25.000 | piece |
| Cuci Boneka | 15.000 | piece |
| Cuci Sepatu | 20.000 | pair |
| Cuci Tas | 18.000 | piece |
| Dry Cleaning | 35.000 | piece |
| Cuci Karpet | 10.000 | meter |

### 8.5 Matriks Traceability (Ringkas)

| Sumber Kebutuhan | ID SRS | Realisasi |
|------------------|--------|-----------|
| PRD §6 SCR-01 | FR-AUT-01…13 | `/login`, AuthContext |
| PRD §6 SCR-02 | FR-DASH-01…11 | `/` Dashboard |
| PRD §6 SCR-03 | FR-ORD-01…10 | `/orders` |
| PRD §6 SCR-04 | FR-ORD-11…23 | `/orders/new` |
| PRD §6 SCR-05 | FR-ORD-24…36 | `/orders/:id` |
| PRD §6 SCR-06,07 | FR-CUST-01…15 | `/customers*` |
| PRD §6 SCR-08,09 | FR-SRV-01…12 | `/services*` |
| PRD §6 SCR-10,11 | FR-PAY-01…16 | `/payments*` |
| PRD §6 SCR-12,13 | FR-USR-01…11 | `/users*` |
| PRD §6 SCR-14 | FR-PRF-01…04 | `/profile` |
| PRD §9 RBAC | BR-08, BR-10; NFR-SEC-04 | Sidebar, middleware, route guard |
| PRD §13 NFR | NFR-PERF…ACC | Global |

### 8.6 Milestone (Ringkas)

| Fase | Lingkup |
|------|---------|
| **Fase 1 — Foundation** | Struktur folder, AuthContext, API client, Sidebar/Topbar/Layout, komponen shared (DataTable, StatusBadge, Modal, Toast). |
| **Fase 2 — Core Screens** | SCR-01 Login, SCR-02 Dashboard, SCR-03 Daftar Pesanan, SCR-04 Buat Pesanan, SCR-05 Detail Pesanan. |
| **Fase 3 — Management Screens** | SCR-06/07 Pelanggan, SCR-08/09 Layanan, SCR-10/11 Pembayaran, SCR-12/13 Pengguna, SCR-14 Profil. |
| **Fase 4 — Polish & Testing** | Enforce RBAC menyeluruh, responsive testing, error handling, loading/empty states, integration testing. |

### 8.7 Risiko Pengembangan

| # | Risiko | Mitigasi |
|---|--------|----------|
| R-01 | Next.js 16 breaking changes dari versi sebelumnya | Baca `node_modules/next/dist/docs/`, gunakan App Router pattern. |
| R-02 | Tailwind v4 berbeda dari v3 | Gunakan `@theme inline` + `@import "tailwindcss"`. |
| R-03 | React 19 + React Compiler compatibility | Test inkremental; `reactCompiler: true` di `next.config.ts`. |
| R-04 | Kompleksitas SCR-04 (multi-step + modal) | Pecah menjadi sub-komponen; ikuti referensi UI. |
| R-05 | Kompleksitas SCR-05 (4 modal workflow) | State `activeModal` string; break ke sub-komponen. |

### 8.8 Glosarium Tambahan

| Istilah | Definisi |
|---------|----------|
| **Soft delete** | Penonaktifan data tanpa menghapus fisik (via flag `active`). |
| **Hard delete** | Penghapusan fisik dari database. |
| **Recompute** | Perhitungan ulang otomatis di backend (mis. `payment_status`). |
| **Sticky panel** | Elemen yang tetap visible saat scroll (`position: sticky`). |
| **Skeleton loader** | Placeholder beranimasi yang menyerupai konten akhir. |

---

*Dokumen SRS ini merupakan kontrak teknis tunggal untuk pengembangan Washpos. Setiap perubahan kebutuhan wajib melalui mekanisme change request dan memperbarui dokumen ini dengan penomoran versi yang baru.*

**Akhir Dokumen SRS Washpos v1.0 — 2026-06-12**
