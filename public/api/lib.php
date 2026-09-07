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
        'edit_password' => getenv('EDIT_PASSWORD') ?: '',
        'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',
        'tidycal_booking_type_id' => getenv('TIDYCAL_BOOKING_TYPE_ID') ?: '',
        'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
        'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
    ];
}

function tygr_placeholder_passwords(): array
{
    return ['change-me', 'local-dev-only'];
}

function tygr_password_usable(string $password): bool
{
    if ($password === '' || strlen($password) < 16) {
        return false;
    }
    foreach (tygr_placeholder_passwords() as $placeholder) {
        if (strlen($placeholder) === strlen($password) && hash_equals($placeholder, $password)) {
            return false;
        }
    }
    return true;
}

function tygr_google_configured(): bool
{
    return (string) (tygr_config()['google_client_id'] ?? '') !== '';
}

/**
 * Perform an authenticated JSON request against the TidyCal REST API.
 * $path must be a known suffix (no caller-controlled path segments).
 * Returns [httpStatus, decodedBodyArray]. Status 0 signals a transport error
 * or a missing token, so the secret never leaves the server.
 */
function tygr_tidycal_request(string $method, string $path, ?array $body = null): array
{
    if (!preg_match('#^/(booking-types|booking-types/\d+/timeslots|booking-types/\d+/bookings|bookings/\d+)(\?.*)?$#', $path)) {
        return [0, ['error' => 'Invalid TidyCal path']];
    }
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
    static $cached = null;
    if (is_array($cached)) {
        return $cached;
    }
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 512000) {
        tygr_json_out(413, ['ok' => false, 'error' => 'Payload too large']);
    }
    $data = json_decode($raw, true);
    $cached = is_array($data) ? $data : [];
    return $cached;
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

function tygr_google_tokeninfo(string $token): ?array
{
    $body = false;
    $payload = http_build_query(['id_token' => $token]);
    $headers = ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'];

    if (function_exists('curl_init')) {
        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $result = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($result !== false && $code === 200) {
            $body = $result;
        }
    } elseif (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $payload,
                'timeout' => 8,
                'ignore_errors' => true,
            ],
        ]);
        $result = @file_get_contents('https://oauth2.googleapis.com/tokeninfo', false, $ctx);
        $code = 0;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $code = (int) $m[1];
        }
        if (is_string($result) && $code === 200) {
            $body = $result;
        }
    }

    if (!is_string($body) || $body === '') {
        return null;
    }
    $claims = json_decode($body, true);
    return is_array($claims) ? $claims : null;
}

/**
 * Verify a Google ID token via Google's tokeninfo endpoint (POST, so the JWT
 * is not placed on the query string). Returns the verified email or null.
 */
function tygr_verify_google_token(string $token): ?string
{
    if ($token === '') {
        return null;
    }
    $expectedAud = (string) (tygr_config()['google_client_id'] ?? '');
    $allow = tygr_allowed_emails();
    if ($expectedAud === '' || $allow === []) {
        return null;
    }

    $claims = tygr_google_tokeninfo($token);
    if ($claims === null || !isset($claims['email']) || !is_string($claims['email'])) {
        return null;
    }

    $verified = ($claims['email_verified'] ?? '') === 'true' || ($claims['email_verified'] ?? null) === true;
    if (!$verified) {
        return null;
    }
    if (($claims['aud'] ?? '') !== $expectedAud) {
        return null;
    }
    $iss = (string) ($claims['iss'] ?? '');
    if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') {
        return null;
    }
    if (isset($claims['exp']) && (int) $claims['exp'] < time()) {
        return null;
    }

    $email = strtolower($claims['email']);
    if (!in_array($email, $allow, true)) {
        return null;
    }
    return $email;
}

function tygr_require_auth(): void
{
    if (tygr_google_configured()) {
        $googleToken = tygr_google_token_from_request();
        if ($googleToken !== '' && tygr_verify_google_token($googleToken) !== null) {
            return;
        }
        tygr_json_out(401, ['ok' => false, 'error' => 'Not authorized']);
    }

    $expected = (string) (tygr_config()['edit_password'] ?? '');
    if (!tygr_password_usable($expected)) {
        tygr_json_out(401, ['ok' => false, 'error' => 'Editor password is not configured']);
    }
    $given = tygr_password_from_request();
    if ($given !== '' && hash_equals($expected, $given)) {
        return;
    }
    tygr_json_out(401, ['ok' => false, 'error' => 'Not authorized']);
}

function tygr_content_path(): string
{
    return dirname(__DIR__) . '/content.json';
}

function tygr_digit_id(string $value): ?string
{
    return preg_match('/^\d+$/', $value) === 1 ? $value : null;
}

function tygr_iso_zulu(string $value): bool
{
    return preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $value) === 1;
}

function tygr_resolve_booking_type_id(string $requested, string $configured): ?string
{
    if ($configured !== '') {
        return tygr_digit_id($configured);
    }
    return tygr_digit_id($requested);
}

function tygr_https_url(mixed $value): ?string
{
    if (!is_string($value) || $value === '') {
        return null;
    }
    $parts = parse_url($value);
    if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
        return null;
    }
    return $value;
}

function tygr_sanitize_booking_type(mixed $raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    $id = $raw['id'] ?? null;
    $idStr = is_int($id) || is_float($id) ? (string) (int) $id : (is_string($id) ? $id : '');
    if (tygr_digit_id($idStr) === null) {
        return null;
    }
    $locations = [];
    if (isset($raw['locations']) && is_array($raw['locations'])) {
        foreach ($raw['locations'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $locations[] = [
                'location_option' => is_string($item['location_option'] ?? null) ? $item['location_option'] : '',
                'location_link_source' => is_string($item['location_link_source'] ?? null) ? $item['location_link_source'] : '',
            ];
        }
    }
    return [
        'id' => (int) $idStr,
        'title' => is_string($raw['title'] ?? null) ? $raw['title'] : '',
        'duration_minutes' => is_numeric($raw['duration_minutes'] ?? null) ? (int) $raw['duration_minutes'] : 0,
        'description' => is_string($raw['description'] ?? null) ? $raw['description'] : '',
        'url_slug' => is_string($raw['url_slug'] ?? null) ? $raw['url_slug'] : '',
        'price' => is_numeric($raw['price'] ?? null) ? (float) $raw['price'] : 0,
        'currency_code' => is_string($raw['currency_code'] ?? null) ? $raw['currency_code'] : '',
        'locations' => $locations,
    ];
}

function tygr_sanitize_timeslot(mixed $raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    $starts = is_string($raw['starts_at'] ?? null) ? $raw['starts_at'] : '';
    $ends = is_string($raw['ends_at'] ?? null) ? $raw['ends_at'] : '';
    if ($starts === '' || $ends === '') {
        return null;
    }
    return [
        'starts_at' => $starts,
        'ends_at' => $ends,
        'available_bookings' => is_numeric($raw['available_bookings'] ?? null) ? (int) $raw['available_bookings'] : 0,
    ];
}

function tygr_sanitize_booking(mixed $raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    $id = $raw['id'] ?? null;
    $idStr = is_int($id) || is_float($id) ? (string) (int) $id : (is_string($id) ? $id : '');
    if (tygr_digit_id($idStr) === null) {
        return null;
    }
    return [
        'id' => (int) $idStr,
        'starts_at' => is_string($raw['starts_at'] ?? null) ? $raw['starts_at'] : '',
        'ends_at' => is_string($raw['ends_at'] ?? null) ? $raw['ends_at'] : '',
        'timezone' => is_string($raw['timezone'] ?? null) ? $raw['timezone'] : '',
        'meeting_url' => tygr_https_url($raw['meeting_url'] ?? null),
    ];
}

function tygr_client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function tygr_rate_limit_allow(string $bucket, int $max, int $windowSeconds): bool
{
    $dir = sys_get_temp_dir() . '/tygr-rl';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true;
    }
    $file = $dir . '/' . hash('sha256', $bucket);
    $now = time();
    $fp = @fopen($file, 'c+');
    if ($fp === false) {
        return true;
    }
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp) ?: '[]';
    $parsed = json_decode($raw, true);
    $times = [];
    if (is_array($parsed)) {
        foreach ($parsed as $t) {
            if (is_int($t) && $t > $now - $windowSeconds) {
                $times[] = $t;
            }
        }
    }
    $ok = count($times) < $max;
    if ($ok) {
        $times[] = $now;
    }
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($times));
    flock($fp, LOCK_UN);
    fclose($fp);
    return $ok;
}

function tygr_image_ext_from_bytes(string $path): ?string
{
    $fh = @fopen($path, 'rb');
    if ($fh === false) {
        return null;
    }
    $head = fread($fh, 16) ?: '';
    fclose($fh);
    if (strlen($head) < 12) {
        return null;
    }
    $bytes = array_values(unpack('C*', $head) ?: []);
    if ($bytes[0] === 0xFF && $bytes[1] === 0xD8 && $bytes[2] === 0xFF) {
        return 'jpg';
    }
    if ($bytes[0] === 0x89 && $bytes[1] === 0x50 && $bytes[2] === 0x4E && $bytes[3] === 0x47) {
        return 'png';
    }
    if ($bytes[0] === 0x47 && $bytes[1] === 0x49 && $bytes[2] === 0x46 && $bytes[3] === 0x38) {
        return 'gif';
    }
    if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') {
        return 'webp';
    }
    if (substr($head, 4, 4) === 'ftyp' && in_array(substr($head, 8, 4), ['avif', 'avis'], true)) {
        return 'avif';
    }
    return null;
}
