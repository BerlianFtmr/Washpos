-- Migration 004: Combined Code Column Migration
-- This migration combines:
-- 1. Adding code columns to entity tables (from 002_add_code_column.sql)
-- 2. Backfilling code values for existing data
-- 3. Setting code columns to NOT NULL (from 003_code_not_null.sql)
--
-- This migration is idempotent and can be run multiple times safely.

-- ============================================================================
-- PART 1: Add Code Columns to Entity Tables
-- ============================================================================

-- Add code column to users table
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) UNIQUE AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add unique index on users.code
SET @indexname = 'idx_users_code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, ' (code)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Add code column to customers table (similar pattern)
SET @tablename = 'customers';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) UNIQUE AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_customers_code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, ' (code)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Add code column to services table
SET @tablename = 'services';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) UNIQUE AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_services_code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, ' (code)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Add code column to orders table
SET @tablename = 'orders';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) UNIQUE AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_orders_code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, ' (code)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Add code column to payments table
SET @tablename = 'payments';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) UNIQUE AFTER id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @indexname = 'idx_payments_code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND INDEX_NAME = @indexname
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE UNIQUE INDEX ', @indexname, ' ON ', @tablename, ' (code)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- ============================================================================
-- PART 2: Backfill Code Values for Existing Data
-- ============================================================================

-- Backfill users codes (USR-XXXXXX format)
-- Use existing id to generate deterministic codes
UPDATE users SET code = CONCAT('USR-', LPAD(CONV(MD5(id), 16, 10), 6, '0'))
WHERE code IS NULL;

-- Backfill customers codes (CUS-XXXXXX format)
UPDATE customers SET code = CONCAT('CUS-', LPAD(CONV(MD5(id), 16, 10), 6, '0'))
WHERE code IS NULL;

-- Backfill services codes (SVC-NN format - sequential)
UPDATE services SET code = CONCAT('SVC-', LPAD(id, 2, '0'))
WHERE code IS NULL;

-- Backfill orders codes (ORD-YYMMDD-XXXXXX format)
UPDATE orders SET code = CONCAT(
  'ORD-',
  DATE_FORMAT(created_at, '%y%m%d'),
  '-',
  LPAD(CONV(MD5(id), 16, 10), 6, '0')
)
WHERE code IS NULL;

-- Backfill payments codes (PAY-YYMMDD-XXXXXX format)
UPDATE payments SET code = CONCAT(
  'PAY-',
  DATE_FORMAT(created_at, '%y%m%d'),
  '-',
  LPAD(CONV(MD5(id), 16, 10), 6, '0')
)
WHERE code IS NULL;

-- ============================================================================
-- PART 3: Set Code Columns to NOT NULL
-- ============================================================================

-- Set users.code to NOT NULL
SET @tablename = 'users';
SET @columnname = 'code';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(20) NOT NULL')
));
PREPARE modifyNotNull FROM @preparedStatement;
EXECUTE modifyNotNull;
DEALLOCATE PREPARE modifyNotNull;

-- Set customers.code to NOT NULL
SET @tablename = 'customers';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(20) NOT NULL')
));
PREPARE modifyNotNull FROM @preparedStatement;
EXECUTE modifyNotNull;
DEALLOCATE PREPARE modifyNotNull;

-- Set services.code to NOT NULL
SET @tablename = 'services';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(20) NOT NULL')
));
PREPARE modifyNotNull FROM @preparedStatement;
EXECUTE modifyNotNull;
DEALLOCATE PREPARE modifyNotNull;

-- Set orders.code to NOT NULL
SET @tablename = 'orders';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(20) NOT NULL')
));
PREPARE modifyNotNull FROM @preparedStatement;
EXECUTE modifyNotNull;
DEALLOCATE PREPARE modifyNotNull;

-- Set payments.code to NOT NULL
SET @tablename = 'payments';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND IS_NULLABLE = 'NO'
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' VARCHAR(20) NOT NULL')
));
PREPARE modifyNotNull FROM @preparedStatement;
EXECUTE modifyNotNull;
DEALLOCATE PREPARE modifyNotNull;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log completion (this will be shown in server logs)
SELECT 'Migration 004 completed successfully' AS status;
