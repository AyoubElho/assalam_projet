<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function send_cors_headers(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    header('Access-Control-Allow-Origin: ' . ($origin !== '' ? $origin : '*'));
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    send_cors_headers();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pdo_without_database(): PDO
{
    $dsn = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
    return new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function db(): PDO
{
    $pdo = pdo_without_database();
    $database = '`' . str_replace('`', '``', DB_NAME) . '`';
    $charset = DB_CHARSET;

    $pdo->exec("CREATE DATABASE IF NOT EXISTS {$database} CHARACTER SET {$charset} COLLATE {$charset}_unicode_ci");
    $pdo->exec("USE {$database}");
    ensure_schema($pdo);

    return $pdo;
}

function ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS families (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    ensure_column($pdo, 'families', 'mother_cin', 'VARCHAR(80) NULL AFTER mother_name');
    ensure_column($pdo, 'families', 'mother_phone', 'VARCHAR(80) NULL AFTER mother_cin');
    ensure_column($pdo, 'families', 'mother_address', 'TEXT NULL AFTER mother_phone');

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS children (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    drop_column_if_exists($pdo, 'children', 'age');
}

function ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = :schema
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column'
    );
    $stmt->execute([
        ':schema' => DB_NAME,
        ':table' => $table,
        ':column' => $column,
    ]);

    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }

    $safeTable = '`' . str_replace('`', '``', $table) . '`';
    $safeColumn = '`' . str_replace('`', '``', $column) . '`';
    $pdo->exec("ALTER TABLE {$safeTable} ADD COLUMN {$safeColumn} {$definition}");
}

function drop_column_if_exists(PDO $pdo, string $table, string $column): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = :schema
           AND TABLE_NAME = :table
           AND COLUMN_NAME = :column'
    );
    $stmt->execute([
        ':schema' => DB_NAME,
        ':table' => $table,
        ':column' => $column,
    ]);

    if ((int) $stmt->fetchColumn() === 0) {
        return;
    }

    $safeTable = '`' . str_replace('`', '``', $table) . '`';
    $safeColumn = '`' . str_replace('`', '``', $column) . '`';
    $pdo->exec("ALTER TABLE {$safeTable} DROP COLUMN {$safeColumn}");
}

function mysql_datetime(?string $value): ?string
{
    if (!$value) {
        return null;
    }

    $timestamp = strtotime($value);
    return $timestamp ? date('Y-m-d H:i:s', $timestamp) : null;
}

function mysql_date(?string $value): ?string
{
    if (!$value) {
        return null;
    }

    $timestamp = strtotime($value);
    return $timestamp ? date('Y-m-d', $timestamp) : null;
}
