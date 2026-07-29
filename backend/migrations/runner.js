/**
 * Migration Runner - Umzug Configuration
 *
 * Migration system untuk menjalankan database migrations secara otomatis
 * Menggunakan Umzug sebagai migration engine
 */

const { Umzug } = require('umzug');
const path = require('path');
const fs = require('fs');

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
 * Custom storage adapter untuk MySQL
 * Menggunakan pool connection yang sudah ada (promise-based)
 */
class MySQLStorage {
  constructor({ pool, tableName }) {
    this.pool = pool;
    this.tableName = tableName;
  }

  async logMigration({ name }) {
    try {
      await this.pool.query(
        `INSERT INTO ${this.tableName} (name) VALUES (?)`,
        [name]
      );
    } catch (error) {
      console.error(`❌ Failed to log migration ${name}:`, error.message);
      throw error;
    }
  }

  async unlogMigration({ name }) {
    try {
      await this.pool.query(
        `DELETE FROM ${this.tableName} WHERE name = ?`,
        [name]
      );
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
          const sql = fs.readFileSync(path, 'utf8');

          // Split SQL by semicolon, but respect quotes and parentheses
          // This handles ENUM('value1', 'value2') and other complex syntax
          const statements = [];
          let currentStatement = '';
          let inQuotes = false;
          let inParentheses = false;
          let quoteChar = '';

          for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const prevChar = i > 0 ? sql[i - 1] : '';

            // Track quotes
            if ((char === '\'' || char === '"' || char === '`') && prevChar !== '\\') {
              if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
              }
            }

            // Track parentheses (when not in quotes)
            if (!inQuotes) {
              if (char === '(') {
                inParentheses = true;
              } else if (char === ')') {
                inParentheses = false;
              }
            }

            // Split by semicolon only when not in quotes or deep parentheses
            if (char === ';' && !inQuotes && !inParentheses) {
              const statement = currentStatement.trim();
              if (statement.length > 0 && !statement.startsWith('--')) {
                statements.push(statement);
              }
              currentStatement = '';
            } else {
              currentStatement += char;
            }
          }

          // Add the last statement
          const lastStatement = currentStatement.trim();
          if (lastStatement.length > 0 && !lastStatement.startsWith('--')) {
            statements.push(lastStatement);
          }

          console.log(`   Processing ${statements.length} statements from ${name}...`);

          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
              if (statement.length > 0) {
                console.log(`   Executing statement ${i + 1}/${statements.length}...`);
                await context.query(statement);
              }
            } catch (error) {
              console.error(`❌ Error executing statement ${i + 1}/${statements.length} in ${name}:`);
              console.error(`Statement:`, statement.substring(0, 200));
              console.error(`Error:`, error.message);
              throw error;
            }
          }

          console.log(`✅ ${name} completed successfully`);
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

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
 */
async function runOnStartup() {
  try {
    await ensureMigrationTable();
    await runMigrations();

    const status = await getMigrationStatus();
    console.log(`📊 Migration Status: ${status.executed.length}/${status.total} executed`);
  } catch (error) {
    console.error('❌ Startup migration failed:', error.message);
    console.error('⚠️  Server will continue, but some features may not work correctly.');
    // Don't throw - allow server to start even if migrations fail
    // But log the error for debugging
  }
}

/**
 * Health check: verify critical migrations have been applied
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
      throw new Error(`Critical migrations not applied: ${missing.join(', ')}`);
    }

    return { healthy: true, status };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

module.exports = {
  umzug,
  runMigrations,
  runOnStartup,
  getMigrationStatus,
  healthCheck,
  ensureMigrationTable
};
