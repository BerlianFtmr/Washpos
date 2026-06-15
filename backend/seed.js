/**
 * Seed Data for Laundry Management System
 * Author: TIM 03 - Rekayasa Web
 */

require('dotenv').config();
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { generateCode } = require('./src/utils/codeGenerator');

async function seed() {
  try {
    console.log('🌱 Starting seed...');

    // 1. Check if admin exists
    const [adminExists] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (adminExists.length === 0) {
      // Hash passwords
      const adminPassword = await bcrypt.hash('password123', 10);
      const pegawaiPassword = await bcrypt.hash('password123', 10);

      // Generate business codes (hybrid ID strategy, fase 1)
      const adminCode = generateCode('USR');
      const pegawaiCode = generateCode('USR');

      // Insert users
      await pool.query(`
        INSERT INTO users (username, password, role, code) VALUES
        ('admin', ?, 'admin', ?),
        ('pegawai1', ?, 'pegawai', ?)
      `, [adminPassword, adminCode, pegawaiPassword, pegawaiCode]);

      console.log('✅ Seeded 2 users (admin, pegawai1)');
      console.log('   Credentials: username=admin/pegawai1, password=password123');
      console.log(`   Codes: admin=${adminCode}, pegawai1=${pegawaiCode}`);
    } else {
      console.log('ℹ️  Users already exist, skipping...');
    }

    // 2. Check if services exist
    const [servicesExist] = await pool.query('SELECT COUNT(*) as count FROM services');

    if (servicesExist[0].count === 0) {
      await pool.query(`
        INSERT INTO services (name, price, unit, active, code) VALUES
        ('Cuci Kiloan', 5000.00, 'kg', TRUE, 'SVC-01'),
        ('Cuci Kiloan Express', 7000.00, 'kg', TRUE, 'SVC-02'),
        ('Setrika Kiloan', 4000.00, 'kg', TRUE, 'SVC-03'),
        ('Setrika Satuan', 2000.00, 'piece', TRUE, 'SVC-04'),
        ('Cuci + Setrika Kiloan', 8000.00, 'kg', TRUE, 'SVC-05'),
        ('Cuci + Setrika Satuan', 5000.00, 'piece', TRUE, 'SVC-06'),
        ('Cuci Bedcover', 25000.00, 'piece', TRUE, 'SVC-07'),
        ('Cuci Boneka', 18000.00, 'piece', TRUE, 'SVC-08'),
        ('Cuci Sepatu', 35000.00, 'pair', TRUE, 'SVC-09'),
        ('Cuci Tas', 40000.00, 'piece', TRUE, 'SVC-10')
      `);

      console.log('✅ Seeded 10 services (SVC-01..SVC-10)');
    } else {
      console.log('ℹ️  Services already exist, skipping...');
    }

    // 3. Sample customers
    const [customersExist] = await pool.query('SELECT COUNT(*) as count FROM customers');

    if (customersExist[0].count === 0) {
      const cus1 = generateCode('CUS');
      const cus2 = generateCode('CUS');
      const cus3 = generateCode('CUS');
      await pool.query(`
        INSERT INTO customers (name, whatsapp, address, code) VALUES
        ('Ahmad', '628123456789', 'Jl. Contoh No. 123, Yogyakarta', ?),
        ('Budi Santoso', '628987654321', 'Jl. Test No. 456, Sleman', ?),
        ('Siti Aminah', '628567890123', 'Jl. Demo No. 789, Bantul', ?)
      `, [cus1, cus2, cus3]);

      console.log('✅ Seeded 3 sample customers');
      console.log(`   Codes: ${cus1}, ${cus2}, ${cus3}`);
    } else {
      console.log('ℹ️  Customers already exist, skipping...');
    }

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
