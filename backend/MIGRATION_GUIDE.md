# Migration Guide - Washpos Backend

**Created**: 2026-07-28  
**Status**: Active  
**Migration System**: Umzug with MySQL2

---

## 📋 Overview

Sistem migration Washpos menggunakan **Umzug** sebagai migration engine dengan **MySQL2** sebagai database driver. Migration system ini menjalankan database schema changes secara otomatis saat server startup dan menyediakan command-line tools untuk manual migration management.

### 🎯 Key Features

- ✅ **Automatic migration on server startup** - No manual intervention needed
- ✅ **Migration status tracking** - `migrations` table tracks applied migrations
- ✅ **Health check system** - Verifies critical migrations on startup
- ✅ **SQL file support** - Native .sql migration files with automatic execution
- ✅ **Idempotent migrations** - Safe to run multiple times
- ✅ **Rollback capability** - Manual rollback support (when implemented)

---

## 🚀 Quick Start

### 1. Fresh Installation (Recommended for Development)

```bash
# 1. Start Docker MySQL
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Start server (migrations run automatically)
npm run dev

# Server will:
# - Create migrations table
# - Run all pending migrations
# - Perform health check
# - Start listening on port 5000
```

### 2. Manual Migration (If Needed)

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Verify migration health
npm run migrate:health
```

---

## 📁 Migration File Structure

```
backend/
├── migrations/
│   ├── runner.js                           # Umzug configuration & execution
│   ├── migration_runner_analysis.md        # Library selection analysis
│   ├── 001_init.sql                        # Initial schema (7 tables)
│   ├── 002_add_code_column.sql            # Legacy migration (deprecated)
│   ├── 003_code_not_null.sql              # Legacy migration (deprecated)
│   ├── 004_combined_code_migration.sql    # NEW: Combined migration
│   └── [future migrations].sql            # Add new migrations here
└── server.js                               # Auto-runs migrations on startup
```

### Migration File Naming Convention

- Format: `NNN_description.sql`
- NNN: Sequential number (001, 002, 003, etc.)
- description: Snake_case description
- Extension: `.sql` for SQL migrations, `.js` for programmatic migrations

---

## 🔧 Available Commands

### npm run migrate

Run all pending migrations:

```bash
npm run migrate
```

**Output Example**:
```
🔍 Checking for pending migrations...
📦 Found 1 pending migrations:
   - 004_combined_code_migration.sql
🚀 Running migrations...
✅ All migrations completed successfully!
📊 Migration Status: 4/4 executed
```

### npm run migrate:status

Check migration status:

```bash
npm run migrate:status
```

**Output Example**:
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

### npm run migrate:health

Verify critical migrations:

```bash
npm run migrate:health
```

**Output Example**:
```json
{
  "healthy": true,
  "status": {
    "executed": ["001_init.sql", "004_combined_code_migration.sql"],
    "pending": [],
    "total": 4
  }
}
```

---

## 🏥 Health Check System

The health check verifies that **critical migrations** have been applied:

### Critical Migrations Required

1. `001_init.sql` - Core database schema
2. `002_add_code_column.sql` - Code columns for entity tables  
3. `003_code_not_null.sql` - Code constraints (NOT NULL)
4. `004_combined_code_migration.sql` - Combined migration with backfill

### Health Check Behavior

**On Server Startup**:
- ✅ Healthy → Server continues normally
- ❌ Unhealthy → Warning logged, server continues (graceful degradation)

**Manual Check**:
```bash
npm run migrate:health
```

---

## 🔄 Migration Execution Flow

### Server Startup Flow

```
1. server.js starts
   ↓
2. Import migration runner
   ↓
3. Ensure migrations table exists
   ↓
4. Check for pending migrations
   ↓
5. Execute pending migrations (if any)
   ↓
6. Run health check
   ↓
7. Log migration status
   ↓
8. Start server listening
```

### Migration File Execution

For each `.sql` migration file:

```
1. Read SQL file contents
   ↓
2. Split by semicolon (;)
   ↓
3. Filter out comments and empty statements
   ↓
4. Execute each statement sequentially
   ↓
5. Commit to database
   ↓
6. Log migration name to migrations table
   ↓
7. Continue to next migration
```

---

## 📝 Creating New Migrations

### Step 1: Create Migration File

```bash
# Create new SQL migration file
touch migrations/005_add_feature_table.sql
```

### Step 2: Write Migration SQL

```sql
-- Migration 005: Add Feature Table
-- Description: Add new feature table for XYZ functionality

-- Create table
CREATE TABLE IF NOT EXISTS features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes
CREATE INDEX idx_features_name ON features(name);

-- Log completion
SELECT 'Migration 005 completed successfully' AS status;
```

### Step 3: Deploy & Test

```bash
# Option 1: Automatic (on next server start)
npm run dev

# Option 2: Manual
npm run migrate

# Verify
npm run migrate:status
```

---

## 🛠️ Troubleshooting

### Issue: "Migration failed - column already exists"

**Cause**: Migration partially applied or duplicate migration

**Solution**:
```bash
# Check current status
npm run migrate:status

# If migration shows as pending but column exists:
# Manually mark migration as complete
mysql -u root -proot laundry_db -e "INSERT INTO migrations (name) VALUES ('005_add_feature_table.sql')"

# Re-run status check
npm run migrate:status
```

### Issue: "Health check failed - critical migrations missing"

**Cause**: Database schema outdated

**Solution**:
```bash
# Run all pending migrations
npm run migrate

# Verify health
npm run migrate:health
```

### Issue: "MySQL connection lost during migration"

**Cause**: Network issue or MySQL restart

**Solution**:
```bash
# Restart MySQL
docker-compose restart mysql

# Re-run migrations
npm run migrate
```

---

## 🔄 Rollback Strategy

**Current Implementation**: Manual rollback required

### Rollback Procedure

```bash
# 1. Identify migration to rollback
npm run migrate:status

# 2. Create rollback migration (e.g., 006_rollback_005.sql)
cat > migrations/006_rollback_005.sql << 'EOF'
-- Rollback migration 005

DROP TABLE IF EXISTS features;

SELECT 'Migration 005 rolled back successfully' AS status;
EOF

# 3. Run rollback migration
npm run migrate

# 4. Verify
npm run migrate:status
```

---

## 📊 Migration Best Practices

### ✅ DO's

1. **Always test migrations** on development database first
2. **Use descriptive names** for migration files
3. **Write idempotent SQL** - safe to run multiple times
4. **Add comments** explaining complex migrations
5. **Include verification queries** at the end of migrations
6. **Backup database** before running major migrations

### ❌ DON'Ts

1. **Don't modify existing migration files** - Create new ones instead
2. **Don't skip testing** - Always verify schema changes
3. **Don't use data loss operations** without careful consideration
4. **Don't ignore migration errors** - Always investigate failures
5. **Don't run migrations on production** without testing

---

## 🔒 Security Considerations

### Migration File Permissions

```bash
# Ensure migration files are readable by application
chmod 644 migrations/*.sql

# Ensure migration runner is executable
chmod 644 migrations/runner.js
```

### Database Credentials

- ✅ Use environment variables (`.env` file)
- ✅ Never commit credentials to version control
- ✅ Use least-privilege database user for migrations

---

## 📈 Migration Performance

### Large Migration Optimization

```sql
-- For large data migrations, batch operations
INSERT INTO large_table (column1, column2)
SELECT value1, value2 FROM source_table
LIMIT 1000;

-- Process in batches via application code
```

### Index Creation

```sql
-- Create indexes after data population (faster)
ALTER TABLE large_table ADD INDEX idx_column (column);
```

---

## 🧪 Testing Migrations

### Development Testing

```bash
# Fresh database test
docker-compose down -v
docker-compose up -d
npm run dev

# Verify migrations ran
npm run migrate:status
npm run migrate:health
```

### Migration Script Testing

```bash
# Test migration file manually
mysql -u root -proot laundry_db < migrations/005_new_feature.sql

# Verify schema
mysql -u root -proot laundry_db -e "DESCRIBE new_table;"
```

---

## 📚 Additional Resources

### Documentation

- Umzug Documentation: https://github.com/sequelize/umzug
- MySQL2 Documentation: https://github.com/sidorares/node-mysql2
- Docker MySQL: https://hub.docker.com/_/mysql

### Related Files

- `migrations/runner.js` - Migration execution logic
- `migrations/migration_runner_analysis.md` - Library selection analysis
- `server.js` - Migration integration
- `TODO_PERBAIKAN.md` - P0-1 fix progress

---

## 🎯 Summary

The Washpos migration system provides:

- ✅ **Automatic migrations** on server startup
- ✅ **Manual migration tools** via npm scripts
- ✅ **Health check system** for verification
- ✅ **Idempotent SQL files** for safety
- ✅ **Status tracking** via migrations table

**Next Steps**: Continue with P0-2 (Employee Isolation Fix) while Docker is being set up for P0-1 testing.

---

**Last Updated**: 2026-07-28  
**Status**: Production Ready  
**Version**: 1.0.0
