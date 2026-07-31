# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# WASHPOS — Laundry Management System

| Metadata | Detail |
|----------|--------|
| **Produk** | Washpos |
| **Versi Dokumen** | 1.0 |
| **Tanggal** | 2026-06-12 |
| **Tim** | TIM 03 — Rekayasa Web |
| **Konteks** | Tugas Mata Kuliah Rekayasa Web, Semester 4 Informatika |
| **Status** | Development |

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Tujuan Produk](#2-tujuan-produk)
3. [Stakeholder & Pengguna](#3-stakeholder--pengguna)
4. [Tech Stack & Arsitektur](#4-tech-stack--arsitektur)
5. [Cakupan Fitur](#5-cakupan-fitur)
6. [Spesifikasi Fungsional — 14 Screen](#6-spesifikasi-fungsional--14-screen)
7. [Komponen Shared UI](#7-komponen-shared-ui)
8. [Alur Bisnis & Status](#8-alur-bisnis--status)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [API Endpoint Reference](#10-api-endpoint-reference)
11. [Skema Database](#11-skema-database)
12. [Peta Navigasi Antar Screen](#12-peta-navigasi-antar-screen)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Milestone & Fase Pengembangan](#14-milestone--fase-pengembangan)
15. [Risiko & Asumsi](#15-risiko--asumsi)
16. [Glossary](#16-glossary)

---

## 1. Ringkasan Eksekutif

**Washpos** adalah aplikasi web manajemen laundry untuk UMKM (Usaha Mikro, Kecil, dan Menengah). Sistem mencakup pengelolaan pesanan laundry, pelanggan, layanan, pembayaran, dan pengguna dengan dua peran akses: **Admin** (akses penuh) dan **Pegawai** (akses terbatas).

Produk ini dibangun sebagai **full-stack web application** dengan arsitektur:
- **Backend:** Express.js REST API + MySQL 8.0
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4

Backend sudah 100% selesai dengan 30 endpoint API. Frontend dalam tahap awal pengembangan (fresh Next.js scaffold) dengan 14 screen yang sudah dispesifikasikan dan file referensi UI yang lengkap.

---

## 2. Tujuan Produk

### 2.1 Problem Statement

UMKM laundry masih banyak mengelola operasional secara manual (buku tulis, catatan kertas), menyebabkan:
- Kesulitan melacak status pesanan
- Kehilangan data pelanggan
- Tidak ada rekam jejak pembayaran
- Sulit memantau performa bisnis

### 2.2 Tujuan

1. **Digitalisasi operasional laundry** — mengganti pencatatan manual dengan sistem digital
2. **Tracking pesanan end-to-end** — dari masuk hingga diambil, dengan audit trail
3. **Manajemen pembayaran terstruktur** — mencatat pembayaran parsial maupun lunas
4. **Role-based access** — membedakan hak akses admin dan pegawai
5. **Dashboard operasional** — ringkasan statistik untuk pengambilan keputusan

### 2.3 Success Metrics

| Metrik | Target |
|--------|--------|
| Semua 14 screen berfungsi sesuai spesifikasi | 100% |
| Terintegrasi penuh dengan backend API | 30/30 endpoint |
| RBAC berfungsi benar (Admin vs Pegawai) | 2 role |
| Responsive di desktop dan mobile | Breakpoint 640px, 768px, 1024px |
| Build production tanpa error | 0 error |

---

## 3. Stakeholder & Pengguna

### 3.1 Stakeholder

| Stakeholder | Peran |
|-------------|-------|
| Dosen Rekayasa Web | Penilai tugas |
| TIM 03 | Tim pengembang |

### 3.2 User Persona

#### Persona 1: Admin (Pemilik Laundry)

- **Profil:** Pemilik UMKM laundry, mengelola seluruh aspek bisnis
- **Kebutuhan:** Akses penuh ke semua data, bisa mengelola layanan, pengguna, dan melihat seluruh pesanan
- **Alur utama:** Login → Dashboard → Kelola Pesanan → Kelola Pegawai → Review Pembayaran

#### Persona 2: Pegawai (Staff Laundry)

- **Profil:** Karyawan yang menerima dan memproses pesanan
- **Kebutuhan:** Melihat pesanan miliknya, update status pesanan, mencatat pembayaran
- **Batasan:** Tidak bisa mengelola pengguna, edit/hapus pembayaran, atau CRUD layanan

### 3.3 Matriks Akses

| Screen | Admin | Pegawai | Catatan |
|--------|:-----:|:-------:|---------|
| SCR-01 Login | Ya | Ya | Halaman publik |
| SCR-02 Dashboard | Semua data | Data sendiri | Difilter berdasarkan role |
| SCR-03 Daftar Pesanan | Semua order | Order sendiri | Pegawai: filter by user_id |
| SCR-04 Buat Pesanan | Ya | Ya | user_id = yang login |
| SCR-05 Detail Pesanan | Semua order | Order sendiri | Pegawai: hanya miliknya |
| SCR-06 Daftar Pelanggan | Ya | Ya | Akses sama |
| SCR-07 Form Pelanggan | Ya | Ya | Akses sama |
| SCR-08 Daftar Layanan | CRUD | Read-only | Pegawai tanpa tombol aksi |
| SCR-09 Form Layanan | Ya | **Tidak** | Hanya Admin |
| SCR-10 Daftar Pembayaran | CRUD | Read-only | Pegawai tidak bisa edit/hapus |
| SCR-11 Detail Pembayaran | Ya | **Tidak** | Hanya Admin |
| SCR-12 Daftar Pengguna | Ya | **Tidak** | Hanya Admin |
| SCR-13 Form Pengguna | Ya | **Tidak** | Hanya Admin |
| SCR-14 Profil Saya | Ya | Ya | Akses sama |

---

## 4. Tech Stack & Arsitektur

### 4.1 Technology Stack

| Layer | Teknologi | Versi | Fungsi |
|-------|-----------|-------|--------|
| **Frontend Framework** | Next.js (App Router) | 16.2.9 | SSR, routing, file-based routing |
| **UI Library** | React | 19.2.4 | Komponen UI, hooks |
| **Language** | TypeScript | ^5 | Type safety |
| **Styling** | Tailwind CSS | ^4 | Utility-first CSS |
| **Icons** | Lucide React | — | Icon library |
| **Optimization** | React Compiler | 1.0.0 | Auto memoization via Babel |
| **Backend Framework** | Express.js | 4.18 | REST API server |
| **Database** | MySQL | 8.0 | Relational data storage |
| **Auth** | JWT (HS256) | — | Token-based authentication |
| **Password** | bcryptjs | — | Password hashing |
| **API Docs** | Swagger UI | — | Interactive API documentation |
| **Containerization** | Docker + Docker Compose | — | MySQL containerization |

### 4.2 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│            Next.js 16 (App Router)                   │
│         React 19 + TypeScript + Tailwind 4           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Pages    │  │ Shared   │  │  Utilities       │   │
│  │ (14       │  │ Components│  │  - API Client    │   │
│  │ screens)  │  │ - Sidebar │  │  - Auth Context  │   │
│  │           │  │ - Topbar  │  │  - Formatters    │   │
│  │           │  │ - DataTable│  │  - Validators    │   │
│  │           │  │ - Badge   │  │  - Constants     │   │
│  │           │  │ - Modal   │  │                  │   │
│  │           │  │ - Toast   │  │                  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (REST API)
                     │ Authorization: Bearer <JWT>
                     ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│              Express.js REST API                     │
│                    Port 5000                         │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Routes   │  │Middleware│  │   Controllers    │   │
│  │  (7       │  │ - CORS   │  │  (Business       │   │
│  │  modules) │  │ - JWT    │  │   Logic)         │   │
│  │           │  │ - RBAC   │  │                  │   │
│  │           │  │ - Valid. │  │                  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                           │                          │
│                    ┌──────┴──────┐                    │
│                    │   Queries   │                    │
│                    │  (Raw SQL)  │                    │
│                    └──────┬──────┘                    │
└───────────────────────────┼──────────────────────────┘
                            │ mysql2 (Promise Pool)
                            ▼
┌─────────────────────────────────────────────────────┐
│                   DATABASE                           │
│              MySQL 8.0 (Docker)                      │
│              Port 3307 (host)                        │
│                                                      │
│  Tables: users, customers, services, orders,         │
│          order_items, payments, audit_logs            │
└─────────────────────────────────────────────────────┘
```

### 4.3 Request Flow

```
HTTP Request
  → CORS/JSON Parser
  → Route Matcher
  → [protect] JWT Middleware (validasi token)
  → [authorize(...roles)] RBAC Middleware (cek role)
  → Validation (express-validator)
  → Controller (business logic)
  → Query (raw SQL via mysql2 pool)
  → MySQL Database
  → Standardized JSON Response
```

### 4.4 Standard Response Format

```json
// Success
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Error description"
}

// Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "username", "message": "Username is required" }
  ]
}
```

### 4.5 Frontend Project Structure (Target)

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles + Tailwind
│   │   ├── (auth)/                   # Auth group (no sidebar)
│   │   │   └── login/
│   │   │       └── page.tsx          # SCR-01 Login
│   │   └── (dashboard)/              # Dashboard group (with sidebar)
│   │       ├── layout.tsx            # Sidebar + Topbar layout
│   │       ├── page.tsx              # SCR-02 Dashboard
│   │       ├── orders/
│   │       │   ├── page.tsx          # SCR-03 Daftar Pesanan
│   │       │   ├── new/
│   │       │   │   └── page.tsx      # SCR-04 Buat Pesanan
│   │       │   └── [id]/
│   │       │       └── page.tsx      # SCR-05 Detail Pesanan
│   │       ├── customers/
│   │       │   ├── page.tsx          # SCR-06 Daftar Pelanggan
│   │       │   ├── new/
│   │       │   │   └── page.tsx      # SCR-07 Form Pelanggan (Create)
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx  # SCR-07 Form Pelanggan (Edit)
│   │       ├── services/
│   │       │   ├── page.tsx          # SCR-08 Daftar Layanan
│   │       │   ├── new/
│   │       │   │   └── page.tsx      # SCR-09 Form Layanan (Create)
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx  # SCR-09 Form Layanan (Edit)
│   │       ├── payments/
│   │       │   ├── page.tsx          # SCR-10 Daftar Pembayaran
│   │       │   └── [id]/
│   │       │       └── page.tsx      # SCR-11 Detail Pembayaran
│   │       ├── users/
│   │       │   ├── page.tsx          # SCR-12 Daftar Pengguna
│   │       │   ├── new/
│   │       │   │   └── page.tsx      # SCR-13 Form Pengguna (Create)
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx  # SCR-13 Form Pengguna (Edit)
│   │       └── profile/
│   │           └── page.tsx          # SCR-14 Profil Saya
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Sidebar navigation
│   │   │   ├── Topbar.tsx            # Top bar
│   │   │   └── Breadcrumb.tsx        # Breadcrumb navigation
│   │   ├── ui/
│   │   │   ├── DataTable.tsx         # Reusable table
│   │   │   ├── StatusBadge.tsx       # Status badge (all types)
│   │   │   ├── Modal.tsx             # Reusable modal/dialog
│   │   │   ├── Toast.tsx             # Toast notification
│   │   │   ├── EmptyState.tsx        # Empty state component
│   │   │   ├── LoadingSpinner.tsx    # Loading indicator
│   │   │   ├── ConfirmDialog.tsx     # Confirmation dialog
│   │   │   └── Pagination.tsx        # Pagination component
│   │   └── forms/
│   │       ├── CustomerForm.tsx      # Form pelanggan (reusable)
│   │       └── PaymentForm.tsx       # Form pembayaran (reusable)
│   ├── lib/
│   │   ├── api.ts                    # API client (fetch wrapper)
│   │   ├── auth.ts                   # Auth utilities (token management)
│   │   ├── constants.ts              # Status constants, colors, routes
│   │   └── validators.ts             # Form validation rules
│   ├── hooks/
│   │   ├── useAuth.ts                # Auth hook (login, logout, user)
│   │   ├── useApi.ts                 # Data fetching hook
│   │   └── useToast.ts               # Toast notification hook
│   ├── context/
│   │   ├── AuthContext.tsx            # Auth state provider
│   │   └── ToastContext.tsx           # Toast state provider
│   └── types/
│       └── index.ts                  # TypeScript type definitions
├── public/
│   └── logo.svg                      # Washpos logo
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Cakupan Fitur

### 5.1 In Scope (Fase 1 — Saat Ini)

| # | Fitur | Modul | Prioritas |
|---|-------|-------|-----------|
| 1 | Autentikasi (Login/Logout) | Auth | P0 |
| 2 | Dashboard dengan statistik | Dashboard | P0 |
| 3 | CRUD Pesanan + Status Flow | Orders | P0 |
| 4 | CRUD Pelanggan | Customers | P0 |
| 5 | CRUD Layanan (Admin), Read (Pegawai) | Services | P0 |
| 6 | Pembayaran + Payment Status Auto-Update | Payments | P0 |
| 7 | CRUD Pengguna (Admin only) | Users | P1 |
| 8 | Profil Pengguna | Profile | P1 |
| 9 | Role-Based Access Control | Auth | P0 |
| 10 | Audit Trail (Log Perubahan Status) | Orders | P1 |

### 5.2 Out of Scope

| Fitur | Alasan |
|-------|--------|
| Notifikasi WhatsApp | Kompleksitas integrasi pihak ketiga |
| Multi-branch / Multi-outlet | Di luar cakupan UMKM single outlet |
| Laporan/Export PDF/Excel | Bisa ditambahkan di fase berikutnya |
| Real-time notification (WebSocket) | Tidak diperlukan untuk skala UMKM |
| Mobile native app | Cukup responsive web app |
| Dark mode toggle | Menggunakan prefers-color-scheme saja |
| Multi-language (i18n) | Bahasa Indonesia saja |

---

## 6. Spesifikasi Fungsional — 14 Screen

### SCR-01: Login

| Atribut | Detail |
|---------|--------|
| **Route** | `/login` |
| **Akses** | Public |
| **API** | `POST /auth/login` |
| **Layout** | Full-screen (tanpa sidebar/topbar) |

**UI Elements:**
- Logo Washpos + tagline
- Input username (wajib)
- Input password dengan toggle show/hide (wajib)
- Checkbox "Ingat Saya"
- Tombol "Masuk"
- Alert area untuk pesan error

**Behavior:**
- User memasukkan kredensial → sistem validasi → JWT token dikembalikan
- Token disimpan di client (localStorage)
- Redirect ke Dashboard (SCR-02) setelah berhasil
- Jika gagal, tampilkan pesan error

**Validasi Frontend:**
- Username: wajib diisi
- Password: wajib diisi

**Redirect:**
| Kondisi | Tujuan |
|---------|--------|
| Login berhasil | → SCR-02 Dashboard |
| User sudah login akses /login | → SCR-02 Dashboard |

---

### SCR-02: Dashboard

| Atribut | Detail |
|---------|--------|
| **Route** | `/` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /stats/dashboard` |
| **Layout** | Sidebar + Topbar + Content |

**UI Elements:**

1. **4 Stat Cards:**
   - Total Pesanan Hari Ini (angka)
   - Total Pendapatan Hari Ini (format Rupiah)
   - Pesanan Aktif (status bukan diambil/cancelled)
   - Pesanan Siap Diambil (status: siap)

2. **Chart Distribusi Status Order:**
   - Bar chart atau donut chart
   - Menampilkan jumlah order per status: pending, dicuci, disetrika, siap, diambil, cancelled

3. **Tabel Pesanan Terbaru:**
   - Kolom: No. Order, Nama Pelanggan, Status, Total Harga, Tanggal
   - 5-10 pesanan terakhir, baris bisa diklik

**Role-Based Data:**
- Admin: semua data
- Pegawai: hanya order milik sendiri

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| Klik baris pesanan terbaru | → SCR-05 Detail Pesanan |
| Klik card "Pesanan Aktif" | → SCR-03 dengan filter aktif |
| Klik card "Siap Diambil" | → SCR-03 dengan filter status=siap |
| Tombol "Buat Pesanan Baru" | → SCR-04 Buat Pesanan |

---

### SCR-03: Daftar Pesanan

| Atribut | Detail |
|---------|--------|
| **Route** | `/orders` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /orders` |

**UI Elements:**

1. **Header:** Judul "Pesanan" + tombol "+ Buat Pesanan Baru"

2. **Filter Bar:**
   - Dropdown status: Semua / Pending / Dicuci / Disetrika / Siap / Diambil / Cancelled
   - Dropdown pelanggan (opsional)
   - Search field: nama pelanggan atau ID order

3. **Tabel Pesanan:**
   - Kolom: ID Order, Nama Pelanggan, No. WhatsApp, Tanggal, Status (badge), Status Bayar (badge), Total Harga, Ditangani Oleh (Admin only), Aksi
   - Pagination
   - Badge warna per status

**Badge Color Map:**

| Status Order | Warna | Status Bayar | Warna |
|--------------|-------|--------------|-------|
| Pending | Kuning (yellow) | Unpaid | Merah (red) |
| Dicuci | Biru (blue) | Partial | Kuning (yellow) |
| Disetrika | Ungu (purple) | Paid | Hijau (emerald) |
| Siap | Hijau (emerald) | | |
| Diambil | Abu-abu (slate) | | |
| Cancelled | Merah (red) | | |

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| Klik "+ Buat Pesanan Baru" | → SCR-04 |
| Klik baris pesanan | → SCR-05 dengan ID order |
| Ubah filter | → Reload data dengan query parameter |
| Klik halaman pagination | → Load halaman berikutnya |

---

### SCR-04: Buat Pesanan

| Atribut | Detail |
|---------|--------|
| **Route** | `/orders/new` |
| **Akses** | Admin, Pegawai |
| **API** | `POST /orders`, `GET /customers`, `GET /services?active_only=true` |

**UI Elements:**

**Step 1 — Pilih Pelanggan:**
- Search field: cari berdasarkan nama/WhatsApp
- Dropdown/autocomplete: pilih pelanggan yang ada
- Tombol "+ Tambah Pelanggan Baru" → buka modal SCR-07
- Info pelanggan terpilih: Nama, WhatsApp, Alamat

**Step 2 — Tambah Layanan (Item):**
- Tabel dinamis:
  - Dropdown pilih layanan (hanya active)
  - Input quantity (angka desimal, misal 2.5 kg)
  - Auto-calculate: harga satuan × quantity = subtotal
- Tombol "+ Tambah Item"
- Tombol hapus per item
- Total harga dihitung real-time

**Step 3 — Catatan (Opsional):**
- Textarea untuk catatan pesanan

**Ringkasan Pesanan:**
- Nama pelanggan
- Daftar item + subtotal
- Total harga
- Catatan

**Tombol Aksi:**
- "Simpan Pesanan"
- "Batal"

**Validasi Frontend:**
- Pelanggan wajib dipilih
- Minimal 1 item layanan
- Quantity > 0
- Layanan harus active

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "+ Tambah Pelanggan Baru" | → Modal SCR-07 sebagai popup |
| Pelanggan berhasil dibuat di modal | → Otomatis terpilih di Step 1 |
| "Simpan Pesanan" berhasil | → SCR-05 Detail Pesanan baru |
| "Batal" | → SCR-03 Daftar Pesanan |

---

### SCR-05: Detail Pesanan

| Atribut | Detail |
|---------|--------|
| **Route** | `/orders/:id` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /orders/:id`, `PATCH /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/payments`, `DELETE /orders/:id` |

**UI Elements:**

**Header:**
- Judul "Pesanan #ID"
- Badge status order + badge payment status
- Tombol aksi: "Ubah Status", "Catat Pembayaran", "Edit Pesanan", "Hapus Pesanan" (Admin only)

**Info Pesanan (Card):**
- Nama Pelanggan + link
- No. WhatsApp, Alamat
- Staff yang menangani
- Tanggal dibuat, Catatan

**Daftar Item Pesanan (Tabel):**
- Kolom: No, Nama Layanan, Quantity + Satuan, Harga Satuan, Subtotal
- Baris total

**Riwayat Pembayaran (Card):**
- Tabel: Tanggal, Jumlah (Rp), Metode, Catatan
- Total terbayar vs Total pesanan
- Sisa yang harus dibayar
- Tombol "+ Catat Pembayaran"

**Audit Trail (Timeline):**
- Timeline vertikal: status lama → status baru, oleh siapa, kapan
- Urutan terbaru ke terlama

**4 Modal:**

1. **Ubah Status** — Dropdown status baru, tombol "Simpan". Disabled jika order sudah `diambil`/`cancelled`
2. **Catat Pembayaran** — Input jumlah (Rp), dropdown metode (Cash/Transfer/E-Wallet), textarea catatan, tombol "Simpan Pembayaran"
3. **Edit Pesanan** — Dropdown ganti pelanggan, textarea edit catatan, tombol "Simpan Perubahan"
4. **Hapus Pesanan** (Admin only) — Konfirmasi dialog

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| Klik nama pelanggan | → SCR-07 Form Pelanggan |
| "Ubah Status" berhasil | → Refresh SCR-05 |
| "Catat Pembayaran" berhasil | → Refresh SCR-05 |
| "Edit Pesanan" berhasil | → Refresh SCR-05 |
| "Hapus Pesanan" (Admin) | → Konfirmasi → SCR-03 |
| Breadcrumb "Pesanan" | → SCR-03 |

---

### SCR-06: Daftar Pelanggan

| Atribut | Detail |
|---------|--------|
| **Route** | `/customers` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /customers` |

**UI Elements:**

1. **Header:** Judul "Pelanggan" + tombol "+ Tambah Pelanggan"

2. **Search Bar:** cari berdasarkan nama atau WhatsApp

3. **Tabel Pelanggan:**
   - Kolom: ID, Nama, WhatsApp, Alamat, Jumlah Pesanan, Tanggal Terdaftar, Aksi
   - Aksi per baris: Edit (pensil), Hapus (tempat sampah — disabled jika punya pesanan)
   - Pagination

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "+ Tambah Pelanggan" | → SCR-07 mode tambah |
| "Edit" | → SCR-07 mode edit |
| "Hapus" | → Konfirmasi → delete atau error |
| Klik baris pelanggan | → SCR-03 terfilter per pelanggan |

---

### SCR-07: Form Pelanggan (Create / Edit)

| Atribut | Detail |
|---------|--------|
| **Route** | `/customers/new` atau `/customers/:id/edit` |
| **Akses** | Admin, Pegawai |
| **API** | `POST /customers` atau `PATCH /customers/:id`, `GET /customers/:id` |

**UI Elements:**
- Judul: "Tambah Pelanggan Baru" / "Edit Pelanggan"
- Input Nama (wajib, max 100 karakter)
- Input WhatsApp (wajib, format 628xxxxxxxxxx)
- Textarea Alamat (opsional)
- Tombol "Simpan" / "Batal"

**Validasi Frontend:**
- Nama: wajib, maks 100 karakter
- WhatsApp: wajib, regex `^628\d{7,11}$`

**Mode Modal:**
- Juga bisa ditampilkan sebagai modal/popup dari SCR-04 (Buat Pesanan)
- Jika modal: setelah simpan, pelanggan langsung terpilih di form pesanan

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "Simpan" berhasil (halaman) | → SCR-06 Daftar Pelanggan |
| "Simpan" berhasil (modal) | → Modal tertutup, pelanggan terpilih |
| "Batal" (halaman) | → SCR-06 Daftar Pelanggan |
| "Batal" (modal) | → Modal tertutup |

---

### SCR-08: Daftar Layanan

| Atribut | Detail |
|---------|--------|
| **Route** | `/services` |
| **Akses** | Admin (CRUD), Pegawai (Read-only) |
| **API** | `GET /services` |

**UI Elements:**

1. **Header:** Judul "Layanan" + tombol "+ Tambah Layanan" (Admin only) + toggle "Tampilkan non-aktif" (Admin only)

2. **Tabel Layanan:**
   - Kolom: ID, Nama Layanan, Harga per Satuan, Satuan, Status (Aktif/Nonaktif), Aksi
   - Aksi Admin: Edit, Hapus, Toggle Aktif/Nonaktif
   - Pegawai: hanya baca, tanpa tombol aksi

3. **Pagination**

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "+ Tambah Layanan" (Admin) | → SCR-09 mode tambah |
| "Edit" (Admin) | → SCR-09 mode edit |
| "Toggle Aktif" (Admin) | → PATCH langsung, refresh |
| "Hapus" (Admin) | → Konfirmasi → delete |

---

### SCR-09: Form Layanan (Create / Edit)

| Atribut | Detail |
|---------|--------|
| **Route** | `/services/new` atau `/services/:id/edit` |
| **Akses** | Admin |
| **API** | `POST /services` atau `PATCH /services/:id`, `GET /services/:id` |

**UI Elements:**
- Judul: "Tambah Layanan Baru" / "Edit Layanan"
- Input Nama Layanan (wajib, max 100 karakter)
- Input Harga (wajib, angka > 0, format Rupiah)
- Dropdown Satuan: kg / piece / meter / pair / item
- Toggle Aktif (default: true)
- Tombol "Simpan" / "Batal"

**Validasi Frontend:**
- Nama: wajib, maks 100 karakter
- Harga: wajib, > 0
- Satuan: wajib

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "Simpan" berhasil | → SCR-08 Daftar Layanan |
| "Batal" | → SCR-08 Daftar Layanan |

---

### SCR-10: Daftar Pembayaran

| Atribut | Detail |
|---------|--------|
| **Route** | `/payments` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /payments` |

**UI Elements:**

1. **Header:** Judul "Pembayaran"

2. **Filter Bar:** Dropdown order ID, search ID pembayaran/order

3. **Tabel Pembayaran:**
   - Kolom: ID Pembayaran, ID Order (link), Nama Pelanggan, Jumlah (Rp), Metode (badge), Catatan, Tanggal, Aksi
   - Badge metode: Cash → Hijau, Transfer → Biru, E-Wallet → Ungu
   - Aksi Admin: Edit, Hapus
   - Pegawai: hanya baca

4. **Pagination**

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| Klik ID Order | → SCR-05 Detail Pesanan |
| "Edit" (Admin) | → SCR-11 Detail Pembayaran |
| "Hapus" (Admin) | → Konfirmasi → delete |

---

### SCR-11: Detail Pembayaran (Edit)

| Atribut | Detail |
|---------|--------|
| **Route** | `/payments/:id` |
| **Akses** | Admin |
| **API** | `GET /payments/:id`, `PATCH /payments/:id` |

**UI Elements:**
- Judul "Pembayaran #ID"
- Info order terkait (ID Order, Nama Pelanggan, link)
- Form Edit: Input jumlah, Dropdown metode, Textarea catatan
- Preview: projected payment status setelah edit
- Tombol: "Simpan Perubahan", "Hapus Pembayaran", "Kembali"

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| Klik link order | → SCR-05 |
| "Simpan Perubahan" | → SCR-10 |
| "Hapus Pembayaran" | → Konfirmasi → SCR-10 |
| "Kembali" | → SCR-10 |

---

### SCR-12: Daftar Pengguna

| Atribut | Detail |
|---------|--------|
| **Route** | `/users` |
| **Akses** | Admin |
| **API** | `GET /users` |

**UI Elements:**

1. **Header:** Judul "Pengguna" + tombol "+ Tambah Pengguna"

2. **Search:** cari berdasarkan username

3. **Tabel Pengguna:**
   - Kolom: ID, Username, Role (badge), Tanggal Dibuat, Aksi
   - Badge role: Admin → Orange/Merah, Pegawai → Biru
   - Aksi: Edit, Hapus
   - Baris user yang login: tombol hapus disabled

4. **Pagination**

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "+ Tambah Pengguna" | → SCR-13 mode tambah |
| "Edit" | → SCR-13 mode edit |
| "Hapus" | → Konfirmasi → delete (kecuali akun sendiri) |

---

### SCR-13: Form Pengguna (Create / Edit)

| Atribut | Detail |
|---------|--------|
| **Route** | `/users/new` atau `/users/:id/edit` |
| **Akses** | Admin |
| **API** | `POST /users` atau `PATCH /users/:id`, `GET /users/:id` |

**UI Elements:**
- Judul: "Tambah Pengguna Baru" / "Edit Pengguna"
- Input Username (wajib, 3-50 karakter, alfanumerik + underscore)
- Input Password (wajib saat create min 6 karakter, opsional saat edit)
- Dropdown Role: Admin / Pegawai (dengan visual cards)
- Tombol "Simpan" / "Batal"

**Validasi Frontend:**
- Username: wajib, 3-50 karakter, regex `^[a-zA-Z0-9_]+$`
- Password: wajib create (min 6), opsional edit
- Role: wajib

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "Simpan" berhasil | → SCR-12 Daftar Pengguna |
| "Batal" | → SCR-12 Daftar Pengguna |

---

### SCR-14: Profil Saya

| Atribut | Detail |
|---------|--------|
| **Route** | `/profile` |
| **Akses** | Admin, Pegawai |
| **API** | `GET /auth/me` |

**UI Elements:**
- Info Profil: Username, Role, Terdaftar sejak
- Tombol "Logout"

**Interaksi:**
| Aksi | Tujuan |
|------|--------|
| "Logout" | → Hapus token → SCR-01 Login |

---

## 7. Komponen Shared UI

### 7.1 Sidebar Navigation
- Menu navigasi berdasarkan role (Admin: 6 menu, Pegawai: 5 menu)
- Highlight menu aktif
- Collapsible di mobile (hamburger menu)
- Logo Washpos di atas
- Menu items: Dashboard, Pesanan, Pelanggan, Layanan, Pembayaran, Pengguna (Admin only)

### 7.2 Topbar
- Tombol toggle sidebar
- Info user yang login (username + role badge)
- Dropdown: Profil Saya, Logout

### 7.3 DataTable
- Header + body + pagination
- Loading skeleton saat fetch data
- Empty state ketika data kosong
- Responsive (horizontal scroll di mobile)

### 7.4 StatusBadge
Tipe badge dan warna:

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

### 7.5 Modal / Dialog
- Overlay dengan backdrop blur
- Kartu konten di tengah
- Header (judul + tombol close)
- Body konten
- Footer (action buttons)
- Animasi fade-in

### 7.6 Toast Notification
- Jenis: success (hijau), error (merah), warning (kuning), info (biru)
- Auto-dismiss setelah beberapa detik
- Posisi: top-right

### 7.7 Loading States
- Skeleton loader untuk tabel dan kartu
- Spinner untuk tombol submit
- Disabled state saat loading

### 7.8 Empty State
- Ilustrasi + pesan informatif
- CTA untuk aksi pertama

### 7.9 Breadcrumb
- Navigasi hierarki: Dashboard > Pesanan > Detail Pesanan #5
- Link ke parent pages

### 7.10 ConfirmDialog
- Dialog konfirmasi untuk aksi destruktif (hapus)
- Judul, pesan, tombol Konfirmasi/Batal

---

## 8. Alur Bisnis & Status

### 8.1 Alur Utama

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│  Buat    │───>│ Pending  │───>│  Dicuci   │───>│Disetrika │───>│   Siap   │───> Diambil
│  Order   │    │          │    │           │    │          │    │          │
└──────────┘    └────┬─────┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘
                     │                │               │               │
                     └────────────────┴───────────────┴───────────────┘
                                         │
                                    Cancelled
```

### 8.2 Status Order

| Status | Deskripsi | Terminal? |
|--------|-----------|-----------|
| `pending` | Pesanan baru masuk, belum diproses | Tidak |
| `dicuci` | Sedang dalam proses pencucian | Tidak |
| `disetrika` | Sedang dalam proses setrika | Tidak |
| `siap` | Sudah selesai, siap diambil pelanggan | Tidak |
| `diambil` | Sudah diambil oleh pelanggan | **Ya** |
| `cancelled` | Pesanan dibatalkan | **Ya** |

**Aturan:**
- `diambil` dan `cancelled` adalah terminal state (tidak bisa diubah lagi)
- `cancelled` bisa dicapai dari status apapun selain terminal state
- Setiap perubahan status dicatat di `audit_logs`

### 8.3 Status Pembayaran

| Status | Kondisi | Auto-calculated? |
|--------|---------|-----------------|
| `unpaid` | Total pembayaran = 0 | Ya |
| `partial` | 0 < Total pembayaran < Total harga | Ya |
| `paid` | Total pembayaran >= Total harga | Ya |

**Aturan:**
- Status pembayaran otomatis terupdate ketika payment ditambah/diedit/dihapus
- Kalkulasi dilakukan di backend

### 8.4 Metode Pembayaran

| Metode | Nilai Enum |
|--------|------------|
| Cash | `cash` |
| Transfer Bank | `transfer` |
| E-Wallet (GoPay, OVO, dll) | `ewallet` |

### 8.5 Satuan Layanan

| Satuan | Nilai Enum | Contoh Penggunaan |
|--------|------------|-------------------|
| Kilogram | `kg` | Cuci kiloan |
| Potong | `piece` | Setrika per potong |
| Meter | `meter` | Gorden, karpet |
| Pasang | `pair` | Sepatu |
| Item | `item` | Bedcover, boneka |

---

## 9. Role-Based Access Control (RBAC)

### 9.1 Mekanisme

```
Login → JWT Token (berisi user_id, username, role)
     → Setiap request: Authorization: Bearer <token>
     → Backend: protect middleware (verify JWT)
     → Backend: authorize middleware (cek role)
```

### 9.2 Perbandingan Role

| Aspek | Admin | Pegawai |
|-------|-------|---------|
| **Pesanan** | Lihat semua, CRUD semua | Lihat milik sendiri, buat & update |
| **Pelanggan** | CRUD penuh | CRUD penuh |
| **Layanan** | CRUD penuh | Read-only |
| **Pembayaran** | CRUD penuh | Lihat + buat dari order |
| **Pengguna** | CRUD penuh | Tidak ada akses |
| **Dashboard** | Statistik semua | Statistik milik sendiri |
| **Hapus Pesanan** | Bisa | Tidak bisa |
| **Hapus Pembayaran** | Bisa | Tidak bisa |

### 9.3 Sidebar Menu per Role

| Menu | Admin | Pegawai |
|------|:-----:|:-------:|
| Dashboard | Ya | Ya |
| Pesanan | Ya | Ya |
| Pelanggan | Ya | Ya |
| Layanan | Ya | Ya |
| Pembayaran | Ya | Ya |
| Pengguna | Ya | **Tidak** |

### 9.4 Implementasi Frontend

- **AuthContext** menyimpan data user (id, username, role) dan token
- **Route Protection:** Redirect ke `/login` jika belum auth
- **Conditional Rendering:** Sembunyikan elemen UI berdasarkan role
- **API Client:** Otomatis attach Bearer token ke setiap request
- **Menu Visibility:** Sidebar merender menu berdasarkan role

---

## 10. API Endpoint Reference

**Base URL:** `http://localhost:5000/api/v1`
**Auth:** `Authorization: Bearer <JWT>`

### 10.1 Authentication (4 endpoints)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/register` | Public | Register user baru |
| GET | `/auth/me` | Ya | Get current user info |
| POST | `/auth/logout` | Ya | Logout (client-side) |

### 10.2 Users (5 endpoints — Admin only)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/users` | List semua user |
| GET | `/users/:id` | Detail user |
| POST | `/users` | Buat user baru |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Hapus user |

### 10.3 Customers (5 endpoints)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/customers` | List (search, page, limit) |
| GET | `/customers/:id` | Detail |
| POST | `/customers` | Buat pelanggan baru |
| PATCH | `/customers/:id` | Update pelanggan |
| DELETE | `/customers/:id` | Hapus (gagal jika punya order) |

### 10.4 Orders (7 endpoints)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/orders` | List (status, customer_id, page, limit) |
| GET | `/orders/:id` | Detail + items + audit logs |
| POST | `/orders` | Buat order + items |
| PATCH | `/orders/:id` | Update (customer_id, notes) |
| PATCH | `/orders/:id/status` | Update status (audit log) |
| POST | `/orders/:id/payments` | Tambah pembayaran |
| DELETE | `/orders/:id` | Hapus order (admin only) |

### 10.5 Services (5 endpoints)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/services` | List layanan |
| GET | `/services/:id` | Detail |
| POST | `/services` | Buat layanan (admin) |
| PATCH | `/services/:id` | Update layanan (admin) |
| DELETE | `/services/:id` | Hapus layanan (admin) |

### 10.6 Payments (5 endpoints)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/payments` | List (order_id, page, limit) |
| GET | `/payments/:id` | Detail (admin) |
| POST | `/payments` | Buat pembayaran (admin) |
| PATCH | `/payments/:id` | Update (admin) |
| DELETE | `/payments/:id` | Hapus (admin) |

### 10.7 Stats (1 endpoint)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/stats/dashboard` | Dashboard stats (role-filtered) |

**Total: 32 endpoints**

---

## 11. Skema Database

### 11.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  customers   │       │   services   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ username     │       │ name         │       │ name         │
│ password     │       │ whatsapp     │       │ price        │
│ role         │       │ address      │       │ unit         │
│ created_at   │       │ created_at   │       │ active       │
└──────┬───────┘       └──────┬───────┘       │ created_at   │
       │                      │               └──────┬───────┘
       │ 1:N                  │ 1:N                  │
       │ (staff)              │ (customer)           │ N:1
       ▼                      ▼                      │
┌──────────────────────────────────────┐             │
│              orders                  │             │
├──────────────────────────────────────┤             │
│ id (PK)                              │             │
│ customer_id (FK → customers.id)      │             │
│ user_id (FK → users.id)              │             │
│ status (pending/dicuci/.../cancelled) │             │
│ payment_status (unpaid/partial/paid) │             │
│ total_price                          │             │
│ notes                                │             │
│ created_at, updated_at               │             │
└───┬──────────────┬──────────────┬────┘             │
    │              │              │                   │
    │ 1:N          │ 1:N          │ 1:N               │
    ▼              ▼              ▼                   │
┌──────────┐ ┌──────────┐ ┌──────────────┐          │
│order_items│ │ payments │ │ audit_logs   │          │
├──────────┤ ├──────────┤ ├──────────────┤          │
│ id (PK)  │ │ id (PK)  │ │ id (PK)      │          │
│ order_id │ │ order_id │ │ order_id     │          │
│service_id├─┤ amount   │ │ old_status   │          │
│ quantity │ │ method   │ │ new_status   │          │
│ subtotal │ │ note     │ │ changed_by   ├──────────┘
└──────────┘ │created_at│ │ changed_at   │     (RESTRICT)
             └──────────┘ └──────────────┘

FK: order_items.service_id → services.id (RESTRICT)
FK: order_items.order_id → orders.id (CASCADE)
FK: payments.order_id → orders.id (CASCADE)
FK: audit_logs.order_id → orders.id (CASCADE)
FK: audit_logs.changed_by → users.id (RESTRICT)
FK: orders.customer_id → customers.id (RESTRICT)
FK: orders.user_id → users.id (RESTRICT)
```

### 11.2 Tabel Detail

#### users
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Username login |
| password | VARCHAR(255) | NOT NULL | bcrypt hash |
| role | ENUM('admin','pegawai') | NOT NULL, DEFAULT 'pegawai' | Role akses |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tanggal dibuat |

#### customers
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama pelanggan |
| whatsapp | VARCHAR(20) | UNIQUE, NOT NULL | Format 628xxx |
| address | TEXT | NULLABLE | Alamat |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tanggal terdaftar |

#### services
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | NOT NULL | Nama layanan |
| price | DECIMAL(10,2) | NOT NULL | Harga per satuan |
| unit | ENUM('kg','piece','meter','pair','item') | NOT NULL | Satuan |
| active | BOOLEAN | DEFAULT TRUE | Status aktif |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tanggal dibuat |

#### orders
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| customer_id | INT | FK → customers.id, NOT NULL | Pelanggan |
| user_id | INT | FK → users.id, NOT NULL | Staff penanggung jawab |
| status | ENUM('pending','dicuci','disetrika','siap','diambil','cancelled') | DEFAULT 'pending' | Status order |
| payment_status | ENUM('unpaid','partial','paid') | DEFAULT 'unpaid' | Status bayar |
| total_price | DECIMAL(12,2) | NOT NULL | Total harga |
| notes | TEXT | NULLABLE | Catatan pesanan |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tanggal dibuat |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Tanggal update |

#### order_items
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| order_id | INT | FK → orders.id (CASCADE) | Order terkait |
| service_id | INT | FK → services.id (RESTRICT) | Layanan |
| quantity | DECIMAL(10,2) | NOT NULL | Jumlah |
| subtotal | DECIMAL(12,2) | NOT NULL | price × quantity |

#### payments
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| order_id | INT | FK → orders.id (CASCADE) | Order terkait |
| amount | DECIMAL(12,2) | NOT NULL | Jumlah bayar |
| method | ENUM('cash','transfer','ewallet') | NOT NULL | Metode bayar |
| note | TEXT | NULLABLE | Catatan |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Tanggal bayar |

#### audit_logs
| Kolom | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | Primary key |
| order_id | INT | FK → orders.id (CASCADE) | Order terkait |
| old_status | VARCHAR(20) | NULLABLE | Status lama (null jika baru) |
| new_status | VARCHAR(20) | NOT NULL | Status baru |
| changed_by | INT | FK → users.id (RESTRICT) | User yang mengubah |
| changed_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Waktu perubahan |

### 11.3 Default Service Catalog (Seeded)

| Layanan | Harga | Satuan |
|---------|-------|--------|
| Cuci Kiloan Reguler | Rp 7.000 | kg |
| Cuci Kiloan Express | Rp 12.000 | kg |
| Setrika Saja | Rp 5.000 | kg |
| Cuci + Setrika Premium | Rp 15.000 | kg |
| Cuci Bedcover | Rp 25.000 | piece |
| Cuci Boneka | Rp 15.000 | piece |
| Cuci Sepatu | Rp 20.000 | pair |
| Cuci Tas | Rp 18.000 | piece |
| Dry Cleaning | Rp 35.000 | piece |
| Cuci Karpet | Rp 10.000 | meter |

### 11.4 Default Users (Seeded)

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | admin |
| pegawai1 | password123 | pegawai |

---

## 12. Peta Navigasi Antar Screen

### 12.1 Diagram Relasi

```
SCR-01 Login ──(berhasil)──> SCR-02 Dashboard
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
          SCR-03 Pesanan   SCR-04 Buat      SCR-05 Detail
               │            Pesanan              │
               │                │                │
               │                ├──(modal)──> SCR-07 Pelanggan
               │                │
               │                └──(simpan)──> SCR-05 Detail
               │
               └──(klik baris)──> SCR-05 Detail

SCR-06 Pelanggan ──(tambah/edit)──> SCR-07 Form Pelanggan
       │
       └──(klik baris)──> SCR-03 Pesanan (filtered)

SCR-08 Layanan ──(tambah/edit)──> SCR-09 Form Layanan

SCR-10 Pembayaran ──(edit)──> SCR-11 Detail Pembayaran
       │
       ├──(klik order)──> SCR-05 Detail Pesanan
       └──(dari SCR-11)──(kembali)──> SCR-10

SCR-12 Pengguna ──(tambah/edit)──> SCR-13 Form Pengguna

SCR-14 Profil ──(logout)──> SCR-01 Login
```

### 12.2 Tabel Relasi Lengkap

| Dari | Ke | Trigger |
|------|----|---------|
| SCR-01 Login | SCR-02 Dashboard | Login berhasil |
| SCR-02 Dashboard | SCR-03 Daftar Pesanan | Klik card / filter pesanan |
| SCR-02 Dashboard | SCR-04 Buat Pesanan | Klik CTA buat pesanan |
| SCR-02 Dashboard | SCR-05 Detail Pesanan | Klik pesanan terbaru |
| SCR-03 Daftar Pesanan | SCR-04 Buat Pesanan | Klik "+ Buat Pesanan" |
| SCR-03 Daftar Pesanan | SCR-05 Detail Pesanan | Klik baris pesanan |
| SCR-04 Buat Pesanan | SCR-07 Form Pelanggan | Klik "+ Tambah Pelanggan" (modal) |
| SCR-04 Buat Pesanan | SCR-05 Detail Pesanan | Simpan pesanan berhasil |
| SCR-04 Buat Pesanan | SCR-03 Daftar Pesanan | Klik "Batal" |
| SCR-05 Detail Pesanan | SCR-07 Form Pelanggan | Klik nama pelanggan |
| SCR-05 Detail Pesanan | SCR-03 Daftar Pesanan | Hapus pesanan / breadcrumb |
| SCR-06 Daftar Pelanggan | SCR-07 Form Pelanggan | Tambah / Edit |
| SCR-06 Daftar Pelanggan | SCR-03 Daftar Pesanan | Klik baris (filter by customer) |
| SCR-07 Form Pelanggan | SCR-06 Daftar Pelanggan | Simpan / Batal (halaman) |
| SCR-08 Daftar Layanan | SCR-09 Form Layanan | Tambah / Edit |
| SCR-09 Form Layanan | SCR-08 Daftar Layanan | Simpan / Batal |
| SCR-10 Daftar Pembayaran | SCR-05 Detail Pesanan | Klik ID Order |
| SCR-10 Daftar Pembayaran | SCR-11 Detail Pembayaran | Klik Edit (Admin) |
| SCR-11 Detail Pembayaran | SCR-05 Detail Pesanan | Klik link order |
| SCR-11 Detail Pembayaran | SCR-10 Daftar Pembayaran | Simpan / Hapus / Kembali |
| SCR-12 Daftar Pengguna | SCR-13 Form Pengguna | Tambah / Edit |
| SCR-13 Form Pengguna | SCR-12 Daftar Pengguna | Simpan / Batal |
| SCR-14 Profil | SCR-01 Login | Logout |

---

## 13. Non-Functional Requirements

### 13.1 Performance

| Aspek | Target |
|-------|--------|
| First Contentful Paint (FCP) | < 2 detik |
| Time to Interactive (TTI) | < 3 detik |
| API Response Time | < 500ms (rata-rata) |
| Bundle Size | < 300KB (initial load) |

### 13.2 Responsiveness

| Breakpoint | Lebar | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, sidebar hidden |
| Tablet | 640px - 1024px | Compact layout, collapsible sidebar |
| Desktop | > 1024px | Full layout with sidebar |

### 13.3 Browser Support

| Browser | Versi Minimum |
|---------|---------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 14+ |
| Edge | 90+ |

### 13.4 Security

| Aspek | Implementasi |
|-------|--------------|
| Authentication | JWT (HS256, 24h expiry) |
| Password Storage | bcrypt hash |
| API Protection | Bearer token pada semua endpoint (kecuali login) |
| RBAC | Role-based middleware di backend |
| CORS | Hanya `http://localhost:3000` |
| Input Validation | express-validator di backend + client-side |
| SQL Injection | Parameterized queries via mysql2 |
| XSS | React auto-escaping + input sanitization |

### 13.5 Accessibility

- Semantic HTML elements
- ARIA labels pada elemen interaktif
- Keyboard navigation support
- Color contrast ratio WCAG AA
- Focus management pada modal

### 13.6 Code Quality

- TypeScript strict mode
- ESLint dengan eslint-config-next
- React Compiler untuk auto-optimization
- Konsisten naming convention
- Modular component architecture

---

## 14. Milestone & Fase Pengembangan

### Fase 1: Foundation
- Setup project structure (folders, routing)
- AuthContext + API client + token management
- Shared components: Sidebar, Topbar, Layout
- Shared components: StatusBadge, Modal, Toast, DataTable

### Fase 2: Core Screens
- SCR-01 Login (autentikasi)
- SCR-02 Dashboard (statistik + chart)
- SCR-03 Daftar Pesanan (list + filter + pagination)
- SCR-04 Buat Pesanan (multi-step form + modal pelanggan)
- SCR-05 Detail Pesanan (detail + 4 modal + audit trail)

### Fase 3: Management Screens
- SCR-06 Daftar Pelanggan + SCR-07 Form Pelanggan
- SCR-08 Daftar Layanan + SCR-09 Form Layanan
- SCR-10 Daftar Pembayaran + SCR-11 Detail Pembayaran
- SCR-12 Daftar Pengguna + SCR-13 Form Pengguna
- SCR-14 Profil Saya

### Fase 4: Polish & Testing
- RBAC enforcement di semua screen
- Responsive testing (mobile, tablet, desktop)
- Error handling & edge cases
- Loading states & empty states
- Final integration testing

---

## 15. Risiko & Asumsi

### 15.1 Asumsi

| # | Asumsi |
|---|--------|
| 1 | Backend API sudah 100% selesai dan tidak akan ada breaking changes |
| 2 | Backend berjalan di `http://localhost:5000` |
| 3 | Frontend berjalan di `http://localhost:3000` |
| 4 | CORS sudah dikonfigurasi untuk localhost:3000 |
| 5 | Database sudah di-seed dengan data awal (admin, pegawai, layanan) |
| 6 | Docker terinstall untuk menjalankan MySQL |

### 15.2 Risiko

| # | Risiko | Mitigasi |
|---|--------|----------|
| 1 | Next.js 16 breaking changes dari versi sebelumnya | Baca AGENTS.md, gunakan App Router pattern |
| 2 | Tailwind CSS v4 syntax berbeda dari v3 | Gunakan `@theme inline` dan `@import "tailwindcss"` |
| 3 | React 19 + React Compiler compatibility | Test incremental, gunakan babel-plugin-react-compiler |
| 4 | Kompleksitas SCR-04 (multi-step form + modal) | Ikuti referensi UI yang sudah ada |
| 5 | Kompleksitas SCR-05 (4 modal workflow) | Break menjadi sub-komponen kecil |

---

## 16. Glossary

| Istilah | Definisi |
|---------|----------|
| **Washpos** | Nama aplikasi laundry management system |
| **UMKM** | Usaha Mikro, Kecil, dan Menengah |
| **Admin** | Role dengan akses penuh ke seluruh sistem |
| **Pegawai** | Role dengan akses terbatas (hanya order milik sendiri) |
| **Order / Pesanan** | Transaksi layanan laundry dari pelanggan |
| **Item** | Satuan layanan dalam satu pesanan (service + quantity) |
| **Status Order** | Tahapan pesanan: pending → dicuci → disetrika → siap → diambil |
| **Payment Status** | Status pembayaran: unpaid → partial → paid |
| **Audit Trail** | Log perubahan status pesanan |
| **Terminal State** | Status yang tidak bisa diubah lagi (diambil, cancelled) |
| **RBAC** | Role-Based Access Control — sistem hak akses berbasis peran |
| **JWT** | JSON Web Token — mekanisme autentikasi |
| **App Router** | Next.js routing system berbasis file system |
| **SSR** | Server-Side Rendering |

---

*Dokumen ini adalah Product Requirements Document lengkap untuk Washpos Laundry Management System. Dibuat sebagai panduan pengembangan frontend berdasarkan backend API yang sudah selesai, UI specification, dan referensi UI yang tersedia.*
