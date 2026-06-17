<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_cors_headers();
    http_response_code(204);
    exit;
}

require_role('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'POST only'], 405);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload) || !isset($payload['id'])) {
    json_response(['success' => false, 'message' => 'Invalid JSON payload'], 400);
}

try {
    $pdo = db();
    $id = (string) $payload['id'];

    if ($id === '*') {
        $pdo->exec('DELETE FROM families');
        json_response(['success' => true, 'deleted' => 'all']);
    }

    $stmt = $pdo->prepare('DELETE FROM families WHERE id = :id');
    $stmt->execute([':id' => $id]);

    json_response(['success' => true, 'deleted' => $stmt->rowCount()]);
} catch (Throwable $error) {
    json_response(['success' => false, 'message' => $error->getMessage()], 500);
}
