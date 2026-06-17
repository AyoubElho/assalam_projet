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

try {
    $pdo = db();
    $families = $pdo->query(
        'SELECT id, family_code, mother_name, mother_cin, mother_phone, mother_address, notes, created_at, updated_at
         FROM families
         ORDER BY CAST(family_code AS UNSIGNED), created_at'
    )->fetchAll();

    $childrenStmt = $pdo->prepare(
        'SELECT name, birth_date, level, school
         FROM children
         WHERE family_id = :family_id
         ORDER BY child_order, id'
    );

    $records = [];
    foreach ($families as $family) {
        $childrenStmt->execute([':family_id' => $family['id']]);
        $children = array_map(static function (array $child): array {
            return [
                'name' => $child['name'],
                'birthDate' => $child['birth_date'],
                'level' => $child['level'],
                'school' => $child['school'],
            ];
        }, $childrenStmt->fetchAll());

        $records[] = [
            'id' => $family['id'],
            'familyCode' => $family['family_code'],
            'motherName' => $family['mother_name'],
            'motherCin' => $family['mother_cin'],
            'motherPhone' => $family['mother_phone'],
            'motherAddress' => $family['mother_address'],
            'notes' => $family['notes'],
            'children' => $children,
            'createdAt' => $family['created_at'],
            'updatedAt' => $family['updated_at'],
        ];
    }

    json_response(['success' => true, 'records' => $records]);
} catch (Throwable $error) {
    json_response(['success' => false, 'message' => $error->getMessage()], 500);
}
