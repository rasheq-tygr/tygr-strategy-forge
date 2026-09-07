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
        'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',
        'tidycal_booking_type_id' => getenv('TIDYCAL_BOOKING_TYPE_ID') ?: '',
        'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
        'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
    ];
}

/**
 * Perform an authenticated JSON request against the TidyCal REST API.
 * Returns [httpStatus, decodedBodyArray]. Status 0 signals a transport error
 * or a missing token, so the secret never leaves the server.
 */
function tygr_tidycal_request(string $method, string $path, ?array $body = null): array
{
    $token = (string) (tygr_config()['tidycal_token'] ?? '');
    if ($token === '') {
        return [0, ['error' => 'TidyCal token not configured']];
    }
    $url = 'https://tidycal.com/api' . $path;
    $payload = $body === null ? null : json_encode($body, JSON_UNESCAPED_SLASHES);
    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
        ];
        if ($payload !== null) {
            $opts[CURLOPT_POSTFIELDS] = $payload;
        }
        curl_setopt_array($ch, $opts);
        $res = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false) {
            return [0, ['error' => 'TidyCal request failed']];
        }
        $decoded = json_decode((string) $res, true);
        return [$code, is_array($decoded) ? $decoded : []];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $payload ?? '',
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);
    $res = @file_get_contents($url, false, $ctx);
    if ($res === false) {
        return [0, ['error' => 'TidyCal request failed']];
    }
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
    $decoded = json_decode((string) $res, true);
    return [$code, is_array($decoded) ? $decoded : []];
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

function tygr_google_token_from_request(): string
{
    $header = $_SERVER['HTTP_X_GOOGLE_TOKEN'] ?? '';
    if (is_string($header) && $header !== '') {
        return $header;
    }
    $data = tygr_json_input();
    if (isset($data['credential']) && is_string($data['credential'])) {
        return $data['credential'];
    }
    return '';
}

/** Comma/space separated allowlist of editor emails, lowercased. */
function tygr_allowed_emails(): array
{
    $raw = (string) (tygr_config()['google_allowed_emails'] ?? '');
    $parts = preg_split('/[\s,]+/', strtolower($raw)) ?: [];
    return array_values(array_filter(array_map('trim', $parts)));
}

/**
 * Verify a Google ID token via Google's public tokeninfo endpoint. Returns the
 * verified email on success or null on any failure. No crypto libraries needed.
 */
function tygr_verify_google_token(string $token): ?string
{
    if ($token === '') {
        return null;
    }
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token);
    $body = false;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $result = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($result !== false && $code === 200) {
            $body = $result;
        }
    }

    if ($body === false && ini_get('allow_url_fopen')) {
        $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $body = @file_get_contents($url, false, $ctx);
    }

    if (!is_string($body) || $body === '') {
        return null;
    }

    $claims = json_decode($body, true);
    if (!is_array($claims) || !isset($claims['email']) || !is_string($claims['email'])) {
        return null;
    }

    $verified = ($claims['email_verified'] ?? '') === 'true' || ($claims['email_verified'] ?? null) === true;
    if (!$verified) {
        return null;
    }

    $expectedAud = (string) (tygr_config()['google_client_id'] ?? '');
    if ($expectedAud !== '' && (($claims['aud'] ?? '') !== $expectedAud)) {
        return null;
    }

    if (isset($claims['exp']) && (int) $claims['exp'] < time()) {
        return null;
    }

    $email = strtolower($claims['email']);
    $allow = tygr_allowed_emails();
    if ($allow !== [] && !in_array($email, $allow, true)) {
        return null;
    }

    return $email;
}

function tygr_require_auth(): void
{
    $googleToken = tygr_google_token_from_request();
    if ($googleToken !== '' && tygr_verify_google_token($googleToken) !== null) {
        return;
    }

    $expected = (string) (tygr_config()['edit_password'] ?? '');
    $given = tygr_password_from_request();
    if ($expected !== '' && hash_equals($expected, $given)) {
        return;
    }

    tygr_json_out(401, ['ok' => false, 'error' => 'Not authorized']);
}

function tygr_content_path(): string
{
    return dirname(__DIR__) . '/content.json';
}
