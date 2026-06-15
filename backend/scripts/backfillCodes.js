/**
 * Backfill `code` column untuk existing rows (FASE 1).
 *
 * Jalankan SETELAH migration 002_add_code_column.sql.
 * Idempoten: hanya update row dengan code IS NULL.
 *
 * Strategy:
 *   - services  → sekuensial SVC-01..NN  (ordered by id ASC)
 *   - users     → USR-XXXXXX (random Base32)
 *   - customers → CUS-XXXXXX (random)
 *   - orders    → ORD-YYMMDD-XXXXXX (random, pakai created_at order)
 *   - payments  → PAY-YYMMDD-XXXXXX (random, pakai created_at payment)
 *
 * Usage:
 *   node scripts/backfillCodes.js
 */

require('dotenv').config();
const pool = require('../src/config/database');
const { generateCode } = require('../src/utils/codeGenerator');

const MAX_RETRY = 5;

/**
 * Backfill tabel dengan code random. Retry on ER_DUP_ENTRY.
 * @param {string} table
 * @param {string} prefix
 * @param {object} genOpts - opsi generateCode (mis. { withDate:true })
 * @param {function} [rowToDate] - map row → Date (utk withDate dari created_at)
 */
async function backfillRandom(table, prefix, genOpts, rowToDate) {
  const [rows] = await pool.query(
    `SELECT id, created_at FROM \`${table}\` WHERE code IS NULL ORDER BY id ASC`
  );
  if (rows.length === 0) {
    console.log(`  ${table}: 0 row perlu di-backfill (skip)`);
    return 0;
  }
  console.log(`  ${table}: ${rows.length} row perlu di-backfill`);
  let updated = 0;
  for (const row of rows) {
    let success = false;
    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const opts = { ...genOpts };
      if (opts.withDate && rowToDate) {
        opts.date = rowToDate(row);
      }
      const code = generateCode(prefix, opts);
      try {
        const [res] = await pool.query(
          `UPDATE \`${table}\` SET code = ? WHERE id = ? AND code IS NULL`,
          [code, row.id]
        );
        if (res.affectedRows > 0) {
          updated++;
          success = true;
          break;
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') continue; // coba lagi dengan code baru
        throw err;
      }
    }
    if (!success) {
      throw new Error(`backfill ${table} id=${row.id}: gagal setelah ${MAX_RETRY} percobaan`);
    }
  }
  return updated;
}

/**
 * Backfill services dengan sekuensial SVC-NN.
 * Mulai dari nomor terkecil yang belum dipakai.
 */
async function backfillServices() {
  const [rows] = await pool.query(
    'SELECT id FROM services WHERE code IS NULL ORDER BY id ASC'
  );
  if (rows.length === 0) {
    console.log('  services: 0 row perlu di-backfill (skip)');
    return 0;
  }

  // Cari nomor sekuensial yang sudah dipakai (utk idempotensi re-run).
  const [used] = await pool.query(
    "SELECT code FROM services WHERE code REGEXP '^SVC-[0-9]{2}$'"
  );
  const usedNums = new Set(
    used.map(r => parseInt(r.code.split('-')[1], 10))
  );
  const nextAvailable = (start) => {
    let n = start;
    while (usedNums.has(n)) n++;
    return n;
  };

  console.log(`  services: ${rows.length} row perlu di-backfill`);
  let updated = 0;
  for (const row of rows) {
    let seq = nextAvailable(updated + 1);
    let success = false;
    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const code = generateCode('SVC', { sequential: true, seqValue: seq });
      try {
        const [res] = await pool.query(
          'UPDATE services SET code = ? WHERE id = ? AND code IS NULL',
          [code, row.id]
        );
        if (res.affectedRows > 0) {
          usedNums.add(seq);
          updated++;
          success = true;
          break;
        }
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          seq = nextAvailable(seq + 1);
          continue;
        }
        throw err;
      }
    }
    if (!success) {
      throw new Error(`backfill services id=${row.id}: gagal setelah ${MAX_RETRY} percobaan`);
    }
  }
  return updated;
}

async function verifyAllFilled() {
  const tables = ['users', 'customers', 'services', 'orders', 'payments'];
  const problems = [];
  for (const t of tables) {
    const [r] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN code IS NULL THEN 1 ELSE 0 END) AS null_count
       FROM \`${t}\``
    );
    const total = Number(r[0].total);
    const nulls = Number(r[0].null_count);
    console.log(`  ${t}: ${total - nulls}/${total} row punya code`);
    if (nulls > 0) problems.push(`${t} masih ada ${nulls} NULL`);
  }
  return problems;
}

async function main() {
  console.log('🔁 Backfill codes — dimulai...\n');

  // Ensure migration 002 telah berjalan (cek kolom code ada di users).
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'code'
  `);
  if (cols.length === 0) {
    console.error('❌ Kolom `code` belum ada di tabel users. Jalankan 002_add_code_column.sql dulu.');
    process.exit(1);
  }

  console.log('Backfilling services (sequential)...');
  const svc = await backfillServices();
  console.log(`  ✓ ${svc} service di-backfill\n`);

  console.log('Backfilling users (USR-XXXXXX)...');
  const usr = await backfillRandom('users', 'USR');
  console.log(`  ✓ ${usr} user di-backfill\n`);

  console.log('Backfilling customers (CUS-XXXXXX)...');
  const cus = await backfillRandom('customers', 'CUS');
  console.log(`  ✓ ${cus} customer di-backfill\n`);

  console.log('Backfilling orders (ORD-YYMMDD-XXXXXX)...');
  const ord = await backfillRandom('orders', 'ORD', { withDate: true }, (row) => new Date(row.created_at));
  console.log(`  ✓ ${ord} order di-backfill\n`);

  console.log('Backfilling payments (PAY-YYMMDD-XXXXXX)...');
  const pay = await backfillRandom('payments', 'PAY', { withDate: true }, (row) => new Date(row.created_at));
  console.log(`  ✓ ${pay} payment di-backfill\n`);

  console.log('Verifikasi semua row terisi...');
  const problems = await verifyAllFilled();

  if (problems.length > 0) {
    console.error('\n❌ Backfill TIDAK lengkap:');
    problems.forEach(p => console.error('   - ' + p));
    process.exit(1);
  }

  console.log('\n✅ Backfill lengkap. Semua row di 5 tabel punya code.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Backfill gagal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
