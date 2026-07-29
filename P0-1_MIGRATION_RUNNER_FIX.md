# P0-1: Migration Runner System - Implementation Complete ✅

**Status**: 🟢 **IMPLEMENTATION COMPLETE** (Ready for Testing)
**Date**: 2026-07-28
**Priority**: P0 (Kritis)

---

## Problem Statement

### Original Issue (LAPORAN_BUG_PERBAIKAN.md P0-1)

**Lokasi**: `backend/docker-compose.yml:15-17`, `backend/migrations/`

**Gejala**: 
- `docker-compose.yml` mount seluruh folder `migrations/` ke `/docker-entrypoint-initdb.d`
- MySQL hanya menjalankan init script saat data-directory kosong
- Volume `mysql_data` persisten → setelah `001_init.sql` pernah jalan, penambahan `002` & `003` **tidak pernah di-apply**
- Kode aplikasi hard-depend pada kolom `code` (dari `002`): `findByUsername` SELECT `id, code, username, ...` → tanpa kolom itu → error `Unknown column 'code'` → login throw → 500

**Root Cause**: Docker's `/docker-entrypoint-initdb.d` hanya berjalan saat volume database kosong. Setelah database ada, migration baru tidak otomatis di-apply.

---

## Solution Implemented

### 1. Migration Runner dengan Umzug ✅

**File**: `backend/migrations/runner.js`

**Features**:
- ✅ Automatic migration tracking menggunakan `migrations` table
- ✅ Support SQL migration files dengan smart statement splitting
- ✅ Idempotent operations (bisa di-run berkali-kali)
- ✅ Health check untuk critical migrations
- ✅ Auto-run on server startup
- ✅ Graceful error handling (server tetap start jika migration gagal)

**Library**: Umzug v3.8.3 (sudah terinstall)

### 2. Combined Migration File ✅

**File**: `backend/migrations/004_combined_code_migration.sql`

**Advantages over 002 + 003**:
- ✅ **Idempotent**: Setiap statement cek apakah column/index sudah ada sebelum create/modify
- ✅ **Atomic**: Satu file untuk add columns + backfill + NOT NULL
- ✅ **Safe**: Tidak akan error jika di-run berkali-kali
- ✅ **Complete**: Includes backfill logic untuk existing data

**Structure**:
```sql
PART 1: Add Code Columns (dengan cek existence)
PART 2: Backfill Code Values (deterministic dari existing id)
PART 3: Set NOT NULL (dengan cek current NULLability)
```

### 3. Server Integration ✅

**File**: `backend/server.js`

**Integration Points**:
```javascript
const { runOnStartup, healthCheck } = require('./migrations/runner');

async function startServer() {
  // Run migrations on startup
  await runOnStartup();
  
  // Health check - verify critical migrations
  const healthResult = await healthCheck();
  
  if (!healthResult.healthy) {
    console.error('❌ Migration health check failed!');
  }
  
  app.listen(PORT, () => { ... });
}
```

**Behavior**:
1. Server start → otomatis jalankan pending migrations
2. Health check verifies critical migrations applied
3. Graceful degradation jika migration gagal (server tetap jalan dengan warning)

---

## Files Modified/Created

### Modified Files

1. **`backend/migrations/runner.js`** (line 261-266)
   - **Change**: Update criticalMigrations array
   - **Before**: `['001_init.sql', '002_add_code_column.sql', '003_code_not_null.sql']`
   - **After**: `['001_init.sql', '004_combined_code_migration.sql']`
   - **Reason**: 002/003 disabled, gunakan 004 yang combined

### Created Files

1. **`backend/migrations/004_combined_code_migration.sql`** (NEW)
   - Combined migration untuk code columns
   - Idempotent operations
   - Backfill logic untuk existing data

### Existing Files Utilized

1. **`backend/server.js`** (already integrated)
   - Lines 14, 183, 196: Migration runner calls
   - No modifications needed

---

## Migration Flow

### Initial Setup (Fresh Database)

```
1. Docker volume kosong → 001_init.sql runs via /docker-entrypoint-initdb.d
2. Server start → runner.js detects pending migration 004
3. 004_combined_code_migration.sql runs:
   - Add code columns to 5 tables (users, customers, services, orders, payments)
   - Backfill codes untuk existing data (deterministic dari id)
   - Set code columns to NOT NULL
4. migrations table updated: 001_init.sql ✅, 004_combined_code_migration.sql ✅
5. Server ready dengan code columns fully implemented
```

### Existing Database (Already Has 001)

```
1. Server start → runner.js detects pending migration 004
2. 004_combined_code_migration.sql runs (idempotent):
   - Cek apakah code columns exist → jika belum, ADD
   - Cek apakah data punya code → jika NULL, backfill
   - Cek apakah columns NOT NULL → jika nullable, MODIFY
3. migrations table updated
4. Server ready
```

### Subsequent Server Starts

```
1. Server start → runner.js checks migrations table
2. All migrations already applied → no action needed
3. Health check passes ✅
4. Server starts normally
```

---

## Testing Instructions

### Prerequisites

```bash
# Make sure MySQL is running (Docker atau local)
# Docker:
cd backend
docker-compose up -d

# Atau local MySQL yang sudah terinstall
```

### Test Steps

1. **Stop existing server** (if running)
   ```bash
   # Ctrl+C jika npm run dev sedang jalan
   ```

2. **Clean database state** (optional, untuk fresh test)
   ```bash
   # Docker - remove volume untuk fresh start
   docker-compose down -v
   docker-compose up -d
   ```

3. **Start server dengan migrations**
   ```bash
   cd backend
   npm run dev
   ```

4. **Expected Output**
   ```
   ╔══════════════════════════════════════════════════════════╗
   ║     Laundry Management System - RESTful API             ║
   ╚══════════════════════════════════════════════════════════╝
   🔄 Running database migrations...
   ✅ Migration table 'migrations' ready
   🔍 Checking for pending migrations...
   📦 Found 1 pending migrations:
      - 004_combined_code_migration.sql
   🚀 Running migrations...
   Processing 45 statements from 004_combined_code_migration.sql...
   Executing statement 1/45...
   Executing statement 2/45...
   ...
   ✅ 004_combined_code_migration.sql completed successfully
   ✅ All migrations completed successfully!
   📊 Migration Status: 2/2 executed
   🏥 Running migration health check...
   ✅ Migration health check passed!
   🚀 Server running on port 5000
   📍 Environment: development
   📚 API Docs: http://localhost:5000/api-docs
   🔗 Base URL: http://localhost:5000/api/v1
   ```

5. **Verify Database Schema**
   ```bash
   # Connect ke MySQL
   docker exec -it laundry_db mysql -u root -proot laundry_db
   
   # Cek code columns
   DESCRIBE users;  -- harus ada column 'code' VARCHAR(20) NOT NULL
   DESCRIBE customers;  -- harus ada column 'code' VARCHAR(20) NOT NULL
   DESCRIBE services;  -- harus ada column 'code' VARCHAR(20) NOT NULL
   DESCRIBE orders;  -- harus ada column 'code' VARCHAR(20) NOT NULL
   DESCRIBE payments;  -- harus ada column 'code' VARCHAR(20) NOT NULL
   
   # Cek backfilled data
   SELECT id, username, code FROM users;
   SELECT id, name, code FROM customers;
   SELECT id, name, code FROM services;
   
   # Cek migrations table
   SELECT * FROM migrations;
   ```

---

## Verification Checklist

### ✅ Implementation Complete

- [x] Migration runner created (`runner.js`)
- [x] Umzug library integrated
- [x] Combined migration file created (`004_combined_code_migration.sql`)
- [x] Server integration complete (`server.js`)
- [x] Health check updated to use correct migration files
- [x] Critical migrations array updated (001 + 004)

### 🟡 Testing Pending (Requires Database)

- [ ] MySQL running (Docker or local)
- [ ] Server starts without errors
- [ ] Migrations apply successfully
- [ ] Code columns exist in 5 tables
- [ ] Code columns are NOT NULL
- [ ] Existing data has codes backfilled
- [ ] Migrations table tracks executed migrations
- [ ] Health check passes
- [ ] Login works (no `Unknown column 'code'` error)

---

## Rollback Plan (If Needed)

### Jika migration gagal atau ada masalah

```sql
-- Manual rollback (jika perlu)
USE laundry_db;

-- Drop migrations table
DROP TABLE IF EXISTS migrations;

-- Revert code columns (jika perlu)
ALTER TABLE users DROP COLUMN IF EXISTS code;
ALTER TABLE customers DROP COLUMN IF EXISTS code;
ALTER TABLE services DROP COLUMN IF EXISTS code;
ALTER TABLE orders DROP COLUMN IF EXISTS code;
ALTER TABLE payments DROP COLUMN IF EXISTS code;
```

Atau gunakan Docker volume reset:
```bash
docker-compose down -v  # Hapus semua data
docker-compose up -d   # Fresh start
```

---

## Next Steps

1. **Start MySQL Database** (Docker atau local)
2. **Test Migration Runner** dengan menjalankan server
3. **Verify Schema** sesuai expected
4. **Test Login** untuk pastikan `Unknown column 'code'` error sudah fixed
5. **Continue ke P0-2**: Fix Payment Isolation Bypass

---

## Notes

- **Idempotent**: Migration 004 bisa di-run berkali-kali tanpa error
- **Safe**: Setiap statement cek existence sebelum modify
- **Deterministic**: Backfill menggunakan existing id → konsisten setiap run
- **No Downtime**: Migration otomatis di background saat server start
- **Graceful**: Server tetap start jika migration gagal (dengan warning)

**Status**: 🟢 Ready untuk testing begitu database tersedia.
