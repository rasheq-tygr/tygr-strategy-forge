<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tygr_json_out(405, ['ok' => false, 'error' => 'POST required']);
}

tygr_require_auth();

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Missing file']);
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Upload error']);
}

$original = (string) ($file['name'] ?? 'image');
$ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];
if (!in_array($ext, $allowed, true)) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Unsupported file type']);
}

$dir = dirname(__DIR__) . '/uploads';
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    tygr_json_out(500, ['ok' => false, 'error' => 'Could not create uploads directory']);
}

$safe = preg_replace('/[^a-zA-Z0-9._-]/', '', basename($original)) ?: 'image';
$filename = (string) time() . '-' . $safe;
$dest = $dir . '/' . $filename;

if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
    tygr_json_out(500, ['ok' => false, 'error' => 'Could not store file']);
}

tygr_json_out(200, ['ok' => true, 'url' => '/uploads/' . $filename]);
