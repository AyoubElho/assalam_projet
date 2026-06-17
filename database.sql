CREATE DATABASE IF NOT EXISTS certificat_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE certificat_db;

CREATE TABLE IF NOT EXISTS families (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  family_code VARCHAR(50) NULL,
  mother_name VARCHAR(255) NOT NULL,
  mother_cin VARCHAR(80) NULL,
  mother_phone VARCHAR(80) NULL,
  mother_address TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_family_code (family_code),
  INDEX idx_mother_name (mother_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  family_id VARCHAR(80) NOT NULL,
  child_order INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  birth_date DATE NULL,
  level VARCHAR(255) NULL,
  school VARCHAR(255) NULL,
  INDEX idx_family_id (family_id),
  CONSTRAINT fk_children_family
    FOREIGN KEY (family_id)
    REFERENCES families(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
