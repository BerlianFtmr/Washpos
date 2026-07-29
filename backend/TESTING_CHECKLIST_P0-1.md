# P0-1 Testing Checklist - Migration Runner System

**Status**: ⏳ **WAITING FOR DOCKER**  
**Ready to Test**: ✅ Yes - All code implemented

---

## 🚀 Quick Start Guide (Untuk User)

### Step 1: Start Docker Desktop

**Windows**:
1. Buka **Docker Desktop** application
2. Tunggu sampai Docker whale icon muncul di system tray
3. Verifikasi Docker running:
   ```bash
   docker --version
   docker ps
   ```

**Expected Output**:
```
Docker version 28.4.0, build d8eb465
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

---

### Step 2: Navigate to Backend Folder

```bash
cd "H:\KULIAH\SEM4\Rekayasa Web\01_TUGAS\Washpos\backend"
```

---

### Step 3: Fresh Install Test (DELETE OLD DATA)

⚠️ **WARNING**: Ini akan **MENGHAPUS SEMUA DATA** yang ada di database!

```bash
# Stop dan hapus volume lama
docker-compose down -v

# Verify volume deleted
docker volume ls | grep mysql
```

**Expected**: Tidak ada mysql_data volume

---

### Step 4: Start Fresh MySQL

```bash
# Start MySQL dengan fresh database
docker-compose up -d

# Wait 10-20 seconds untuk MySQL startup
echo "Waiting for MySQL to start..."
timeout /t 20 /nobreak

# Verify MySQL running
docker-compose ps
```

**Expected Output**:
```
NAME                STATUS          PORTS
laundry_db          Up 20 seconds   0.0.0.0:3307->3306/tcp
```

---

### Step 5: Test Migration System

```bash
# Install ulang dependencies (untuk memastikan umzug terinstall)
npm install

# Start server (auto-run migrations)
npm run dev
```

**Expected Server Logs**:
```
╔══════════════════════════════════════════════════════════╗
║     Laundry Management System - RESTful API             ║
╚══════════════════════════════════════════════════════════╝
🔄 Running database migrations...
🔍 Checking for pending migrations...
📦 Found 4 pending migrations:
   - 001_init.sql
   - 002_add_code_column.sql  
   - 003_code_not_null.sql
   - 004_combined_code_migration.sql
🚀 Running migrations...
✅ All migrations completed successfully!
📊 Migration Status: 4/4 executed
🏥 Running migration health check...
✅ Migration health check passed!
🚀 Server running on port 5000
📍 Environment: development
📚 API Docs: http://localhost:5000/api-docs
🔗 Base URL: http://localhost:5000/api/v1
```

---

### Step 6: Verify Migration Status

**Buka terminal baru** (jangan stop server):

```bash
cd "H:\KULIAH\SEM4\Rekayasa Web\01_TUGAS\Washpos\backend"

# Check migration status
npm run migrate:status
```

**Expected JSON Output**:
```json
{
  "executed": [
    "001_init.sql",
    "002_add_code_column.sql",
    "003_code_not_null.sql",
    "004_combined_code_migration.sql"
  ],
  "pending": [],
  "total": 4
}
```

---

### Step 7: Verify Database Schema

```bash
# Connect ke MySQL
docker exec -it laundry_db mysql -u root -proot laundry_db

# Di dalam MySQL shell, jalankan:
DESCRIBE users;
DESCRIBE customers;
DESCRIBE services;
DESCRIBE orders;
DESCRIBE payments;

# Exit MySQL shell
exit
```

**Expected Output**: Setiap tabel harus punya kolom `code`

```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| id    | int         | NO   | PRI | NULL    | auto_increment |
| code  | varchar(20) | NO   | UNI | NULL    |                |
| ...   | ...         | ...  | ... | ...     | ...            |
+-------+-------------+------+-----+---------+----------------+
```

---

### Step 8: Seed Database

```bash
# Di terminal backend folder (bukan di MySQL shell)
npm run seed
```

**Expected Output**:
```
Seeding database...
✅ Users seeded: 2 users created
✅ Services seeded: 10 services created  
✅ Customers seeded: 3 customers created
Database seeding completed!
```

---

### Step 9: Test Login (Critical Test!)

```bash
# Test login dengan admin account
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"password123\"}"
```

**Expected SUCCESS Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "code": "USR-XXXXXX",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**❌ FAIL Response** (500) - Berarti migration tidak bekerja:
```json
{
  "success": false,
  "message": "Login failed"
}
```

---

### Step 10: Verify Code Generation Works

```bash
# Test get customers dengan code
curl http://localhost:5000/api/v1/customers \
  -H "Authorization: Bearer <token_dari_step_9>"
```

**Expected**: Response harus berisi customers dengan `code` field:
```json
{
  "success": true,
  "message": "Customers retrieved successfully",
  "data": [
    {
      "code": "CUS-XXXXXX",
      "name": "Ahmad",
      "whatsapp": "6281234567890",
      ...
    }
  ]
}
```

---

### Step 11: Test Legacy ID Rejection (FASE 4)

```bash
# Test numeric ID (should FAIL in FASE 4)
curl http://localhost:5000/api/v1/customers/1 \
  -H "Authorization: Bearer <token>"
```

**Expected FAIL Response** (400):
```json
{
  "success": false,
  "message": "Invalid ID format. Use code format (e.g., CUS-XXXXXX)"
}
```

---

### Step 12: Health Check Verification

```bash
# Run health check
npm run migrate:health
```

**Expected Output**:
```json
{
  "healthy": true,
  "status": {
    "executed": ["001_init.sql", "002_add_code_column.sql", "003_code_not_null.sql", "004_combined_code_migration.sql"],
    "pending": [],
    "total": 4
  }
}
```

---

## ✅ SUCCESS CRITERIA

P0-1 testing dianggap **SUCCESS** jika:

- [x] Docker running (laundry_db container up)
- [x] Server starts without errors
- [x] All 4 migrations executed successfully
- [x] Migration status shows 4/4 executed
- [x] Database schema has `code` column in all 5 entity tables
- [x] Seed data created successfully
- [x] Login works (returns 200, not 500)
- [x] Response includes `code` field
- [x] Legacy numeric ID rejected (400 error)
- [x] Health check passes

---

## ❌ FAILURE INDICATORS

Jika ada masalah berikut:

1. **Server won't start**
   - Check: Docker running? (`docker ps`)
   - Check: MySQL ready? (wait 20-30 seconds after `docker-compose up`)
   - Check: Port 5000 available? (tidak ada other app)

2. **Migration fails**
   - Check: MySQL connection (`.env` file credentials)
   - Check: Migration file syntax
   - Check server logs untuk specific error

3. **Login fails with 500**
   - **Ini artinya migration tidak bekerja!**
   - Expected: `Unknown column 'code'` error
   - Solution: Verify migrations actually ran

4. **Database connection errors**
   - Check: `.env` file has correct DB credentials
   - Check: MySQL container is running
   - Check: Network connectivity

---

## 🛠️ Troubleshooting Common Issues

### Issue: "Cannot connect to MySQL"

**Solution**:
```bash
# Check MySQL container
docker-compose ps

# Restart MySQL if needed
docker-compose restart mysql

# Wait 20 seconds then retry
```

### Issue: "Port 5000 already in use"

**Solution**:
```bash
# Find process using port 5000
netstat -ano | findstr ":5000"

# Kill the process (gunakan PID dari command di atas)
taskkill /PID <PID> /F

# Atau gunakan port lain
set PORT=5001 && npm run dev
```

### Issue: "Migration files not found"

**Solution**:
```bash
# Verify migration files exist
dir migrations\*.sql

# Should see:
# 001_init.sql
# 002_add_code_column.sql
# 003_code_not_null.sql
# 004_combined_code_migration.sql
```

---

## 📋 Testing Summary Report Template

Setelah testing selesai, hasilkan report:

```markdown
## P0-1 Testing Report - [DATE]

### Environment
- Docker Status: [Running/Not Running]
- MySQL Container: [Up/Down]
- Node.js Version: [version]
- npm Version: [version]

### Migration Results
- Migrations Executed: [X/4]
- Migration Status: [All executed/Some failed]
- Health Check: [Passed/Failed]

### Schema Verification
- users.code: [Present/Missing]
- customers.code: [Present/Missing]
- services.code: [Present/Missing]
- orders.code: [Present/Missing]
- payments.code: [Present/Missing]

### Functional Testing
- Server Start: [Success/Failed]
- Database Seed: [Success/Failed]
- Login Test: [Success/Failed]
- Code Field Response: [Success/Failed]
- Legacy ID Rejection: [Success/Failed]

### Overall Result: [SUCCESS/FAILED]

### Issues Found:
- [List any issues]

### Recommendations:
- [Any recommendations for improvements]
```

---

## 🎯 Ready to Test?

**Saat Docker sudah running**, jalankan perintah ini satu per satu:

```bash
# 1. Navigate to backend
cd "H:\KULIAH\SEM4\Rekayasa Web\01_TUGAS\Washpos\backend"

# 2. Fresh install test
docker-compose down -v && docker-compose up -d

# 3. Start server (auto-run migrations)
npm run dev

# 4. Di terminal baru, check status
npm run migrate:status

# 5. Test login
curl -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"password123\"}"
```

**Lapor hasil testing ke saya dan saya akan update status P0-1!** 🚀

---

**Created**: 2026-07-28  
**Status**: Ready for Testing  
**Next**: Wait for Docker → Execute tests → Update TODO
