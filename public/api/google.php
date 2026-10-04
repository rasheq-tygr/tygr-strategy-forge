<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

/**
 * Public Google Sign-In client ID for the editor login button.
 * OAuth client IDs are meant to live in the browser; secrets stay in config.php.
 */
$cfg = tygr_config();
$id = trim((string) ($cfg['google_client_id'] ?? ''));
tygr_json_out(200, [
    'ok' => true,
    'google_client_id' => $id,
]);
