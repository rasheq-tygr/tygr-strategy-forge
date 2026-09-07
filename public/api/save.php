<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tygr_json_out(405, ['ok' => false, 'error' => 'POST required']);
}

tygr_require_auth();

$payload = tygr_json_input();
$content = $payload['content'] ?? $payload;
if (!is_array($content) || $content === []) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Expected content object']);
}

$json = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($json === false) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Could not encode JSON']);
}

$path = tygr_content_path();
if (file_put_contents($path, $json . "\n", LOCK_EX) === false) {
    tygr_json_out(500, ['ok' => false, 'error' => 'Could not write content.json']);
}

tygr_json_out(200, ['ok' => true]);
