<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer an environment variable named EDIT_PASSWORD when the host supports it.
 * Never commit a production secret.
 */
return [
    'edit_password' => getenv('EDIT_PASSWORD') ?: 'change-me',
];
