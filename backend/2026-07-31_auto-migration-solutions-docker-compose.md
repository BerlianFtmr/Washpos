---
created_at: 2026-07-31
topic: "Auto-Migration Solutions: Docker Compose Up"
tags: [docker, mysql, auto-migration, docker-entrypoint, automation, devops]
source_urls:
  - "https://docs.docker.com/compose/startup-order/"
  - "https://hub.docker.com/_/mysql#//var/lib/mysql/mysql dumpsvolume"
  - "https://dev.mysql.com/doc/refman/8.0/en/backup.html"
suggested_location: "03_RISET"
status: completed
version: "1.0.0"
project: "washpos"
ai_model: "Claude Opus 4.5"
related_files:
  - "2026-07-31_troubleshooting-guide-database-after-docker-restart.md"
  - "docker-compose.yml"
---

# 🔧 SOLUSI AUTO-MIGRATION: Docker Compose Up

## 🎯 Problem

Saat ini setiap docker restart, kamu harus:
- ❌ Manual jalankan migration SQL
- ❌ Manual record ke migrations table
- ❌ Manual run seed data

**Goal:** Docker compose up → Database siap pakai otomatis ✅

---

## 📋 Available Solutions (3 Options)

### Option 1: Docker Entrypoint Init (Recommended for Fresh Database)

**Konsep:** MySQL image punya fitur auto-execute SQL files di folder `/docker-entrypoint-initdb.d/`

**Kelebihan:**
- ✅ Pure Docker, tanpa dependency ke backend
- ✅ Jalan otomatis saat **pertama kali** container dibuat
- ✅ Simple, tinggal copy SQL files

**Kekurangan:**
- ❌ **Hanya jalan sekali** (saat container pertama kali dibuat)
- ❌ Tidak jalan jika volume sudah ada data
- ❌ Tidak ada rollback/upgrade migration logic

**Best untuk:** Production initial setup, clean slate deployment

---

### Option 2: Init Container (Recommended for Automation)

**Konsep:** Buat container khusus yang jalan SEBELUM backend, tugasnya hanya migrasi database.

**Kelebihan:**
- ✅ Jalan **setiap kali** docker compose up
- ✅ Bisa logic kompleks (check migration status, run if needed)
- ✅ Terpisah dari backend (clean separation)
- ✅ Bisa retry logic jika database belum ready

**Kekurangan:**
- ⚠️ Perlu buat Dockerfile khusus
- ⚠️ Sedikit lebih kompleks setup

**Best untuk:** Development environment, CI/CD pipeline

---

### Option 3: Backend Startup Migration (Current Implementation)

**Konsep:** Backend auto-run migration saat startup (yang sudah ada sekarang).

**Kelebihan:**
- ✅ Sudah implement
- ✅ Bisa complex logic (Umzug migration runner)
- ✅ Terintegrasi dengan backend codebase

**Kekurangan:**
- ❌ Backend depends on database ready
- ❌ Jika migration gagal, backend crash
- ❌ Perlu backend running untuk migrasi

**Best untuk:** Development, existing project

---

## 🚀 RECOMMENDED SOLUTION: Option 2 (Init Container)

Ini adalah **solusi paling robust** untuk use case kamu.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Docker Compose Startup Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. MySQL Container Start                             │
│     ↓ (wait for healthy)                               │
│  2. Init Container (migration-runner)                  │
│     ├─ Check database ready                            │
│     ├─ Run pending migrations                         │
│     └─ Exit (0 = success)                              │
│     ↓                                                  │
│  3. Backend Container Start                           │
│     └─ Database already ready ✅                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Create Init Script

**File:** `scripts/init-db.sh`

```bash
#!/bin/bash
set -e

echo "🔧 Waiting for MySQL to be ready..."
until docker exec laundry_db mysql -u root -proot -e "SELECT 1" &> /dev/null
do
  echo "⏳ MySQL is unavailable - sleeping"
  sleep 2
done

echo "✅ MySQL is ready!"

echo "🔄 Running database migrations..."

# Check if migrations table exists
TABLE_EXISTS=$(docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES LIKE 'migrations';" | grep -c migrations || true)

if [ "$TABLE_EXISTS" -eq 0 ]; then
  echo "📋 Creating migrations table..."
  docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "
    CREATE TABLE migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  "
fi

# Check which migrations need to run
MIGRATIONS_NEEDED=()

# 001_init.sql
INIT_EXISTS=$(docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SELECT COUNT(*) FROM migrations WHERE name='001_init.sql';" | tail -1 2>/dev/null || echo "0")
if [ "$INIT_EXISTS" -eq 0 ]; then
  MIGRATIONS_NEEDED+=("001_init.sql")
fi

# 004_combined_code_migration.sql
CODE_EXISTS=$(docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SELECT COUNT(*) FROM migrations WHERE name='004_combined_code_migration.sql';" | tail -1 2>/dev/null || echo "0")
if [ "$CODE_EXISTS" -eq 0 ]; then
  MIGRATIONS_NEEDED+=("004_combined_code_migration.sql")
fi

# Run migrations if needed
if [ ${#MIGRATIONS_NEEDED[@]} -gt 0 ]; then
  echo "📝 Running migrations: ${MIGRATIONS_NEEDED[@]}"

  for migration in "${MIGRATIONS_NEEDED[@]}"; do
    echo "▶️  Running $migration..."
    docker cp "migrations/$migration" laundry_db:/tmp/$migration
    docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "source /tmp/$migration"

    # Record migration
    docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "INSERT INTO migrations (name) VALUES ('$migration');"
    echo "✅ $migration completed"
  done
else
  echo "✅ All migrations already applied"
fi

# Check if seed data needed
USER_COUNT=$(docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SELECT COUNT(*) FROM users;" | tail -1 2>/dev/null || echo "0")
if [ "$USER_COUNT" -eq 0 ]; then
  echo "🌱 Running seed data..."
  # Copy seed script and run
  docker cp seed.js laundry_db:/tmp/seed.js
  docker exec laundry_db node /tmp/seed.js
else
  echo "✅ Seed data already exists"
fi

echo "🎉 Database initialization complete!"
```

---

#### Step 2: Update docker-compose.yml

**Current:**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: laundry_db
    # ... existing config
```

**Updated (add init container):**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: laundry_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: laundry_db
      MYSQL_USER: laundry_user
      MYSQL_PASSWORD: laundry_pass
    ports:
      - "3307:3306"
    volumes:
      - ./mysql_data:/var/lib/mysql
      # Option 1: Auto-run SQL on FIRST container creation
      # - ./migrations/001_init.sql:/docker-entrypoint-initdb.d/01-init.sql
      # - ./migrations/004_combined_code_migration.sql:/docker-entrypoint-initdb.d/02-code.sql
    networks:
      - washpos_network
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot"]
      timeout: 5s
      retries: 10

  # Option 2: Init container (runs every time)
  migration-runner:
    image: mysql:8.0
    container_name: laundry_migration_runner
    volumes:
      - ./migrations:/migrations:ro
      - ./scripts:/scripts:ro
      - ./seed.js:/seed.js:ro
    command: /scripts/init-db.sh
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - washpos_network

networks:
  washpos_network:
    driver: bridge
```

---

### Option 1: Simpler Approach (docker-entrypoint-initdb.d)

Kalau mau lebih simple, gunakan fitur bawaan MySQL:

**Update docker-compose.yml:**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: laundry_db
    # ... existing config
    volumes:
      - ./mysql_data:/var/lib/mysql
      # Add these lines:
      - ./migrations/001_init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./migrations/004_combined_code_migration.sql:/docker-entrypoint-initdb.d/02-code.sql
      # - ./scripts/seed.sql:/docker-entrypoint-initdb.d/03-seed.sql
```

**Buat file seed.sql:**
```sql
-- File: scripts/seed.sql
-- This file will be auto-executed on first container creation

-- Insert users (password: password123 = bcrypt hash)
INSERT INTO users (username, password, role, code) VALUES
('admin', '$2a$10$YourBcryptHashHere', 'admin', 'USR-ADMIN'),
('pegawai1', '$2a$10$YourBcryptHashHere', 'pegawai', 'USR-PEGAWAI1');

-- Insert services
INSERT INTO services (name, price, unit, active, code) VALUES
('Cuci Kiloan', 5000.00, 'kg', TRUE, 'SVC-01'),
('Cuci Kiloan Express', 7000.00, 'kg', TRUE, 'SVC-02'),
-- ... rest of services
```

**IMPORTANT:** This approach ONLY works on:
- ✅ First time container creation
- ✅ Empty volume (no existing data)

**NOT work on:**
- ❌ Container restart (volume already has data)
- ❌ docker compose down && docker compose up (volume persists)

---

### Option 3: Fix Current Backend Migration

Alternative: Perbaiki migration runner yang ada sekarang.

**Problem saat ini:**
```javascript
// File: migrations/runner.js
// Issue: Marks migration as executed BEFORE verifying success
async function logMigration({ name }) {
  await this.pool.query(
    `INSERT INTO ${this.tableName} (name) VALUES (?)`,
    [name]
  );
  // ❌ No verification if SQL actually succeeded!
}
```

**Solution: Add verification**
```javascript
async function logMigration({ name }) {
  // First, run the SQL
  await this.pool.query(`source /path/to/${name}`);

  // THEN verify: check if tables exist
  const [rows] = await pool.query("SHOW TABLES");
  if (rows.length === 0) {
    throw new Error(`Migration ${name} failed: No tables created`);
  }

  // Only mark as executed if verification passes
  await this.pool.query(
    `INSERT INTO ${this.tableName} (name) VALUES (?)`,
    [name]
  );
}
```

---

## 📊 Comparison Table

| Feature | Option 1: Entrypoint | Option 2: Init Container | Option 3: Backend Runner |
|---------|---------------------|--------------------------|--------------------------|
| **Auto-run on compose up** | ❌ Only first time | ✅ Every time | ✅ Every time |
| **Re-run if migration fails** | ❌ No | ✅ Yes | ✅ Yes |
| **Separated from backend** | ✅ Yes | ✅ Yes | ❌ No |
| **Complex logic support** | ❌ SQL only | ✅ Bash scripts | ✅ JavaScript |
| **Setup complexity** | 🟢 Simple | 🟡 Medium | 🟢 Already done |
| **Production ready** | ✅ Yes | ✅ Yes | ⚠️ Needs fix |
| **Best for** | Fresh setup | Dev/CI/CD | Dev only |

---

## 🎯 Recommendation

### For Development (Your Current Case)
**Use Option 2 (Init Container)** karena:
- ✅ Reliable: Jalan setiap compose up
- ✅ Independent: Backend tidak akan crash karena migration
- ✅ Debuggable: Bisa check logs dari container terpisah
- ✅ Flexible: Bisa edit script tanpa rebuild backend

### For Production
**Use Option 1 (Entrypoint)** untuk initial deployment + **Option 3 (Backend Runner)** untuk schema updates:
- 🚀 Fresh deployment: SQL files auto-run (fast, no backend needed)
- 🔄 Schema updates: Backend migration runner handles versioned migrations

---

## 🛠️ Quick Implementation Guide (Option 2)

### 1. Create init script (5 minutes)

```bash
# Copy script from documentation above
nano scripts/init-db.sh
chmod +x scripts/init-db.sh
```

### 2. Update docker-compose.yml (2 minutes)

```bash
# Add migration-runner service
nano docker-compose.yml
```

### 3. Test it

```bash
# Stop and remove everything
docker-compose down -v

# Start with auto-migration
docker-compose up -d

# Check logs
docker logs laundry_migration_runner
```

**Expected output:**
```
🔧 Waiting for MySQL to be ready...
✅ MySQL is ready!
🔄 Running database migrations...
📝 Running migrations: 001_init.sql 004_combined_code_migration.sql
▶️  Running 001_init.sql...
✅ 001_init.sql completed
▶️  Running 004_combined_code_migration.sql...
✅ 004_combined_code_migration.sql completed
🌱 Running seed data...
🎉 Database initialization complete!
```

### 4. Verify

```bash
# Check database
docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES;"

# Should show: 8 tables
```

---

## 📝 Next Steps

Kamu sekarang punya 3 options:

1. **Quick Fix:** Perbaiki backend migration runner (5 min)
2. **Robust Solution:** Implement init container (15 min)
3. **Simple Solution:** Gunakan docker-entrypoint (5 min, but only works on fresh setup)

**Pilihan saya:** Option 2 (Init Container) karena:
- Paling reliable untuk development
- Scalable untuk production
- Debuggable

Tapi kalau mau quick win, mulai dengan Option 1 dulu.

---

## 🤔 Questions to Consider

Sebelum implement, jawab dulu:

1. **Environment kamu apa?**
   - Development laptop → Option 2 recommended
   - Production server → Option 1 + Option 3 combo

2. **Sering docker restart?**
   - Ya → Option 2 (auto-rerun every time)
   - Tidak → Option 3 cukup

3. **Comfort level dengan Docker?**
   - Beginner → Option 1 (simplest)
   - Intermediate → Option 2 (most flexible)

---

*Documentation created: 2026-07-31*
*Author: Claude (AI Research Assistant)*
*For: Washpos Project - Auto-Migration Solution*
