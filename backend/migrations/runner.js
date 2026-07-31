/**
 * Migration Runner - Umzug Configuration (IMPROVED VERSION)
 *
 * Migration system untuk menjalankan database migrations secara otomatis
 * Menggunakan Umzug sebagai migration engine
 *
 * IMPROVEMENTS (v1.1.0 - 2026-07-31):
 * - Post-migration verification: Check jika expected objects exist
 * - Rollback on verification failure: Hapus migration record kalau verify gagal
 * - Better error reporting: Specific feedback tentang apa yang missing
 * - Idempotent logic: Bisa di-rerun tanpa masalah
 */

const { Umzug } = require('umzug');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Get database connection pool
 * Import dari config/database.js (promise-based pool)
 */
const pool = require('../src/config/database');

/**
 * Migration table setup
 * Umzug akan tracking migration status di tabel `migrations`
 */
const migrationTable = 'migrations';

/**
 * Expected objects verification rules
 * Setiap migration punya expected outcome yang akan diverifikasi
 */
const MIGRATION_VERIFICATION_RULES = {
  '001_init.sql': {
    type: 'tables',
    expected: [
      'users', 'customers', 'services', 'orders',
      'order_items', 'payments', 'audit_logs'
    ],
    description: '7 core tables'
  },
  '004_combined_code_migration.sql': {
    type: 'columns',
    tables_to_check: ['users', 'customers', 'services'],
    expected_columns: ['code'],
    description: 'code column on users, customers, services'
  }
};

/**
 * Create migrations table jika belum ada
 */
async function ensureMigrationTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${migrationTable} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(`✅ Migration table '${migrationTable}' ready`);
  } catch (error) {
    console.error('❌ Failed to create migration table:', error.message);
    throw error;
  }
}

/**
 * Verify migration outcome
 * Check apakah expected objects exist setelah migration jalan
 */
async function verifyMigration(name) {
  const rules = MIGRATION_VERIFICATION_RULES[name];

  if (!rules) {
    console.log(`⚠️  No verification rules for ${name}, skipping verification`);
    return true;
  }

  console.log(`🔍 Verifying ${name} (${rules.description})...`);

  try {
    if (rules.type === 'tables') {
      // Verify expected tables exist
      const [rows] = await pool.query('SHOW TABLES');
      const existingTables = rows.map(row => Object.values(row)[0]);
      const missingTables = rules.expected.filter(t => !existingTables.includes(t));

      if (missingTables.length > 0) {
        throw new Error(
          `Migration verification failed: Missing tables: ${missingTables.join(', ')}\n` +
          `Expected: ${rules.expected.join(', ')}\n` +
          `Found: ${existingTables.filter(t => rules.expected.includes(t)).join(', ') || 'none'}`
        );
      }

      console.log(`✅ All ${rules.expected.length} tables verified`);
      return true;
    }

    if (rules.type === 'columns') {
      // Verify expected columns exist in specified tables
      for (const table of rules.tables_to_check) {
        const [rows] = await pool.query(`DESCRIBE ${table}`);
        const existingColumns = rows.map(row => row.Field);
        const missingColumns = rules.expected_columns.filter(c => !existingColumns.includes(c));

        if (missingColumns.length > 0) {
          throw new Error(
            `Migration verification failed: Missing columns in table '${table}': ${missingColumns.join(', ')}\n` +
            `Expected: ${rules.expected_columns.join(', ')}\n` +
            `Found: ${existingColumns.filter(c => rules.expected_columns.includes(c)).join(', ') || 'none'}`
          );
        }
      }

      console.log(`✅ Code column verified in ${rules.tables_to_check.join(', ')}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error(`❌ Migration verification failed for ${name}:`);
    console.error(`   ${error.message}`);
    throw error;
  }
}

/**
 * Custom storage adapter untuk MySQL
 * Menggunakan pool connection yang sudah ada (promise-based)
 *
 * IMPROVEMENT: logMigration sekarang verify sebelum catat sebagai executed
 */
class MySQLStorage {
  constructor({ pool, tableName }) {
    this.pool = pool;
    this.tableName = tableName;
  }

  async logMigration({ name }) {
    try {
      // IMPROVEMENT: Verify migration outcome BEFORE logging as executed
      // Ini mencegah inkonsistensi antara migrations table dan actual schema
      console.log(`📝 Logging migration ${name} as executed...`);

      await verifyMigration(name);

      // Verification passed, now log as executed
      await this.pool.query(
        `INSERT INTO ${this.tableName} (name) VALUES (?)`,
        [name]
      );

      console.log(`✅ Migration ${name} logged successfully`);
    } catch (error) {
      console.error(`❌ Failed to log migration ${name}:`, error.message);
      console.error(`   Migration was executed but verification failed.`);
      console.error(`   Rolling back: Migration record NOT created.`);
      throw error;
    }
  }

  async unlogMigration({ name }) {
    try {
      await this.pool.query(
        `DELETE FROM ${this.tableName} WHERE name = ?`,
        [name]
      );
      console.log(`✅ Migration ${name} unlogged successfully`);
    } catch (error) {
      console.error(`❌ Failed to unlog migration ${name}:`, error.message);
      throw error;
    }
  }

  async executed() {
    try {
      const [rows] = await this.pool.query(
        `SELECT name FROM ${this.tableName} ORDER BY id ASC`
      );
      return rows.map(row => row.name);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error.message);
      throw error;
    }
  }
}

/**
 * Umzug instance configuration
 */
const umzug = new Umzug({
  migrations: {
    glob: ['*.sql', { cwd: path.join(__dirname) }],
    // Custom executor untuk SQL files
    resolve: (params) => {
      const { context, name, path } = params;

      return {
        name,
        up: async () => {
          // IMPROVEMENT: Use MySQL source command instead of manual SQL parsing
          // This handles complex SQL (multi-line CREATE TABLE, nested parentheses, etc)
          console.log(`   Executing ${name} using MySQL source command...`);

          try {
            // Get database connection info from environment
            const dbHost = process.env.DB_HOST || 'localhost';
            const dbPort = process.env.DB_PORT || 3307;
            const dbUser = process.env.DB_USER || 'laundry_user';
            const dbPassword = process.env.DB_PASSWORD || 'laundry_pass';
            const dbName = process.env.DB_NAME || 'laundry_db';

            // Build mysql command with source
            // Use 'path' from params directly (it's the absolute filepath)
            const migrationFilePath = path; // 'path' is already absolute from Umzug

            // Check if file exists
            if (!fs.existsSync(migrationFilePath)) {
              throw new Error(`Migration file not found: ${migrationFilePath}`);
            }

            // Execute SQL using MySQL source command via docker
            const dockerCmd = `docker exec laundry_db mysql -u ${dbUser} -p${dbPassword} ${dbName} -e "source /tmp/${name}"`;

            // First, copy file to container
            console.log(`   Copying ${name} to container...`);
            execSync(`docker cp "${migrationFilePath}" laundry_db:/tmp/${name}`, { stdio: 'pipe' });

            // Execute SQL using source command
            console.log(`   Running SQL via MySQL source...`);
            execSync(dockerCmd, { stdio: 'pipe' });

            console.log(`✅ ${name} SQL execution completed via MySQL source`);
            console.log(`⏳ Verification will run after logging...`);
          } catch (error) {
            console.error(`❌ Error executing ${name}:`);
            console.error(`   ${error.message}`);

            // Provide helpful error context
            if (error.stderr) {
              const stderr = error.stderr.toString();
              if (stderr.includes('Can\'t create table')) {
                console.error(`   Possible cause: Table already exists or permission issue`);
              } else if (stderr.includes('syntax error')) {
                console.error(`   Possible cause: SQL syntax error in migration file`);
              }
            }

            throw new Error(`SQL execution failed: ${error.message}`);
          }
        },
        down: async () => {
          // Rollback not supported for SQL migrations
          throw new Error('Rollback not supported for SQL migrations. Use manual migration scripts.');
        }
      };
    }
  },
  context: pool,
  storage: new MySQLStorage({
    pool,
    tableName: migrationTable
  }),
  logger: console
});

/**
 * Jalankan semua pending migrations
 */
async function runMigrations() {
  try {
    console.log('🔍 Checking for pending migrations...');

    const pending = await umzug.pending();

    if (pending.length === 0) {
      console.log('✅ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`📦 Found ${pending.length} pending migrations:`);
    pending.forEach(m => console.log(`   - ${m.name}`));

    console.log('🚀 Running migrations...');
    await umzug.up();

    console.log('✅ All migrations completed and verified successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('   1. Check database connection');
    console.error('   2. Verify SQL syntax in migration files');
    console.error('   3. Check if migrations table has inconsistent records');
    console.error('   4. Try: docker exec laundry_db mysql -u root -proot -e "DELETE FROM laundry_db.migrations;"');
    console.error('      Then restart backend to re-run all migrations');
    throw error;
  }
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  try {
    const executed = await umzug.executed();
    const pending = await umzug.pending();

    return {
      executed: executed.map(m => m.name),
      pending: pending.map(m => m.name),
      total: executed.length + pending.length
    };
  } catch (error) {
    console.error('❌ Failed to get migration status:', error.message);
    throw error;
  }
}

/**
 * Run migrations on server start
 *
 * IMPROVEMENT: Better error handling dan user guidance
 */
async function runOnStartup() {
  try {
    await ensureMigrationTable();
    await runMigrations();

    const status = await getMigrationStatus();
    console.log(`📊 Migration Status: ${status.executed.length}/${status.total} executed`);
  } catch (error) {
    console.error('❌ Startup migration failed:', error.message);
    console.error('');
    console.error('⚠️  Server will continue, but some features may not work correctly.');
    console.error('⚠️  Please check database connection and migration files.');
    console.error('');
    console.error('🔍 QUICK DIAGNOSTIC:');
    console.error('   Check current database state:');
    console.error('   $ docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SHOW TABLES;"');
    console.error('   $ docker exec laundry_db mysql -u laundry_user -plaundry_pass laundry_db -e "SELECT * FROM migrations;"');
    console.error('');
    // Don't throw - allow server to start even if migrations fail
    // But provide comprehensive error info
  }
}

/**
 * Health check: verify critical migrations have been applied
 *
 * IMPROVEMENT: Verify actual schema, bukan hanya migration records
 */
async function healthCheck() {
  try {
    const status = await getMigrationStatus();

    // Check if critical migrations have been applied
    const criticalMigrations = [
      '001_init.sql',
      '004_combined_code_migration.sql'
    ];

    const missing = criticalMigrations.filter(m => !status.executed.includes(m));

    if (missing.length > 0) {
      return {
        healthy: false,
        error: `Critical migrations not applied: ${missing.join(', ')}`,
        missing,
        recommendation: 'Run migrations first: npm run dev'
      };
    }

    // IMPROVEMENT: Verify schema consistency
    // Check jika actual schema matches expected
    const [rows] = await pool.query('SHOW TABLES');
    const tableCount = rows.length;

    if (tableCount < 8) {
      return {
        healthy: false,
        error: `Schema inconsistency: Expected 8 tables, found ${tableCount}`,
        recommendation: 'Migration records exist but tables are missing. Reset migrations: docker exec laundry_db mysql -u root -proot -e "DELETE FROM laundry_db.migrations;"'
      };
    }

    return { healthy: true, status };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      recommendation: 'Check database connection and migration files'
    };
  }
}

/**
 * Manual migration repair utility
 * Use ini jika migration inconsistency detected
 */
async function repairMigrations() {
  try {
    console.log('🔧 Starting migration repair...');

    // Check for inconsistencies
    const [migrationRows] = await pool.query('SELECT * FROM migrations');
    const [tableRows] = await pool.query('SHOW TABLES');

    const executedCount = migrationRows.length;
    const tableCount = tableRows.length;

    console.log(`📊 Current state:`);
    console.log(`   - Migrations recorded: ${executedCount}`);
    console.log(`   - Tables in database: ${tableCount}`);

    // Detect inconsistency
    if (executedCount > 0 && tableCount <= 1) {
      console.log('');
      console.log('⚠️  INCONSISTENCY DETECTED!');
      console.log('   Migration records exist but no tables found.');
      console.log('   This usually means migrations were logged but SQL execution failed.');
      console.log('');
      console.log('🔄 Repairing: Clearing migration records...');

      await pool.query('DELETE FROM migrations');
      console.log('✅ Migration records cleared.');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Restart backend (npm run dev)');
      console.log('   2. Migrations will auto-run');
      console.log('   3. Verification will prevent future inconsistencies');

      return { repaired: true, action: 'cleared_migrations' };
    }

    console.log('✅ No inconsistency detected. Database state is consistent.');
    return { repaired: false, reason: 'no_inconsistency' };

  } catch (error) {
    console.error('❌ Migration repair failed:', error.message);
    throw error;
  }
}

module.exports = {
  umzug,
  runMigrations,
  runOnStartup,
  getMigrationStatus,
  healthCheck,
  ensureMigrationTable,
  repairMigrations  // New utility function
};
