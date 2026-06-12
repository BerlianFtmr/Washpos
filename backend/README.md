# Laundry Management System - RESTful API

> **Project:** P07 - Implementasi RESTful API  
> **Author:** TIM 03 - Rekayasa Web  
> **Mata Kuliah:** Rekayasa Web - Semester 4  
> **Institusi:** Universitas Nahdlatul Ulama Yogyakarta  
> **Tanggal:** 11 Juni 2026

---

## 📋 Table of Contents

- [Deskripsi Project](#deskripsi-project)
- [Tech Stack](#tech-stack)
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Role-Based Access Control](#role-based-access-control)
- [Dokumentasi Pendukung](#dokumentasi-pendukung)
- [Kriteria Tugas Terpenuhi](#kriteria-tugas-terpenuhi)

---

## 📖 Deskripsi Project

**Laundry Management System RESTful API** adalah backend API yang dirancang untuk UMKM laundry dalam mengelola operasional bisnis secara digital. API ini menyediakan endpoint-endpoint RESTful untuk:

- ✅ Manajemen order cucian dengan tracking status
- ✅ Database pelanggan dengan identifikasi WhatsApp
- ✅ Katalog layanan dan harga
- ✅ Pencatatan pembayaran multi-metode
- ✅ Role-based access control (Admin vs Pegawai)
- ✅ Dashboard statistik operasional

### Problem Statement

Bisnis laundry UMKM di Indonesia umumnya masih menggunakan pencatatan manual yang menyebabkan:
- Kehilangan data (catatan mudah hilang/rusak)
- Kesalahan pencatatan (human error dalam tracking status)
- Tidak transparan (customer sulit tracking status cucian)
- Laporan sulit (sulit membuat rekap pendapatan)
- Tidak profesional

### Solusi

RESTful API backend dengan:
1. Digital order management
2. Customer database
3. Service catalog
4. Payment tracking
5. Role-based access
6. API documentation via Swagger UI

---

## 🛠 Tech Stack

| Layer | Teknologi | Versi | Justifikasi |
|-------|-----------|-------|-------------|
| **Backend Framework** | Express.js | 4.18.x | Minimalis, fleksibel, ekosistem besar |
| **Runtime** | Node.js | 18 LTS+ | Event-driven, non-blocking I/O |
| **Database** | MySQL | 8.0 | Relasional, cocok untuk data terstruktur |
| **DB Driver** | mysql2 | 3.x | Promise-based, connection pooling |
| **Validation** | express-validator | 7.x | Integrasi langsung dengan Express |
| **Auth Library** | jsonwebtoken | 9.x | JWT sign/verify standar industri |
| **Password Hash** | bcryptjs | 2.x | Pure JS bcrypt, cross-platform |
| **Env Config** | dotenv | 16.x | Load .env variables |
| **CORS** | cors | 2.x | Cross-origin resource sharing |
| **API Docs** | swagger-jsdoc + swagger-ui-express | latest | Swagger UI dari JSDoc |
| **Dev Tool** | nodemon | 3.x | Auto-restart server |
| **Containerization** | Docker + Docker Compose | - | MySQL dalam container |

---

## ✨ Fitur Utama

### Autentikasi & Authorization
- ✅ JWT-based authentication (HS256, 24 hours expiry)
- ✅ Role-based access control (Admin vs Pegawai)
- ✅ Password hashing dengan bcryptjs
- ✅ Protected endpoints dengan Bearer token

### Resource Management
- ✅ **Users**: CRUD user/pegawai (Admin only)
- ✅ **Customers**: CRUD pelanggan dengan WhatsApp search
- ✅ **Services**: CRUD katalog layanan (admin write, pegawai read)
- ✅ **Orders**: CRUD order + status tracking + audit trail
- ✅ **Payments**: CRUD pembayaran dengan auto-update order status

### Order Status Flow
```
pending → dicuci → disetrika → siap → diambil
              ↕ cancelled (dari status apapun)
```

### Payment Status Logic
```
unpaid → partial → paid
  ↓         ↓         ↑
  └─────────┴─────────┘
    Payment full/partial
```

### Dashboard & Analytics
- ✅ Statistik order hari ini
- ✅ Rekap per status order
- ✅ Filter statistik berdasarkan role (pegawai hanya order sendiri)

### API Documentation
- ✅ Swagger UI di `/api-docs`
- ✅ 30 endpoint terdokumentasi lengkap
- ✅ Example request/response untuk setiap endpoint

---

## 🏗 Arsitektur Sistem

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ React App   │  │ Swagger UI   │  │  Postman /    │  │
│  │ (Frontend)  │  │ (/api-docs)  │  │  cURL         │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼────────────────┼───────────────────┼──────────┘
          │ HTTP/JSON       │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                   API LAYER (Express.js)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routes     │  │  Middleware  │  │  Validators  │  │
│  │ (endpoints)  │→ │ (auth check)│  │  (input)     │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  │
│         ▼                                               │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Controllers  │→ │   Queries    │                    │
│  │ (logic)      │  │  (mysql2)    │                    │
│  └──────┬───────┘  └──────┬───────┘                    │
└─────────┼─────────────────┼─────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                   DATA LAYER                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              MySQL 8.0 (Docker)                  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐           │   │
│  │  │  users  │ │customers │ │ orders │ ...       │   │
│  │  └─────────┘ └──────────┘ └────────┘           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Project Structure
```
laundry-management-system/backend/
├── server.js                        # Entry point, Express app
├── package.json                     # Dependencies & scripts
├── docker-compose.yml               # MySQL container
├── .env                             # Environment variables
├── .env.example                     # Example env file
├── seed.js                          # Seed data awal
├── migrations/
│   └── 001_init.sql                 # Initial schema (CREATE TABLE)
└── src/
    ├── config/
    │   └── database.js              # MySQL connection pool
    ├── middleware/
    │   ├── auth.js                  # JWT verification middleware
    │   └── role.js                  # Role-based access middleware
    ├── routes/
    │   ├── index.js                 # Route aggregation
    │   ├── authRoutes.js            # POST /auth/login, /auth/register, GET /auth/me
    │   ├── userRoutes.js            # CRUD /users (admin only)
    │   ├── customerRoutes.js        # CRUD /customers
    │   ├── orderRoutes.js           # CRUD /orders + PATCH status
    │   ├── serviceRoutes.js         # CRUD /services
    │   ├── paymentRoutes.js         # CRUD /payments
    │   └── statsRoutes.js           # GET /stats/dashboard
    ├── controllers/
    │   ├── authController.js        # Auth logic (login, register, me)
    │   ├── userController.js        # User CRUD logic
    │   ├── customerController.js    # Customer CRUD logic
    │   ├── orderController.js       # Order CRUD + status logic
    │   ├── serviceController.js     # Service CRUD logic
    │   ├── paymentController.js     # Payment CRUD logic
    │   └── statsController.js       # Dashboard stats logic
    ├── queries/
    │   ├── userQueries.js           # SQL queries for users
    │   ├── customerQueries.js       # SQL queries for customers
    │   ├── orderQueries.js          # SQL queries for orders + items + audit
    │   ├── serviceQueries.js        # SQL queries for services
    │   ├── paymentQueries.js        # SQL queries for payments
    │   └── statsQueries.js          # SQL queries for stats
    └── utils/
        ├── hash.js                  # bcrypt hash & verify
        ├── jwt.js                   # JWT sign & verify
        └── response.js              # Standard response helpers
```

### Request Flow
```
HTTP Request 
  → Route 
  → Middleware (auth) 
  → Validator (input) 
  → Controller (business logic) 
  → Query (SQL via mysql2) 
  → Database 
  → Response (JSON) 
  → HTTP Response
```

---

## 🗄 Database Schema

### Entity-Relationship Diagram
```
┌─────────────┐         ┌──────────────┐         ┌─────────┐
│   users     │         │  customers   │         │ services│
│ ─────────── │         │ ──────────── │         │ ─────── │
│ id          │         │ id           │         │ id      │
│ username    │         │ name         │         │ name    │
│ password    │         │ whatsapp    │         │ price   │
│ role        │         │ address     │         │ unit    │
│ created_at  │         │ created_at  │         │ active  │
└─────────────┘         └──────────────┘         └─────────┘
       │                       │                       │
       │                       │                       │
       └───────────┬───────────┴───────────┬───────────┘
                   │                       │
                   ▼                       ▼
          ┌──────────────┐        ┌─────────────┐
          │    orders    │        │ order_items │
          │ ──────────── │        │ ─────────── │
          │ id           │        │ id          │
          │ customer_id  │◄───────│ order_id    │
          │ user_id      │        │ service_id  │
          │ status       │        │ quantity    │
          │ total_price  │        │ subtotal    │
          │ payment_status│       └─────────────┘
          │ created_at   │
          └──────────────┘
                  │
                  ▼
          ┌──────────────┐         ┌──────────────┐
          │  payments    │         │  audit_logs  │
          │ ──────────── │         │ ──────────── │
          │ id           │         │ id           │
          │ order_id     │         │ order_id     │
          │ amount       │         │ old_status   │
          │ method       │         │ new_status   │
          │ note         │         │ changed_by   │
          └──────────────┘         │ changed_at   │
                                    └──────────────┘
```

### Table Descriptions

#### 1. users
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- username: VARCHAR(50) UNIQUE NOT NULL
- password: VARCHAR(255) NOT NULL (bcrypt hash)
- role: ENUM('admin', 'pegawai') NOT NULL
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 2. customers
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- name: VARCHAR(100) NOT NULL
- whatsapp: VARCHAR(20) UNIQUE NOT NULL
- address: TEXT
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 3. services
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- name: VARCHAR(100) NOT NULL
- price: DECIMAL(10,2) NOT NULL
- unit: VARCHAR(20) NOT NULL (kg/piece/meter)
- active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 4. orders
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- customer_id: INT FK(customers.id)
- user_id: INT FK(users.id)
- status: ENUM('pending', 'dicuci', 'disetrika', 'siap', 'diambil', 'cancelled')
- payment_status: ENUM('unpaid', 'partial', 'paid')
- total_price: DECIMAL(10,2)
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

#### 5. order_items
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- order_id: INT FK(orders.id)
- service_id: INT FK(services.id)
- quantity: DECIMAL(10,2) NOT NULL
- subtotal: DECIMAL(10,2) NOT NULL
```

#### 6. payments
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- order_id: INT FK(orders.id)
- amount: DECIMAL(10,2) NOT NULL
- method: ENUM('cash', 'transfer', 'ewallet')
- note: TEXT
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 7. audit_logs
```sql
- id: INT AUTO_INCREMENT PRIMARY KEY
- order_id: INT FK(orders.id)
- old_status: VARCHAR(20)
- new_status: VARCHAR(20)
- changed_by: INT FK(users.id)
- changed_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## 📚 API Documentation

### Swagger UI
API documentation tersedia secara interaktif via Swagger UI:
- **URL**: `http://localhost:5000/api-docs`
- **Fitur**: 
  - Daftar lengkap 30 endpoint
  - Contoh request/response untuk setiap endpoint
  - Try it out button untuk testing langsung
  - Schema definitions untuk semua models

### RESTful Design Principles
| Prinsip | Implementasi |
|---------|--------------|
| Resource-based URLs | `/api/v1/customers`, `/api/v1/orders` |
| HTTP Methods | GET, POST, PATCH, DELETE |
| Stateless | JWT token di setiap request |
| Proper Status Codes | 200, 201, 204, 400, 401, 403, 404, 422 |

---

## 🚀 Setup & Installation

### Prerequisites

```bash
# Cek Node.js versi (require 18 LTS+)
node --version

# Cek npm version
npm --version

# Cek Docker (untuk MySQL container)
docker --version

# Cek Docker Compose
docker-compose --version
```

### Installation Steps

#### 1. Clone atau Extract Project
```bash
cd P07-RestfulAPI/P07-RestfulAPI/laundry-management-system/backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Setup Environment Variables
```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env sesuai konfigurasi (lihat section Environment Variables)
nano .env  # atau gunakan text editor pilihan
```

#### 4. Start MySQL Container
```bash
# Jalankan MySQL di Docker
docker-compose up -d

# Verifikasi container berjalan
docker ps

# Cek logs jika ada masalah
docker-compose logs mysql
```

#### 5. Run Database Migration
```bash
# Di Windows (Git Bash)
mysql -h 127.0.0.1 -P 3307 -u root -p laundry_db < migrations/001_init.sql

# Atau via MySQL Workbench/DB viewer
# Buka migrations/001_init.sql dan execute
```

#### 6. Seed Initial Data
```bash
# Jalankan seed script
node seed.js

# Output: 
# ✅ Seeded 2 users
# ✅ Seeded 10 services
```

---

## 🔧 Environment Variables

Edit file `.env` dengan konfigurasi berikut:

```env
# Server
PORT=5000
NODE_ENV=development

# Database MySQL
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=laundry_db

# JWT Secret (GANTI dengan string random yang kuat!)
JWT_SECRET=rahasia_super_aman_ganti_ini_12345
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

> **⚠️ PENTING**: Jangan commit `.env` ke git! File ini sudah di-list di `.gitignore`.

---

## ▶️ Running the Application

### Development Mode (Auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Verifikasi Server Berjalan
```bash
# Test server health
curl http://localhost:5000

# Akses Swagger UI
# Buka browser: http://localhost:5000/api-docs
```

### Stop MySQL Container
```bash
docker-compose down
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Summary Table (30 Endpoints)

| Resource | Endpoints | CRUD |
|----------|-----------|------|
| **Auth** | 3 | Login, Register, Me |
| **Users** | 5 | List, Detail, Create, Update, Delete |
| **Customers** | 5 | List, Detail, Create, Update, Delete |
| **Orders** | 6 | List, Detail, Create, Update, Status, Delete |
| **Services** | 5 | List, Detail, Create, Update, Delete |
| **Payments** | 5 | List, Detail, Create, Update, Delete |
| **Stats** | 1 | Dashboard |

### Auth Endpoints

#### POST /api/v1/auth/login
**Description**: Login untuk mendapatkan JWT token

**Request Body**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### POST /api/v1/auth/register
**Description**: Register user baru (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "username": "pegawai2",
  "password": "password123",
  "role": "pegawai"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 3,
    "username": "pegawai2",
    "role": "pegawai"
  }
}
```

#### GET /api/v1/auth/me
**Description**: Mendapatkan info user yang sedang login

**Headers**: `Authorization: Bearer <token>`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Users Endpoints (Admin Only)

#### GET /api/v1/users
**Description**: List semua users (Admin only)

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `page` (optional): Page number untuk pagination
- `limit` (optional): Items per page

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2026-06-04T00:00:00.000Z"
    },
    {
      "id": 2,
      "username": "pegawai1",
      "role": "pegawai",
      "created_at": "2026-06-04T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

### Customers Endpoints

#### GET /api/v1/customers
**Description**: List semua customers

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `search` (optional): Search by name or WhatsApp
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ahmad",
      "whatsapp": "628123456789",
      "address": "Jl. Contoh No. 123",
      "created_at": "2026-06-04T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### POST /api/v1/customers
**Description**: Buat customer baru

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Budi Santoso",
  "whatsapp": "628987654321",
  "address": "Jl. Baru No. 456"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "id": 2,
    "name": "Budi Santoso",
    "whatsapp": "628987654321",
    "address": "Jl. Baru No. 456",
    "created_at": "2026-06-04T12:30:00.000Z"
  }
}
```

### Orders Endpoints

#### GET /api/v1/orders
**Description**: List semua orders

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `status` (optional): Filter by status (pending, dicuci, disetrika, siap, diambil, cancelled)
- `customer_id` (optional): Filter by customer
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "customer_name": "Ahmad",
      "user_id": 2,
      "user_name": "pegawai1",
      "status": "dicuci",
      "payment_status": "unpaid",
      "total_price": 45000,
      "created_at": "2026-06-04T10:00:00.000Z",
      "items": [
        {
          "service_name": "Cuci Kiloan",
          "quantity": 5,
          "subtotal": 25000
        },
        {
          "service_name": "Setrika Satuan",
          "quantity": 10,
          "subtotal": 20000
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### POST /api/v1/orders
**Description**: Buat order baru

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "customer_id": 1,
  "items": [
    {
      "service_id": 1,
      "quantity": 5
    },
    {
      "service_id": 2,
      "quantity": 10
    }
  ]
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 2,
    "customer_id": 1,
    "user_id": 1,
    "status": "pending",
    "payment_status": "unpaid",
    "total_price": 45000,
    "created_at": "2026-06-04T13:00:00.000Z",
    "items": [
      {
        "id": 11,
        "service_id": 1,
        "service_name": "Cuci Kiloan",
        "quantity": 5,
        "subtotal": 25000
      },
      {
        "id": 12,
        "service_id": 2,
        "service_name": "Setrika Satuan",
        "quantity": 10,
        "subtotal": 20000
      }
    ]
  }
}
```

#### PATCH /api/v1/orders/:id/status
**Description**: Update status order

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "status": "dicuci"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "status": "dicuci",
    "updated_at": "2026-06-04T14:00:00.000Z"
  }
}
```

### Services Endpoints

#### GET /api/v1/services
**Description**: List semua services

**Headers**: `Authorization: Bearer <token>`

**Query Params**:
- `active_only` (optional): Filter hanya aktif (true/false)

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Cuci Kiloan",
      "price": 5000,
      "unit": "kg",
      "active": true,
      "created_at": "2026-06-04T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Setrika Satuan",
      "price": 2000,
      "unit": "piece",
      "active": true,
      "created_at": "2026-06-04T00:00:00.000Z"
    }
  ]
}
```

### Payments Endpoints

#### POST /api/v1/orders/:id/payments
**Description**: Buat payment untuk order

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 45000,
  "method": "cash",
  "note": "Lunas"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "id": 1,
    "order_id": 1,
    "amount": 45000,
    "method": "cash",
    "note": "Lunas",
    "created_at": "2026-06-04T15:00:00.000Z"
  }
}
```

### Stats Endpoints

#### GET /api/v1/stats/dashboard
**Description**: Dashboard statistik

**Headers**: `Authorization: Bearer <token>`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2026-06-04",
      "total_orders": 5,
      "total_revenue": 225000
    },
    "by_status": [
      {
        "status": "pending",
        "count": 2
      },
      {
        "status": "dicuci",
        "count": 2
      },
      {
        "status": "siap",
        "count": 1
      }
    ]
  }
}
```

---

## 🧪 Testing

### Test Suite Coverage

Testing dilakukan secara komprehensif untuk memastikan semua endpoint berfungsi dengan baik:

| Module | Test Cases | Status |
|--------|-----------|--------|
| Auth | 9 tests | ✅ Passed |
| Users | 7 tests | ✅ Passed |
| Customers | 9 tests | ✅ Passed |
| Orders | 12 tests | ✅ Passed |
| Services | 8 tests | ✅ Passed |
| Payments | 13 tests | ✅ Passed |
| Stats | 2 tests | ✅ Passed |
| Errors | 5 tests | ✅ Passed |
| **TOTAL** | **65 tests** | ✅ **All Passed** |

### Manual Testing dengan Swagger UI

1. **Buka Swagger UI**
   ```
   http://localhost:5000/api-docs
   ```

2. **Login untuk dapat Token**
   - Klik endpoint `POST /api/v1/auth/login`
   - Klik "Try it out"
   - Masukkan body:
     ```json
     {
       "username": "admin",
       "password": "password123"
     }
     ```
   - Klik "Execute"
   - Copy response token

3. **Authorize Request**
   - Klik tombol "Authorize" di atas
   - Masukkan: `Bearer <paste_token_here>`
   - Klik "Authorize"

4. **Test Protected Endpoints**
   - Sekarang bisa test semua endpoint yang butuh autentikasi

### Test dengan Postman/cURL

#### Login Test
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

#### Get Customers Test
```bash
curl -X GET http://localhost:5000/api/v1/customers \
  -H "Authorization: Bearer <token>"
```

#### Create Order Test
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"service_id": 1, "quantity": 5}
    ]
  }'
```

---

## 🔐 Role-Based Access Control

### Roles

#### Admin
- ✅ Akses penuh ke semua endpoint
- ✅ CRUD users
- ✅ CRUD services (create, update, delete)
- ✅ CRUD payments (create, update, delete)
- ✅ Delete orders
- ✅ Akses semua statistik

#### Pegawai
- ✅ Lihat semua customers (read)
- ✅ CRUD customers (write)
- ✅ Lihat semua services (read only)
- ✅ CRUD orders (hanya milik sendiri)
- ✅ Create payments
- ✅ Akses statistik (hanya milik sendiri)
- ❌ Tidak bisa CRUD users
- ❌ Tidak bisa create/update/delete services
- ❌ Tidak bisa delete orders (kecuali sendiri)
- ❌ Tidak bisa update/delete payments

### Access Control Matrix

| Endpoint | Admin | Pegawai |
|----------|-------|---------|
| POST /auth/login | ✅ | ✅ |
| POST /auth/register | ✅ | ❌ |
| GET /auth/me | ✅ | ✅ |
| GET /users | ✅ | ❌ |
| POST /users | ✅ | ❌ |
| PATCH /users/:id | ✅ | ❌ |
| DELETE /users/:id | ✅ | ❌ |
| GET /customers | ✅ | ✅ |
| POST /customers | ✅ | ✅ |
| PATCH /customers/:id | ✅ | ✅ |
| DELETE /customers/:id | ✅ | ✅ |
| GET /orders | ✅ | ✅ (own) |
| POST /orders | ✅ | ✅ |
| PATCH /orders/:id | ✅ | ✅ (own) |
| PATCH /orders/:id/status | ✅ | ✅ (own) |
| DELETE /orders/:id | ✅ | ❌ |
| GET /services | ✅ | ✅ |
| POST /services | ✅ | ❌ |
| PATCH /services/:id | ✅ | ❌ |
| DELETE /services/:id | ✅ | ❌ |
| GET /payments | ✅ | ✅ |
| POST /orders/:id/payments | ✅ | ✅ |
| PATCH /payments/:id | ✅ | ❌ |
| DELETE /payments/:id | ✅ | ❌ |
| GET /stats/dashboard | ✅ | ✅ (own) |

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```
Atau:
```json
{
  "success": false,
  "message": "Invalid token"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access forbidden: Admin only"
}
```

---

## 📖 Dokumentasi Pendukung

Project ini dilengkapi dengan dokumentasi lengkap:

### 1. Proposal
📄 [2026-06-04_proposal-restful-api-laundry-management.md](../../2026-06-04_proposal-restful-api-laundry-management.md)
- Gambaran umum project
- Penjelasan teknologi dan tools
- Rumusan masalah dan solusi

### 2. Software Requirements Specification (SRS)
📄 [SRS-Laundry-Management-API.md](../../SRS-Laundry-Management-API.md)
- Functional requirements detail
- Non-functional requirements
- Use case diagram dan deskripsi
- Database schema design

### 3. Product Requirements Document (PRD)
📄 [PRD-Laundry-Management-API.md](../../PRD-Laundry-Management-API.md)
- User persona (Admin, Pegawai, Customer)
- Feature requirements (MoSCoW prioritization)
- Workflow alur kerja
- API endpoint specifications

### 4. TODO Tracker
📄 [TODO.md](../../TODO.md)
- Progress tracking setiap fase
- Checklist implementasi
- Log aktivitas development

---

## ✅ Kriteria Tugas Terpenuhi

| Kriteria | Requirement | Status | Implementasi |
|----------|-------------|--------|--------------|
| **REST API** | REST API untuk domain pilihan | ✅ | Laundry Management System |
| **Resources** | Minimal 3 resource dengan relasi | ✅ | 7 tabel dengan 3+ FK relations |
| **CRUD** | Full CRUD untuk setiap resource | ✅ | 30 endpoint (Create, Read, Update, Delete) |
| **Framework** | Framework backend | ✅ | Express.js (Node.js) |
| **Auth** | Autentikasi | ✅ | JWT (HS256, 24 hours expiry) |
| **Database** | Database | ✅ | MySQL 8.0 (Docker) |
| **RBAC** | Role-based access control | ✅ | Admin vs Pegawai permissions |
| **Docs** | Auto dokumentasi via Swagger UI | ✅ | `/api-docs` dengan 30 endpoint |
| **Validation** | Input validation | ✅ | express-validator |

---

## 📝 Catatan untuk Demo/Pengumpulan

### Screenshots yang Diperlukan

1. **Swagger UI - Home**
   - Tampilkan daftar semua endpoint
   - URL: `http://localhost:5000/api-docs`

2. **Swagger UI - Auth Endpoints**
   - Expand POST /auth/login
   - Expand POST /auth/register
   - Expand GET /auth/me

3. **Testing - Login & Get Token**
   - Request: POST /auth/login
   - Response: Token diterima

4. **Testing - CRUD Example**
   - Pilih satu resource (misal: Orders)
   - Tampilkan GET, POST, PATCH, DELETE

5. **Testing - Role-Based Access**
   - Request dengan pegawai token ke admin endpoint → 403 Forbidden

6. **Database Records**
   - Tampilkan data di MySQL (customers, orders, payments)

### Script untuk Test-all
```bash
# Jalankan semua test
./test-all.sh
```

---

## 🤝 Support & Contact

**Developer**: TIM 03 - Rekayasa Web  
**Mata Kuliah**: Rekayasa Web - Semester 4  
**Institusi**: Universitas Nahdlatul Ulama Yogyakarta  
**Tanggal**: 11 Juni 2026

---

## 📄 License

Project ini dibuat untuk memenuhi tugas mata kuliah Rekayasa Web.

---

**Last Updated**: 4 Juni 2026
