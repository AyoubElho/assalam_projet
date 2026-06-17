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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response([
        'success' => true,
        'accounts' => public_accounts(),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'GET or POST only'], 405);
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    json_response(['success' => false, 'message' => 'Invalid JSON payload'], 400);
}

$action = (string) ($payload['action'] ?? '');
$users = app_users();

function accounts_username(array $payload): string
{
    $username = trim((string) ($payload['username'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9_.-]{3,40}$/', $username)) {
        json_response([
            'success' => false,
            'message' => 'Username must be 3-40 letters, numbers, dots, dashes or underscores.',
        ], 422);
    }

    return $username;
}

function accounts_role(array $payload): string
{
    $role = (string) ($payload['role'] ?? 'writer');
    if (!in_array($role, ['admin', 'writer'], true)) {
        json_response(['success' => false, 'message' => 'Invalid role.'], 422);
    }

    return $role;
}

function accounts_password(array $payload, bool $allowGenerate = true): array
{
    $password = (string) ($payload['password'] ?? '');
    $generated = false;

    if ($password === '' && $allowGenerate) {
        $password = generate_account_password();
        $generated = true;
    }

    if (strlen($password) < 6) {
        json_response([
            'success' => false,
            'message' => 'Password must be at least 6 characters.',
        ], 422);
    }

    return [$password, $generated];
}

function accounts_admin_count(array $users): int
{
    $count = 0;
    foreach ($users as $user) {
        if (($user['role'] ?? 'writer') === 'admin') {
            $count += 1;
        }
    }

    return $count;
}

function accounts_save_and_return(array $users, array $extra = []): void
{
    save_users($users);
    json_response(array_merge([
        'success' => true,
        'accounts' => public_accounts(),
    ], $extra));
}

switch ($action) {
    case 'create':
        $username = accounts_username($payload);
        if (isset($users[$username])) {
            json_response(['success' => false, 'message' => 'Account already exists.'], 409);
        }

        $role = accounts_role($payload);
        [$password, $generated] = accounts_password($payload);
        $users[$username] = [
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
        ];

        accounts_save_and_return($users, [
            'generatedPassword' => $generated ? $password : null,
        ]);
        break;

    case 'update':
        $username = accounts_username($payload);
        if (!isset($users[$username])) {
            json_response(['success' => false, 'message' => 'Account not found.'], 404);
        }

        $role = accounts_role($payload);
        $currentUsername = current_username();
        $currentRole = (string) ($users[$username]['role'] ?? 'writer');

        if ($username === $currentUsername && $role !== 'admin') {
            json_response(['success' => false, 'message' => 'You cannot remove admin role from your current account.'], 422);
        }

        if ($currentRole === 'admin' && $role !== 'admin' && accounts_admin_count($users) <= 1) {
            json_response(['success' => false, 'message' => 'At least one admin account is required.'], 422);
        }

        $users[$username]['role'] = $role;
        accounts_save_and_return($users);
        break;

    case 'resetPassword':
        $username = accounts_username($payload);
        if (!isset($users[$username])) {
            json_response(['success' => false, 'message' => 'Account not found.'], 404);
        }

        [$password, $generated] = accounts_password($payload);
        $users[$username]['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
        accounts_save_and_return($users, [
            'generatedPassword' => $generated ? $password : null,
        ]);
        break;

    case 'delete':
        $username = accounts_username($payload);
        if (!isset($users[$username])) {
            json_response(['success' => false, 'message' => 'Account not found.'], 404);
        }

        if ($username === current_username()) {
            json_response(['success' => false, 'message' => 'You cannot delete your current account.'], 422);
        }

        if (($users[$username]['role'] ?? 'writer') === 'admin' && accounts_admin_count($users) <= 1) {
            json_response(['success' => false, 'message' => 'At least one admin account is required.'], 422);
        }

        unset($users[$username]);
        delete_user_profile($username);
        accounts_save_and_return($users);
        break;

    default:
        json_response(['success' => false, 'message' => 'Unknown action.'], 400);
}
