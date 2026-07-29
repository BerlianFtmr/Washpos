# Migration Runner Analysis - P0-1

## Task 1.1: Research Migration Library

### Options Comparison

#### Option 1: node-mysql-migrate
**Pros**:
- ✅ Specifically designed for MySQL
- ✅ Simple CLI interface
- ✅ SQL file support (.sql migration files)
- ✅ Built-in migration table tracking
- ✅ Rollback support

**Cons**:
- ❌ Less popular/maintained (last update 2+ years ago)
- ❌ Smaller community

**Install**: `npm install node-mysql-migrate`

#### Option 2: db-migrate
**Pros**:
- ✅ Database agnostic (supports MySQL, PostgreSQL, etc.)
- ✅ Active maintenance
- ✅ Good CLI interface
- ✅ Support for .sql and .js migrations
- ✅ Built-in migration table

**Cons**:
- ❌ More complex configuration
- ❌ Heavier dependency

**Install**: `npm install db-migrate`

#### Option 3: Umzug (with MySQL2)
**Pros**:
- ✅ Framework agnostic
- ✅ Very popular & well-maintained
- ✅ TypeScript support
- ✅ Flexible (supports .js, .ts, .sql migrations)
- ✅ Already using mysql2 (no new DB driver needed)

**Cons**:
- ❌ No built-in CLI (need to create wrapper)
- ❌ More manual setup

**Install**: `npm install umzug`

#### Option 4: Knex.js (migrate only)
**Pros**:
- ✅ Very popular & mature
- ✅ Excellent migration system
- ✅ Good CLI
- ✅ Built-in migration table
- ✅ Active development

**Cons**:
- ❌ Query builder (might not use it)
- ❌ Heavier dependency if only using migrations

**Install**: `npm install knex`

### 🎯 Recommendation: **Umzug**

**Rationale**:
1. **Lightweight**: Only need migration functionality
2. **Already using mysql2**: No additional DB driver
3. **TypeScript support**: Good for future proofing
4. **Framework agnostic**: Simple integration with Express
5. **SQL file support**: Can keep existing .sql migration files
6. **No CLI needed**: We'll run migrations programmatically on server start

### Implementation Plan with Umzug

**Install**:
```bash
npm install --save umzug
npm install --save-dev @types/umzug
```

**Structure**:
```
backend/
├── migrations/
│   ├── 001_init.sql                    # Existing
│   ├── 002_add_code_column.sql          # Existing
│   ├── 003_code_not_null.sql           # Existing
│   ├── 004_combined_migration.js       # NEW (backfill + not_null)
│   └── migration_runner.js             # NEW (umzug config)
```

**Migration Execution**:
- Run on server start (if not applied)
- Check migration status via `migrations` table
- Support rollback if needed
- Log migration status

---

## Selected: **Umzug** migration library
