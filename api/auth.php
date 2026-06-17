<?php
declare(strict_types=1);

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $sessionLifetime = 60 * 60 * 24 * 30;
    ini_set('session.gc_maxlifetime', (string) $sessionLifetime);

    $sessionPath = __DIR__ . '/sessions';
    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0775, true);
    }
    if (is_dir($sessionPath) && is_writable($sessionPath)) {
        session_save_path($sessionPath);
    }

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name('family_records_session');
    session_set_cookie_params([
        'lifetime' => $sessionLifetime,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function is_authenticated(): bool
{
    start_app_session();
    if (empty($_SESSION['authenticated']) || empty($_SESSION['username'])) {
        return false;
    }

    $username = (string) $_SESSION['username'];
    $users = app_users();
    if (!isset($users[$username])) {
        $_SESSION = [];
        return false;
    }

    $_SESSION['role'] = (string) ($users[$username]['role'] ?? 'writer');
    return true;
}

function require_auth(): void
{
    if (!is_authenticated()) {
        json_response(['success' => false, 'message' => 'Unauthenticated'], 401);
    }
}

function current_user_role(): ?string
{
    start_app_session();
    return isset($_SESSION['role']) ? (string) $_SESSION['role'] : null;
}

function current_username(): ?string
{
    start_app_session();
    return isset($_SESSION['username']) ? (string) $_SESSION['username'] : null;
}

function require_role(string $role): void
{
    require_auth();

    if (current_user_role() !== $role) {
        json_response(['success' => false, 'message' => 'Forbidden'], 403);
    }
}

function user_store_path(): string
{
    return __DIR__ . '/users.json';
}

function default_app_users(): array
{
    if (defined('APP_USERS') && is_array(APP_USERS)) {
        return APP_USERS;
    }

    if (defined('APP_USERNAME') && defined('APP_PASSWORD_HASH')) {
        return [
            APP_USERNAME => [
                'password_hash' => APP_PASSWORD_HASH,
                'role' => 'admin',
            ],
        ];
    }

    return [];
}

function app_users(): array
{
    $path = user_store_path();
    if (!is_file($path)) {
        return default_app_users();
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : default_app_users();
}

function save_users(array $users): void
{
    ksort($users, SORT_NATURAL | SORT_FLAG_CASE);
    file_put_contents(
        user_store_path(),
        json_encode($users, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function generate_account_password(int $length = 12): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$%#';
    $lastIndex = strlen($alphabet) - 1;
    $password = '';

    for ($i = 0; $i < $length; $i += 1) {
        $password .= $alphabet[random_int(0, $lastIndex)];
    }

    return $password;
}

function public_accounts(): array
{
    $accounts = [];
    foreach (app_users() as $username => $user) {
        $accounts[] = [
            'username' => (string) $username,
            'role' => (string) ($user['role'] ?? 'writer'),
            'profile' => user_profile((string) $username),
        ];
    }

    usort($accounts, static function (array $a, array $b): int {
        return strcasecmp((string) $a['username'], (string) $b['username']);
    });

    return $accounts;
}

function authenticate_user(string $username, string $password): ?array
{
    $users = app_users();
    $user = $users[$username] ?? null;

    if (!is_array($user)) {
        return null;
    }

    $hash = (string) ($user['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
        return null;
    }

    return [
        'username' => $username,
        'role' => (string) ($user['role'] ?? 'writer'),
    ];
}

function profile_store_path(): string
{
    return __DIR__ . '/profiles.json';
}

function load_profiles(): array
{
    $path = profile_store_path();
    if (!is_file($path)) {
        return [];
    }

    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function save_profiles(array $profiles): void
{
    file_put_contents(
        profile_store_path(),
        json_encode($profiles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function user_profile(string $username): array
{
    $profiles = load_profiles();
    $profile = is_array($profiles[$username] ?? null) ? $profiles[$username] : [];

    return [
        'displayName' => (string) ($profile['displayName'] ?? $username),
        'imageUrl' => isset($profile['imageUrl']) ? (string) $profile['imageUrl'] : '',
        'updatedAt' => isset($profile['updatedAt']) ? (string) $profile['updatedAt'] : null,
    ];
}

function save_user_profile(string $username, array $profile): array
{
    $profiles = load_profiles();
    $current = user_profile($username);
    $next = array_merge($current, $profile, [
        'updatedAt' => date('c'),
    ]);
    $profiles[$username] = $next;
    save_profiles($profiles);

    return user_profile($username);
}

function delete_user_profile(string $username): void
{
    $profiles = load_profiles();
    if (!array_key_exists($username, $profiles)) {
        return;
    }

    unset($profiles[$username]);
    save_profiles($profiles);
}
