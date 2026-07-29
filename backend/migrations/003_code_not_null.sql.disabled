-- Laundry Management System - ID Strategy Finalization
-- Migration: 003_code_not_null (FASE 4 — Deprecation & Cleanup)
-- Date: 15 Juni 2026
--
-- Tujuan:
--   Tighten kolom `code` menjadi NOT NULL pada 5 entity tables
--   (users, customers, services, orders, payments). Sebelumnya NULLABLE
--   (migration 002) untuk backfill; setelah backfill lengkap (FASE 1),
--   kolom kini wajib diisi.
--
--   UNIQUE INDEX yang ada tetap dipertahankan (kolom NOT NULL + UNIQUE = key
--   alternatif untuk lookup code).
--
-- Prasyarat:
--   - Migration 001 + 002 sudah dijalankan.
--   - FASE 1 backfill sudah mengisi `code` untuk SEMUA row (termasuk row yang
--     dibuat setelah 002). Bila ada row dengan code = NULL, perintah ini akan
--   gagal. Jalankan utilitas backfill (src/utils/codeResolver.generateAndAssign)
--   terlebih dahulu bila ragu.
--
-- Idempoten: aman dijalankan ulang (guard via INFORMATION_SCHEMA IS_NULLABLE).
--
-- Rollback:
--   ALTER TABLE users     MODIFY COLUMN code VARCHAR(20) NULL;
--   ALTER TABLE customers MODIFY COLUMN code VARCHAR(20) NULL;
--   ALTER TABLE services  MODIFY COLUMN code VARCHAR(10) NULL;
--   ALTER TABLE orders    MODIFY COLUMN code VARCHAR(20) NULL;
--   ALTER TABLE payments  MODIFY COLUMN code VARCHAR(20) NULL;

DELIMITER $$

-- Helper: set kolom `code` pada `p_table` menjadi NOT NULL bila masih nullable.
DROP PROCEDURE IF EXISTS tighten_code_not_null$$
CREATE PROCEDURE tighten_code_not_null(
  IN p_table VARCHAR(64),
  IN p_len INT
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = 'code'
      AND IS_NULLABLE = 'YES'
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', p_table,
      '` MODIFY COLUMN code VARCHAR(', p_len, ') NOT NULL'
    );
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- users: code VARCHAR(20) NOT NULL
CALL tighten_code_not_null('users', 20);

-- customers: code VARCHAR(20) NOT NULL
CALL tighten_code_not_null('customers', 20);

-- services: code VARCHAR(10) NOT NULL
CALL tighten_code_not_null('services', 10);

-- orders: code VARCHAR(20) NOT NULL
CALL tighten_code_not_null('orders', 20);

-- payments: code VARCHAR(20) NOT NULL
CALL tighten_code_not_null('payments', 20);

-- Cleanup helper
DROP PROCEDURE tighten_code_not_null;

SELECT 'Migration 003 completed: code column is now NOT NULL on users, customers, services, orders, payments' AS status;
