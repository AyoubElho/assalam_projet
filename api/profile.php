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

$username = current_username();
if ($username === null || $username === '') {
    json_response(['success' => false, 'message' => 'Unauthenticated'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(['success' => true, 'profile' => user_profile($username)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'POST only'], 405);
}

try {
    $displayName = trim((string) ($_POST['displayName'] ?? ''));
    if ($displayName === '') {
        $displayName = $username;
    }

    $profile = ['displayName' => function_exists('mb_substr') ? mb_substr($displayName, 0, 80) : substr($displayName, 0, 80)];
    $uploadedUrl = save_profile_image($username);
    if ($uploadedUrl !== null) {
        $profile['imageUrl'] = $uploadedUrl;
    }

    $savedProfile = save_user_profile($username, $profile);
    json_response(['success' => true, 'profile' => $savedProfile]);
} catch (Throwable $error) {
    json_response(['success' => false, 'message' => $error->getMessage()], 400);
}

function save_profile_image(string $username): ?string
{
    if (empty($_FILES['profileImage']) || !is_array($_FILES['profileImage'])) {
        return null;
    }

    $file = $_FILES['profileImage'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Image upload failed.');
    }

    $maxBytes = 2 * 1024 * 1024;
    if ((int) ($file['size'] ?? 0) > $maxBytes) {
        throw new RuntimeException('Image is too large. Maximum size is 2MB.');
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        throw new RuntimeException('Invalid uploaded image.');
    }

    $imageInfo = @getimagesize($tmpName);
    if ($imageInfo === false || empty($imageInfo['mime'])) {
        throw new RuntimeException('File must be an image.');
    }

    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];
    $mime = (string) $imageInfo['mime'];
    if (!isset($extensions[$mime])) {
        throw new RuntimeException('Allowed image types: JPG, PNG, WebP, GIF.');
    }

    $uploadDir = __DIR__ . '/uploads/profiles';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
        throw new RuntimeException('Could not create profile uploads folder.');
    }

    $safeUsername = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $username) ?: 'user';
    $fileName = $safeUsername . '-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $extensions[$mime];
    $targetPath = $uploadDir . '/' . $fileName;

    if (!move_uploaded_file($tmpName, $targetPath)) {
        throw new RuntimeException('Could not save uploaded image.');
    }

    return 'api/uploads/profiles/' . $fileName;
}
