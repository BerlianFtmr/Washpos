---
created_at: 2026-07-31
topic: "Troubleshooting Guide: Database Tables Missing After Docker Restart"
tags: [docker, mysql, troubleshooting, database, persistence, migration, how-to]
source_urls:
  - "https://docs.docker.com/storage/volumes/"
  - "https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html"
suggested_location: "02_NOTES"
status: completed
version: "1.0.0"
project: "washpos"
ai_model: "Claude Opus 4.5"
related_files:
  - "2026-07-31_analysis-database-connection-error.md"
  - "database-schema-v1.0.0-washpos.md"
---

# 🔧 TROUBLESHOOTING GUIDE: Database Tables Missing After Docker Restart

## 🎯 Problem Summary

**Symptom:** Setelah restart docker, perintah `npm run seed` gagal dengan error:
```
❌ Seed failed: Table 'laundry_db.users' doesn't exist
```

**Root Cause:** Migration runner mencatat bahwa migration sudah "executed" di tabel `migrations`, tapi sebenarnya tabel-tabel bisnis (users, customers, dll) **tidak terbuat**.

---

## 🔍 Problem Analysis

### Current State (After Docker Restart)

```bash
# Container status
✅ Container laundry_db: Running

# Database status
✅ Database laundry_db: EXISTS

# Tables in database
❌ Only 1 table: migrations
❌ Missing: users, customers, services, orders, order_items, payments, audit_logs

# Migration table content
mysql> SELECT * FROM migrations;
+----+---------------+---------------------+
| id | name          | executed_at         |
+----+---------------+---------------------+
|  1 | 001_init.sql  | 2026-07-31 06:15:57 |
+----+---------------+---------------------+
```

### Why This Happens?

1. **Migration Record Exists but Tables Don't**
   - Migration `001_init.sql` tercatat sebagai "executed"
   - Tapi SQL execution sebenarnya gagal atau tidak lengkap
   - Setelah docker restart, kondisi ini "terbawa"

2. **Migration Runner Behavior**
   - Runner cek: "Apakah migration sudah pernah dijalankan?"
   - Jawab: "Ya, 001_init.sql sudah executed"
   - Runner: "Ok, skip eksekusi SQL-nya"
   - Hasil: Tabel tidak pernah dibuat! 😱

---

## 🛠️ SOLUTION (Step-by-Step)

### Step 1: Delete Migration Record ( agar bisa dijalankan ulang)

**Tujuan:** Hapus record migration agar runner menjalankan SQL migration lagi.

```bash
# Masuk ke MySQL container
docker exec -it laundry_db mysql -u root -proot

# Di dalam MySQL prompt:
USE laundry_db;
DELETE FROM migrations WHERE name='001_init.sql';
SELECT * FROM migrations;  # Verifikasi: harus kosong
EXIT;
```

**Expected Result:**
```
mysql> SELECT * FROM migrations;
Empty set (0.00 sec)
```

---

### Step 2: Run Migration SQL Manually

**Tujuan:** Membuat semua tabel bisnis (7 tables) dengan menjalankan migration SQL.

```bash
# Copy migration file ke container
docker cp migrations/001_init.sql laundry_db:/tmp/001_init.sql

# Jalankan SQL migration
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "source /tmp/001_init.sql"

# Verifikasi tabel terbuat
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES;"
```

**Expected Result:**
```
+------------------------+
| Tables_in_laundry_db  |
+------------------------+
| audit_logs             |
| customers              |
| migrations            |
| order_items           |
| orders                |
| payments              |
| services              |
| users                 |
+------------------------+
8 rows in set
```

---

### Step 3: Run Code Migration ( untuk column `code` )

**Tujuan:** Menambahkan column `code` ke tabel users, customers, services (ID strategy).

```bash
# Copy code migration file
docker cp migrations/004_combined_code_migration.sql laundry_db:/tmp/004_combined_code_migration.sql

# Jalankan code migration
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "source /tmp/004_combined_code_migration.sql"

# Verifikasi column 'code' ada
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "DESCRIBE users;" | grep code
```

**Expected Result:**
```
| code  | varchar(20)       | NO   | UNI | NULL    |                |
```

---

### Step 4: Record Migrations ( agar tracker sinkron )

**Tujuan:** Catat bahwa kedua migration sudah berhasil dijalankan.

```bash
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "
INSERT INTO migrations (name) VALUES ('001_init.sql'), ('004_combined_code_migration.sql');
SELECT * FROM migrations;
"
```

**Expected Result:**
```
+----+---------------------------------------+---------------------+
| id | name                                  | executed_at         |
+----+---------------------------------------+---------------------+
|  1 | 001_init.sql                          | 2026-07-31 xx:xx:xx |
|  2 | 004_combined_code_migration.sql       | 2026-07-31 xx:xx:xx |
+----+---------------------------------------+---------------------+
```

---

### Step 5: Run Seed Data

**Tujuan:** Mengisi data awal (users, services, customers).

```bash
npm run seed
```

**Expected Result:**
```
🌱 Starting seed...
✅ Database connected successfully
   Host: localhost:3307
   Database: laundry_db
✅ Seeded 2 users (admin, pegawai1)
   Credentials: username=admin/pegawai1, password=password123
   Codes: admin=USR-XXXXX, pegawai1=USR-XXXXX
✅ Seeded 10 services (SVC-01..SVC-10)
✅ Seeded 3 sample customers
   Codes: CUS-XXXXX, CUS-XXXXX, CUS-XXXXX
🎉 Seed completed successfully!
```

---

### Step 6: Verify Everything Works

```bash
# Test backend (pastikan server sudah running)
curl http://localhost:5000/

# Test login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "code": "USR-XXXXX",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

## 📋 Quick Reference Command (One-Liners)

Jika kamu sudah familiar, ini adalah versi singkat:

```bash
# 1. Delete migration record
docker exec laundry_db mysql -u root -proot -e "DELETE FROM laundry_db.migrations WHERE name='001_init.sql';"

# 2. Run init migration
docker cp migrations/001_init.sql laundry_db:/tmp/001_init.sql
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "source /tmp/001_init.sql"

# 3. Run code migration
docker cp migrations/004_combined_code_migration.sql laundry_db:/tmp/004_combined_code_migration.sql
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "source /tmp/004_combined_code_migration.sql"

# 4. Record migrations
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "INSERT INTO migrations (name) VALUES ('001_init.sql'), ('004_combined_code_migration.sql');"

# 5. Run seed
npm run seed
```

---

## 🔍 Understanding What Went Wrong

### Docker Volume Persistence

**Cek apakah volume persistent work:**
```bash
# Volume mount di docker-compose.yml
volumes:
  - ./mysql_data:/var/lib/mysql

# Cek isi mysql_data directory
ls -la mysql_data/

# Expected: Banyak file ibdata1, ib_logfile0, dll (database files)
```

✅ **Volume persistent work dengan benar** - Data tidak hilang setelah restart.

### The Real Problem

Masalahnya adalah **Migration Tracking Inconsistency**:

```
┌─────────────────────────────────────────────────────────┐
│  Migration Runner Logic                                  │
├─────────────────────────────────────────────────────────┤
│  1. Cek: "Is 001_init.sql already executed?"           │
│  2. migrations table: "YES, executed_at=2026-07-31"     │
│  3. Runner: "Skip execution, it's already done"        │
│  4. Result: Tables never created! ❌                    │
└─────────────────────────────────────────────────────────┘
```

**Solusi:** Reset migration record → Force re-run migration

---

## 🛡️ Prevention: How to Avoid This in Future

### Option 1: Automatic Migration on Startup

**Current Implementation:**
```javascript
// File: server.js
const { runOnStartup } = require('./migrations/runner');

// This runs automatically when backend starts
await runOnStartup();
```

✅ Ini sudah implement, tapi perlu verification step.

### Option 2: Add Migration Health Check

Tambahkan script verifikasi setelah migration:

```javascript
// File: migrations/runner.js
async function verifyMigration() {
  const [rows] = await pool.query("SHOW TABLES");
  const requiredTables = ['users', 'customers', 'services', 'orders',
                         'order_items', 'payments', 'audit_logs'];

  const existingTables = rows.map(row => Object.values(row)[0]);
  const missing = requiredTables.filter(t => !existingTables.includes(t));

  if (missing.length > 0) {
    console.error('❌ Missing tables:', missing);
    console.log('🔄 Re-running migration...');
    // Re-run migration logic here
  }
}
```

### Option 3: Manual Verification Script

Buat file `verify-db.sh`:
```bash
#!/bin/bash
echo "🔍 Verifying database..."

TABLES=$(docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES;" | grep -v "Tables_in" | wc -l)

if [ "$TABLES" -lt 8 ]; then
  echo "❌ Missing tables! Found: $TABLES, Expected: 8"
  echo "🔧 Run: ./fix-database.sh"
  exit 1
else
  echo "✅ Database OK: 8 tables found"
fi
```

---

## 📚 Learning Points

### 1. Docker Volume Persistence

✅ **Volume Mount yang Benar:**
```yaml
volumes:
  - ./mysql_data:/var/lib/mysql  # Host directory → Container directory
```

❌ **Salah (data akan hilang):**
```yaml
volumes:
  - mysql_data  # Named volume (terisolasi, hard to debug)
```

### 2. Migration Tracking

✅ **Best Practice:**
- Migration runner harus **verify SQL execution success** sebelum mencatat "executed"
- Add **post-migration validation** (cek apakah tabel benar-benar ada)

❌ **Current Issue:**
- Runner mencatat "executed" tanpa verifikasi
- Ketika SQL gagal, record tetap ada

### 3. Troubleshooting Mindset

**Langkah Analisis:**
1. ✅ Cek container status: `docker ps`
2. ✅ Cek database existence: `SHOW DATABASES`
3. ✅ Cek tables: `SHOW TABLES`
4. ✅ Cek migration tracker: `SELECT * FROM migrations`
5. 🔍 **Identifikasi inconsistency**
6. 🛠️ **Fix root cause, bukan symptoms**

---

## 🎯 Summary

### Problem
- Migration `001_init.sql` tercatat "executed" tapi tabel tidak ada
- Seed gagal karena tabel missing

### Solution
- **Hapus migration record** → **Jalankan SQL manual** → **Record ulang** → **Seed**

### Prevention
- Add verification step di migration runner
- Create health check script
- Understand Docker volume persistence

---

## 📞 Quick Help

**Ketika error ini terjadi lagi:**

```bash
# Quick check: apa database kosong?
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES;" | wc -l

# Jika hasil < 8, jalankan fix:
./fix-database.sh  # (create this script from Quick Reference above)

# Atau manual step-by-step (lihat panduan di atas)
```

---

*Guide created: 2026-07-31*
*Author: Claude (AI Research Assistant)*
*For: Washpos Project - Rekayasa Web*
