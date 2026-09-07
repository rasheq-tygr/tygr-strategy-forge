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

$size = (int) ($file['size'] ?? 0);
if ($size <= 0 || $size > 5 * 1024 * 1024) {
    tygr_json_out(400, ['ok' => false, 'error' => 'File too large']);
}

$tmp = (string) ($file['tmp_name'] ?? '');
if ($tmp === '' || !is_uploaded_file($tmp)) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Upload error']);
}

$ext = tygr_image_ext_from_bytes($tmp);
if ($ext === null) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Unsupported file type']);
}

$dir = dirname(__DIR__) . '/uploads';
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    tygr_json_out(500, ['ok' => false, 'error' => 'Could not create uploads directory']);
}

$filename = bin2hex(random_bytes(8)) . '-' . (string) time() . '.' . $ext;
$dest = $dir . '/' . $filename;

if (!move_uploaded_file($tmp, $dest)) {
    tygr_json_out(500, ['ok' => false, 'error' => 'Could not store file']);
}

tygr_json_out(200, ['ok' => true, 'url' => '/uploads/' . $filename]);
