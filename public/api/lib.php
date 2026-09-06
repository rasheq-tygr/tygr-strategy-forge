<?php
declare(strict_types=1);

function tygr_config(): array
{
    $file = __DIR__ . '/config.php';
    if (is_file($file)) {
        $loaded = require $file;
        if (is_array($loaded)) {
            return $loaded;
        }
    }
    return [
        'edit_password' => getenv('EDIT_PASSWORD') ?: 'change-me',
    ];
}

function tygr_json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function tygr_json_out(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function tygr_password_from_request(): string
{
    $header = $_SERVER['HTTP_X_EDIT_PASSWORD'] ?? '';
    if (is_string($header) && $header !== '') {
        return $header;
    }
    $data = tygr_json_input();
    if (isset($data['password']) && is_string($data['password'])) {
        return $data['password'];
    }
    if (isset($_POST['password']) && is_string($_POST['password'])) {
        return $_POST['password'];
    }
    return '';
}

function tygr_require_auth(): void
{
    $expected = (string) (tygr_config()['edit_password'] ?? '');
    $given = tygr_password_from_request();
    if ($expected === '' || !hash_equals($expected, $given)) {
        tygr_json_out(401, ['ok' => false, 'error' => 'Invalid password']);
    }
}

function tygr_content_path(): string
{
    return dirname(__DIR__) . '/content.json';
}
