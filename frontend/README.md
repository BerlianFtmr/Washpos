# Washpos - Frontend

Frontend untuk Laundry Management System UMKM. Dibangun dengan **Next.js 16**, **React 19**, **TypeScript**, dan **Tailwind CSS 4**.

> **Tugas Besar Rekayasa Web - TIM 03**

---

## Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Next.js | 16.2.9 | React framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS |
| lucide-react | 1.18.0 | Icon library |
| sonner | 2.0.7 | Toast notifications |

---

## Persyaratan

- Node.js >= 18.0.0
- npm >= 9.0.0
- Backend API berjalan di `http://localhost:5000`

---

## Instalasi & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Pastikan backend API sudah berjalan di port 5000
#    (lihat ../backend/README.md)

# 3. Jalankan development server
npm run dev

# 4. Build untuk production
npm run build
npm start
```

Buka `http://localhost:3000` di browser.

---

## Environment Variables

Buat file `.env.local` di root folder frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Jika tidak diatur, default value `http://localhost:5000/api/v1` akan digunakan.

---

## Port & Service

| Service | Port | Keterangan |
|---------|------|------------|
| Frontend | 3000 | `http://localhost:3000` |
| Backend API | 5000 | `http://localhost:5000/api/v1` |

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `password123` |
| Pegawai | `pegawai1` | `password123` |

---

## Struktur Folder

```
frontend/
├── package.json               # Dependencies & scripts
├── next.config.ts             # Next.js config (reactCompiler: true)
├── tsconfig.json              # TypeScript config (path alias @/*)
├── postcss.config.mjs         # PostCSS for Tailwind
├── eslint.config.mjs          # ESLint config
├── .env.local                 # Environment variables
├── public/                    # Static assets
└── src/
    ├── app/
    │   ├── layout.tsx         # Root layout (AuthProvider, Toaster, fonts)
    │   ├── globals.css        # Global styles + Tailwind imports
    │   ├── login/
    │   │   └── page.tsx       # Login page
    │   └── (authenticated)/   # Protected route group
    │       ├── layout.tsx     # Authenticated layout (Sidebar + Topbar)
    │       ├── page.tsx       # Dashboard
    │       ├── profile/
    │       │   └── page.tsx   # User profile
    │       ├── customers/
    │       │   ├── page.tsx   # Customer list
    │       │   ├── new/
    │       │   │   └── page.tsx   # Create customer
    │       │   └── [id]/
    │       │       └── edit/
    │       │           └── page.tsx   # Edit customer
    │       ├── orders/
    │       │   ├── page.tsx   # Order list
    │       │   ├── new/
    │       │   │   └── page.tsx   # Create order
    │       │   └── [id]/
    │       │       └── page.tsx   # Order detail
    │       ├── services/
    │       │   ├── page.tsx   # Service list
    │       │   ├── new/
    │       │   │   └── page.tsx   # Create service (admin)
    │       │   └── [id]/
    │       │       └── edit/
    │       │           └── page.tsx   # Edit service (admin)
    │       ├── payments/
    │       │   ├── page.tsx   # Payment list
    │       │   └── [id]/
    │       │       └── page.tsx   # Payment detail
    │       └── users/
    │           ├── page.tsx   # User list (admin)
    │           ├── new/
    │           │   └── page.tsx   # Create user (admin)
    │           └── [id]/
    │               └── edit/
    │                   └── page.tsx   # Edit user (admin)
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx      # Main authenticated layout
    │   │   ├── Sidebar.tsx        # Navigation sidebar
    │   │   └── Topbar.tsx         # Top bar with user info
    │   ├── providers/
    │   │   └── AuthProvider.tsx   # Auth context provider
    │   ├── customers/
    │   │   └── CustomerFormModal.tsx
    │   └── ui/                     # Reusable UI components
    │       ├── Breadcrumb.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── DataTable.tsx
    │       ├── EmptyState.tsx
    │       ├── LoadingSpinner.tsx
    │       ├── Modal.tsx
    │       ├── StatusBadge.tsx
    │       └── Toast.tsx
    ├── contexts/
    │   └── AuthContext.tsx      # Authentication state management
    ├── lib/
    │   ├── api.ts               # API client (fetch wrapper)
    │   ├── auth.ts              # Token storage utilities
    │   └── services/            # API service layer
    │       ├── authService.ts
    │       ├── customerService.ts
    │       ├── orderService.ts
    │       ├── paymentService.ts
    │       ├── serviceService.ts
    │       ├── statsService.ts
    │       └── userService.ts
    └── types/
        └── index.ts             # TypeScript type definitions
```

---

## Arsitektur

```
Browser
  → Next.js App Router
  → (authenticated) Route Group
  → AuthContext (cek login state)
  → Page Component
  → Service Layer (API calls)
  → Backend API (http://localhost:5000/api/v1)
```

### Key Patterns

- **App Router** dengan route groups `(authenticated)` untuk halaman yang butuh login
- **Context-based auth** via `AuthContext` + `AuthProvider`
- **Service layer** di `lib/services/` sebagai abstraction untuk API calls
- **API client** di `lib/api.ts` menangani token, error, dan response parsing
- **Type-safe** dengan TypeScript types di `types/index.ts`
- **Component library** di `components/ui/` untuk reusable UI elements

---

## Halaman (Screens)

### Public

| Route | File | Deskripsi |
|-------|------|-----------|
| `/login` | `app/login/page.tsx` | Halaman login |

### Authenticated (Semua Role)

| Route | File | Deskripsi |
|-------|------|-----------|
| `/` | `app/(authenticated)/page.tsx` | Dashboard statistik |
| `/profile` | `app/(authenticated)/profile/page.tsx` | Profil user |
| `/orders` | `app/(authenticated)/orders/page.tsx` | Daftar pesanan |
| `/orders/new` | `app/(authenticated)/orders/new/page.tsx` | Buat pesanan baru |
| `/orders/:id` | `app/(authenticated)/orders/[id]/page.tsx` | Detail pesanan |
| `/customers` | `app/(authenticated)/customers/page.tsx` | Daftar pelanggan |
| `/customers/new` | `app/(authenticated)/customers/new/page.tsx` | Tambah pelanggan |
| `/customers/:id/edit` | `app/(authenticated)/customers/[id]/edit/page.tsx` | Edit pelanggan |
| `/services` | `app/(authenticated)/services/page.tsx` | Daftar layanan |
| `/payments` | `app/(authenticated)/payments/page.tsx` | Daftar pembayaran |
| `/payments/:id` | `app/(authenticated)/payments/[id]/page.tsx` | Detail pembayaran |

### Admin Only

| Route | File | Deskripsi |
|-------|------|-----------|
| `/users` | `app/(authenticated)/users/page.tsx` | Daftar pengguna |
| `/users/new` | `app/(authenticated)/users/new/page.tsx` | Tambah pengguna |
| `/users/:id/edit` | `app/(authenticated)/users/[id]/edit/page.tsx` | Edit pengguna |
| `/services/new` | `app/(authenticated)/services/new/page.tsx` | Tambah layanan |
| `/services/:id/edit` | `app/(authenticated)/services/[id]/edit/page.tsx` | Edit layanan |

---

## Navigasi Sidebar

Menu navigasi berdasarkan role:

| Menu | Route | Admin | Pegawai |
|------|-------|:-----:|:-------:|
| Dashboard | `/` | Y | Y |
| Pesanan | `/orders` | Y | Y |
| Pelanggan | `/customers` | Y | Y |
| Layanan | `/services` | Y | Y |
| Pembayaran | `/payments` | Y | Y |
| Pengguna | `/users` | Y | - |

---

## Type Definitions

Tipe utama yang didefinisikan di `types/index.ts`:

| Tipe | Deskripsi |
|------|-----------|
| `User`, `Customer`, `Service`, `Order`, `Payment`, `AuditLog` | Entity types |
| `UserRole`, `OrderStatus`, `PaymentStatus`, `PaymentMethod` | Enum/union types |
| `AuthUser`, `LoginPayload`, `LoginResponse` | Auth types |
| `ApiResponse<T>`, `PaginatedData<T>` | API response wrappers |
| `DashboardStats` | Dashboard data |
| `Create*Payload`, `Update*Payload` | Request payloads |
| `*QueryParams` | Query parameter types |

---

## API Client

API client di `lib/api.ts` menyediakan:

| Method | Deskripsi |
|--------|-----------|
| `api.get<T>(endpoint, params?)` | GET request dengan optional query params |
| `api.getPaginated<T>(endpoint, params?)` | GET dengan pagination wrapper |
| `api.post<T>(endpoint, body?)` | POST request |
| `api.patch<T>(endpoint, body?)` | PATCH request |
| `api.delete<T>(endpoint)` | DELETE request |

Fitur otomatis:
- Menambahkan `Authorization: Bearer <token>` header jika ada token
- Redirect ke `/login` jika response 401
- Error wrapping via `ApiError` class

---

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Jalankan production build |
| `npm run lint` | ESLint check |

---

## License

Project ini dibuat untuk memenuhi tugas mata kuliah Rekayasa Web - Semester 4.
