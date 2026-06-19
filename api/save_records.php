<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_cors_headers();
    http_response_code(204);
    exit;
}

require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'POST only'], 405);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload) || !isset($payload['records']) || !is_array($payload['records'])) {
    json_response(['success' => false, 'message' => 'Invalid JSON payload'], 400);
}

function normalize_unique_value(?string $value, bool $compactWhitespace = false): string
{
    $text = trim((string) $value);
    if ($text === '') {
        return '';
    }

    $replacement = $compactWhitespace ? '' : ' ';
    $normalized = preg_replace('/\s+/u', $replacement, $text);
    if (is_string($normalized)) {
        $text = $normalized;
    }

    return function_exists('mb_strtolower')
        ? mb_strtolower($text, 'UTF-8')
        : strtolower($text);
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    $familySql = "INSERT INTO families
        (id, family_code, mother_name, mother_cin, mother_phone, mother_address, notes, created_at, updated_at)
        VALUES
        (:id, :family_code, :mother_name, :mother_cin, :mother_phone, :mother_address, :notes, :created_at, :updated_at)
        ON DUPLICATE KEY UPDATE
            family_code = VALUES(family_code),
            mother_name = VALUES(mother_name),
            mother_cin = VALUES(mother_cin),
            mother_phone = VALUES(mother_phone),
            mother_address = VALUES(mother_address),
            notes = VALUES(notes),
            created_at = COALESCE(families.created_at, VALUES(created_at)),
            updated_at = VALUES(updated_at)";
    $familyStmt = $pdo->prepare($familySql);

    $deleteChildrenStmt = $pdo->prepare('DELETE FROM children WHERE family_id = :family_id');
    $existingCodeStmt = $pdo->prepare('SELECT family_code FROM families WHERE id = :id');
    $maxCodeStmt = $pdo->prepare('SELECT COALESCE(MAX(CAST(family_code AS UNSIGNED)), 0) AS max_code FROM families');
    $duplicateCinStmt = $pdo->prepare(
        "SELECT id
         FROM families
         WHERE id <> :id
           AND mother_cin IS NOT NULL
           AND TRIM(mother_cin) <> ''
           AND LOWER(REPLACE(TRIM(mother_cin), ' ', '')) = :mother_cin_key
         LIMIT 1"
    );
    $childStmt = $pdo->prepare(
        "INSERT INTO children
            (family_id, child_order, name, birth_date, level, school)
            VALUES
            (:family_id, :child_order, :name, :birth_date, :level, :school)"
    );

    $saved = 0;
    $savedRecords = [];
    $seenMotherCins = [];
    foreach ($payload['records'] as $record) {
        if (!is_array($record) || empty($record['id']) || empty($record['motherName'])) {
            continue;
        }

        $familyId = (string) $record['id'];
        $familyCode = isset($record['familyCode']) ? trim((string) $record['familyCode']) : '';
        if ($familyCode === '') {
            $existingCodeStmt->execute([':id' => $familyId]);
            $existingCode = $existingCodeStmt->fetchColumn();
            if ($existingCode !== false && trim((string) $existingCode) !== '') {
                $familyCode = (string) $existingCode;
            } else {
                $maxCodeStmt->execute();
                $familyCode = (string) (((int) $maxCodeStmt->fetchColumn()) + 1);
            }
        }

        $motherName = trim((string) $record['motherName']);
        $motherCin = isset($record['motherCin']) ? trim((string) $record['motherCin']) : null;
        $motherPhone = isset($record['motherPhone']) ? trim((string) $record['motherPhone']) : null;
        $motherAddress = isset($record['motherAddress']) ? trim((string) $record['motherAddress']) : null;
        $notes = isset($record['notes']) ? (string) $record['notes'] : null;
        $createdAt = mysql_datetime($record['createdAt'] ?? null);
        $updatedAt = mysql_datetime($record['updatedAt'] ?? null);

        $motherCinKey = normalize_unique_value($motherCin, true);

        if ($motherCinKey !== '') {
            if (isset($seenMotherCins[$motherCinKey]) && $seenMotherCins[$motherCinKey] !== $familyId) {
                throw new RuntimeException('رقم البطاقة الوطنية موجود مسبقا.', 409);
            }
            $seenMotherCins[$motherCinKey] = $familyId;

            $duplicateCinStmt->execute([
                ':id' => $familyId,
                ':mother_cin_key' => $motherCinKey,
            ]);
            if ($duplicateCinStmt->fetchColumn() !== false) {
                throw new RuntimeException('رقم البطاقة الوطنية موجود مسبقا.', 409);
            }
        }

        $familyStmt->execute([
            ':id' => $familyId,
            ':family_code' => $familyCode,
            ':mother_name' => $motherName,
            ':mother_cin' => $motherCin !== '' ? $motherCin : null,
            ':mother_phone' => $motherPhone !== '' ? $motherPhone : null,
            ':mother_address' => $motherAddress !== '' ? $motherAddress : null,
            ':notes' => $notes,
            ':created_at' => $createdAt,
            ':updated_at' => $updatedAt,
        ]);

        $deleteChildrenStmt->execute([':family_id' => $familyId]);

        $children = is_array($record['children'] ?? null) ? $record['children'] : [];
        $savedChildren = [];
        foreach ($children as $index => $child) {
            if (!is_array($child) || empty($child['name'])) {
                continue;
            }

            $childName = trim((string) $child['name']);
            $birthDate = mysql_date($child['birthDate'] ?? null);
            $level = isset($child['level']) ? (string) $child['level'] : null;
            $school = isset($child['school']) ? (string) $child['school'] : null;

            $childStmt->execute([
                ':family_id' => $familyId,
                ':child_order' => $index + 1,
                ':name' => $childName,
                ':birth_date' => $birthDate,
                ':level' => $level,
                ':school' => $school,
            ]);

            $savedChildren[] = [
                'name' => $childName,
                'birthDate' => $birthDate,
                'level' => $level,
                'school' => $school,
            ];
        }

        $savedRecords[] = [
            'id' => $familyId,
            'familyCode' => $familyCode,
            'motherName' => $motherName,
            'motherCin' => $motherCin,
            'motherPhone' => $motherPhone,
            'motherAddress' => $motherAddress,
            'notes' => $notes,
            'children' => $savedChildren,
            'createdAt' => $createdAt,
            'updatedAt' => $updatedAt,
        ];
        $saved++;
    }

    $pdo->commit();
    json_response(['success' => true, 'saved' => $saved, 'records' => $savedRecords]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $message = $error->getMessage();
    $status = (int) $error->getCode();
    if ($error instanceof PDOException && $error->getCode() === '23000' && stripos($message, 'uniq_mother_cin') !== false) {
        $message = 'رقم البطاقة الوطنية موجود مسبقا.';
        $status = 409;
    }
    if ($status < 400 || $status > 599) {
        $status = 500;
    }
    json_response(['success' => false, 'message' => $message], $status);
}
