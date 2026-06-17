<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_cors_headers();
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'POST only'], 405);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    json_response(['success' => false, 'message' => 'Invalid JSON payload'], 400);
}

$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');
$user = authenticate_user($username, $password);

if ($user === null) {
    json_response(['success' => false, 'message' => 'Invalid username or password'], 401);
}

start_app_session();
session_regenerate_id(true);
$_SESSION['authenticated'] = true;
$_SESSION['username'] = $user['username'];
$_SESSION['role'] = $user['role'];

json_response([
    'success' => true,
    'username' => $user['username'],
    'role' => $user['role'],
    'profile' => user_profile($user['username']),
]);
