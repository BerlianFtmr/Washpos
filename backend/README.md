# Washpos - Backend API

RESTful API untuk Laundry Management System UMKM. Dibangun dengan Express.js dan MySQL 8.0.

> **Tugas Besar Rekayasa Web - TIM 03**

---

## Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Express.js | 4.18.2 | Web framework |
| Node.js | 18 LTS+ | Runtime |
| MySQL | 8.0 (Docker) | Database relasional |
| mysql2 | 3.6.0 | MySQL driver (promise-based) |
| jsonwebtoken | 9.0.2 | JWT authentication (HS256, 24h) |
| bcryptjs | 2.4.3 | Password hashing |
| express-validator | 7.0.1 | Input validation |
| swagger-jsdoc + swagger-ui-express | 6.2.8 / 5.0.0 | API documentation |
| nodemon | 3.0.1 | Auto-restart dev server |

---

## Persyaratan

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (untuk MySQL)

---

## Instalasi & Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Jalankan MySQL via Docker
docker-compose up -d

# 3. Seed database (opsional, buat user & data awal)
npm run seed

# 4. Jalankan server
npm run dev          # Development (nodemon, auto-restart)
npm start            # Production
```

Database migration berjalan otomatis saat Docker container pertama kali dijalankan (`migrations/001_init.sql` di-mount ke `/docker-entrypoint-initdb.d`).

### Verifikasi Server

```bash
curl http://localhost:5000
# Buka http://localhost:5000/api-docs untuk Swagger UI
```

### Hentikan MySQL Container

```bash
docker-compose down
```

---

## Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=laundry_db

JWT_SECRET=rahasia_super_aman_ganti_ini_12345
JWT_EXPIRES_IN=24h

CORS_ORIGIN=http://localhost:3000
```

---

## Port & Service

| Service | Port | Keterangan |
|---------|------|------------|
| Backend API | 5000 | `http://localhost:5000` |
| Swagger UI | 5000 | `http://localhost:5000/api-docs` |
| MySQL | 3307 (host) | `127.0.0.1:3307` |

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `password123` |
| Pegawai | `pegawai1` | `password123` |

---

## Struktur Folder

```
backend/
├── server.js                  # Entry point Express + Swagger config
├── package.json               # Dependencies & scripts
├── docker-compose.yml         # MySQL 8.0 container
├── .env.example               # Template environment variables
├── seed.js                    # Database seeder (users + services + customers)
├── migrations/
│   └── 001_init.sql           # Schema lengkap (7 tabel + data layanan)
└── src/
    ├── config/
    │   └── database.js        # MySQL connection pool
    ├── controllers/
    │   ├── authController.js  # Login, register, me, logout
    │   ├── customerController.js
    │   ├── orderController.js
    │   ├── paymentController.js
    │   ├── serviceController.js
    │   ├── statsController.js # Dashboard statistics
    │   └── userController.js
    ├── middleware/
    │   ├── auth.js            # JWT protect middleware
    │   └── role.js            # RBAC authorize(...roles)
    ├── queries/
    │   ├── customerQueries.js
    │   ├── orderQueries.js
    │   ├── paymentQueries.js
    │   ├── serviceQueries.js
    │   ├── statsQueries.js
    │   └── userQueries.js
    ├── routes/
    │   ├── index.js           # Route aggregation (7 modules)
    │   ├── authRoutes.js
    │   ├── customerRoutes.js
    │   ├── orderRoutes.js
    │   ├── paymentRoutes.js
    │   ├── serviceRoutes.js
    │   ├── statsRoutes.js
    │   └── userRoutes.js
    └── utils/
        ├── hash.js            # bcrypt utilities
        ├── jwt.js             # JWT sign/verify (HS256, 24h)
        └── response.js        # successResponse, errorResponse, validationError
```

---

## Arsitektur

Layered architecture pattern:

```
HTTP Request
  → Route (endpoint definition)
  → Middleware (auth/RBAC)
  → Validator (input)
  → Controller (business logic)
  → Query (SQL via mysql2)
  → MySQL 8.0
  → Response (JSON)
```

---

## Database Schema

7 tabel dengan foreign key dan constraint:

```
users ──< orders >── customers
  │                    │
  │                order_items >── services
  │
  ├── payments >── orders
  └── audit_logs >── orders
```

| Tabel | Deskripsi | Key |
|-------|-----------|-----|
| `users` | Autentikasi & otorisasi | role: admin/pegawai |
| `customers` | Data pelanggan | whatsapp (unique) |
| `services` | Katalog layanan + harga | unit: kg/piece/pair |
| `orders` | Data pesanan + status tracking | status + payment_status |
| `order_items` | Item pesanan | FK ke orders + services |
| `payments` | Catatan pembayaran | method: cash/transfer/ewallet |
| `audit_logs` | Riwayat perubahan status | old_status → new_status |

### Relasi & Cascade

- `order_items.order_id` → `orders.id` (CASCADE on delete)
- `orders.customer_id` → `customers.id` (RESTRICT on delete)
- `orders.user_id` → `users.id` (RESTRICT on delete)
- `payments.order_id` → `orders.id` (CASCADE on delete)
- `audit_logs.order_id` → `orders.id` (CASCADE on delete)

---

## API Endpoints

Base URL: `/api/v1`

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/auth/login` | - | Login, dapatkan JWT token |
| POST | `/auth/register` | JWT | Registrasi user baru |
| GET | `/auth/me` | JWT | Data user yang sedang login |
| POST | `/auth/logout` | JWT | Logout |

### Users (`/api/v1/users`) - Admin Only

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/users` | Admin | Daftar semua user |
| GET | `/users/:id` | Admin | Detail user |
| POST | `/users` | Admin | Buat user baru |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Hapus user |

### Customers (`/api/v1/customers`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/customers` | JWT | Daftar pelanggan (`?search=`) |
| GET | `/customers/:id` | JWT | Detail pelanggan |
| POST | `/customers` | JWT | Tambah pelanggan baru |
| PATCH | `/customers/:id` | JWT | Update pelanggan |
| DELETE | `/customers/:id` | JWT | Hapus pelanggan (jika tidak punya order) |

### Orders (`/api/v1/orders`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/orders` | JWT | Daftar pesanan (`?status=`, `?customer_id=`) |
| GET | `/orders/:id` | JWT | Detail + items + payments + audit logs |
| POST | `/orders` | JWT | Buat pesanan baru |
| PATCH | `/orders/:id` | JWT | Update pesanan |
| PATCH | `/orders/:id/status` | JWT | Update status pesanan |
| DELETE | `/orders/:id` | Admin | Batalkan pesanan |

### Services (`/api/v1/services`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/services` | JWT | Daftar layanan (`?active=`) |
| GET | `/services/:id` | JWT | Detail layanan |
| POST | `/services` | Admin | Tambah layanan baru |
| PATCH | `/services/:id` | Admin | Update layanan |
| DELETE | `/services/:id` | Admin | Hapus layanan |

### Payments (`/api/v1/payments`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/payments` | JWT | Daftar pembayaran (`?order_id=`) |
| GET | `/payments/:id` | JWT | Detail pembayaran |
| POST | `/payments` | JWT | Tambah pembayaran |
| PATCH | `/payments/:id` | Admin | Update pembayaran |
| DELETE | `/payments/:id` | Admin | Hapus pembayaran |

### Stats (`/api/v1/stats`)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/stats/dashboard` | JWT | Statistik dashboard |

---

## Business Rules

### Order Status Flow

```
pending → dicuci → disetrika → siap → diambil
   │                                     │
   └──────→ cancelled ←──────────────────┘
            (dari status apapun)
```

- Status terminal (`diambil`, `cancelled`) tidak bisa diubah lagi.
- Setiap perubahan status dicatat di `audit_logs` (old_status, new_status, changed_by).

### Payment Status Auto-Update

Setiap kali payment ditambah/diedit/dihapus, `payment_status` pada order otomatis dihitung ulang:

```
unpaid → partial → paid
```

### Pegawai Isolation

User dengan role `pegawai` hanya bisa melihat dan mengelola pesanan miliknya sendiri (`user_id` filter). Admin melihat semua data.

### Customer Delete Restriction

Pelanggan yang memiliki pesanan tidak bisa dihapus (FK `ON DELETE RESTRICT`).

---

## Role-Based Access Control

| Endpoint | Admin | Pegawai |
|----------|:-----:|:-------:|
| POST /auth/login | Y | Y |
| POST /auth/register | Y | - |
| GET /auth/me | Y | Y |
| GET /users | Y | - |
| POST/PATCH/DELETE /users | Y | - |
| GET /customers | Y | Y |
| POST/PATCH/DELETE /customers | Y | Y |
| GET /orders | Y | Y (own) |
| POST /orders | Y | Y |
| PATCH /orders/:id/status | Y | Y (own) |
| DELETE /orders/:id | Y | - |
| GET /services | Y | Y |
| POST/PATCH/DELETE /services | Y | - |
| GET /payments | Y | Y |
| POST /payments | Y | Y |
| PATCH/DELETE /payments | Y | - |
| GET /stats/dashboard | Y | Y (own) |

---

## Standard Response Format

```json
// Success (200/201)
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}

// Error (400/401/403/404/500)
{
  "success": false,
  "message": "Error message"
}

// Validation Error (422)
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "name", "message": "Name is required" }]
}
```

---

## Testing dengan cURL

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get Customers (ganti <token>)
curl http://localhost:5000/api/v1/customers \
  -H "Authorization: Bearer <token>"

# Create Order
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"service_id":1,"quantity":5}]}'
```

---

## Manual Database Migration

Jika perlu menjalankan migration secara manual:

```bash
mysql -h 127.0.0.1 -P 3307 -u root -proot laundry_db < migrations/001_init.sql
```

---

## License

Project ini dibuat untuk memenuhi tugas mata kuliah Rekayasa Web - Semester 4.
