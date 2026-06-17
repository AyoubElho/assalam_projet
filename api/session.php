<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_cors_headers();
    http_response_code(204);
    exit;
}

start_app_session();
$username = current_username();

json_response([
    'success' => true,
    'authenticated' => is_authenticated(),
    'username' => $username,
    'role' => $_SESSION['role'] ?? null,
    'profile' => $username ? user_profile($username) : null,
]);
