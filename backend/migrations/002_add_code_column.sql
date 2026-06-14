-- Laundry Management System - Hybrid ID Strategy
-- Migration: 002_add_code_column (FASE 1 — Non-Breaking)
-- Date: 14 Juni 2026
--
-- Tujuan:
--   Tambah kolom `code` (VARCHAR, NULLABLE) + UNIQUE INDEX pada 5 entity tables:
--     users, customers, services, orders, payments.
--   `order_items` & `audit_logs` TIDAK diubah (PK internal, sesuai proposal).
--
-- Kolom dibuat NULLABLE di fase 1 (agar row existing tidak violate NOT NULL
-- sebelum backfill). Akan ditghten ke NOT NULL di fase 4 (setelah backfill).
-- UNIQUE INDEX pada kolom NULLABLE di MySQL mengizinkan multiple NULL → safe.
--
-- Idempoten: aman dijalankan ulang (guard via INFORMATION_SCHEMA).
--   MySQL 8.0 tidak mendukung `ADD COLUMN IF NOT EXISTS`, sehingga pakai
--   stored procedure helper.
--
-- Rollback:
--   ALTER TABLE users     DROP INDEX idx_users_code     , DROP COLUMN code;
--   ALTER TABLE customers DROP INDEX idx_customers_code , DROP COLUMN code;
--   ALTER TABLE services  DROP INDEX idx_services_code  , DROP COLUMN code;
--   ALTER TABLE orders    DROP INDEX idx_orders_code    , DROP COLUMN code;
--   ALTER TABLE payments  DROP INDEX idx_payments_code  , DROP COLUMN code;

DELIMITER $$

-- Helper: tambah kolom `code` VARCHAR(len) bila belum ada.
DROP PROCEDURE IF EXISTS add_code_column_if_missing$$
CREATE PROCEDURE add_code_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_len INT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = 'code'
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN code VARCHAR(', p_len, ') NULL');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

-- Helper: tambah UNIQUE INDEX bila belum ada.
DROP PROCEDURE IF EXISTS add_code_index_if_missing$$
CREATE PROCEDURE add_code_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('CREATE UNIQUE INDEX `', p_index, '` ON `', p_table, '` (`code`)');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- users: code VARCHAR(20), format USR-XXXXXX
CALL add_code_column_if_missing('users', 20);
CALL add_code_index_if_missing('users', 'idx_users_code');

-- customers: code VARCHAR(20), format CUS-XXXXXX
CALL add_code_column_if_missing('customers', 20);
CALL add_code_index_if_missing('customers', 'idx_customers_code');

-- services: code VARCHAR(10), format SVC-NN
CALL add_code_column_if_missing('services', 10);
CALL add_code_index_if_missing('services', 'idx_services_code');

-- orders: code VARCHAR(20), format ORD-YYMMDD-XXXXXX
CALL add_code_column_if_missing('orders', 20);
CALL add_code_index_if_missing('orders', 'idx_orders_code');

-- payments: code VARCHAR(20), format PAY-YYMMDD-XXXXXX
CALL add_code_column_if_missing('payments', 20);
CALL add_code_index_if_missing('payments', 'idx_payments_code');

-- Cleanup helpers
DROP PROCEDURE add_code_column_if_missing;
DROP PROCEDURE add_code_index_if_missing;

SELECT 'Migration 002 completed: code column added to users, customers, services, orders, payments' AS status;
