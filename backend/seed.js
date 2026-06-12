/**
 * Seed Data for Laundry Management System
 * Author: TIM 03 - Rekayasa Web
 */

require('dotenv').config();
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

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

      // Insert users
      await pool.query(`
        INSERT INTO users (username, password, role) VALUES
        ('admin', ?, 'admin'),
        ('pegawai1', ?, 'pegawai')
      `, [adminPassword, pegawaiPassword]);

      console.log('✅ Seeded 2 users (admin, pegawai1)');
      console.log('   Credentials: username=admin/pegawai1, password=password123');
    } else {
      console.log('ℹ️  Users already exist, skipping...');
    }

    // 2. Check if services exist
    const [servicesExist] = await pool.query('SELECT COUNT(*) as count FROM services');

    if (servicesExist[0].count === 0) {
      await pool.query(`
        INSERT INTO services (name, price, unit, active) VALUES
        ('Cuci Kiloan', 5000.00, 'kg', TRUE),
        ('Cuci Kiloan Express', 7000.00, 'kg', TRUE),
        ('Setrika Kiloan', 4000.00, 'kg', TRUE),
        ('Setrika Satuan', 2000.00, 'piece', TRUE),
        ('Cuci + Setrika Kiloan', 8000.00, 'kg', TRUE),
        ('Cuci + Setrika Satuan', 5000.00, 'piece', TRUE),
        ('Cuci Bedcover', 25000.00, 'piece', TRUE),
        ('Cuci Boneka', 18000.00, 'piece', TRUE),
        ('Cuci Sepatu', 35000.00, 'pair', TRUE),
        ('Cuci Tas', 40000.00, 'piece', TRUE)
      `);

      console.log('✅ Seeded 10 services');
    } else {
      console.log('ℹ️  Services already exist, skipping...');
    }

    // 3. Sample customers
    const [customersExist] = await pool.query('SELECT COUNT(*) as count FROM customers');

    if (customersExist[0].count === 0) {
      await pool.query(`
        INSERT INTO customers (name, whatsapp, address) VALUES
        ('Ahmad', '628123456789', 'Jl. Contoh No. 123, Yogyakarta'),
        ('Budi Santoso', '628987654321', 'Jl. Test No. 456, Sleman'),
        ('Siti Aminah', '628567890123', 'Jl. Demo No. 789, Bantul')
      `);

      console.log('✅ Seeded 3 sample customers');
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
