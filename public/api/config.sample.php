<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer environment variables when the host supports them.
 * Never commit a production secret.
 */
return [
    // Fallback edit password (used when no Google sign-in is present).
    'edit_password' => getenv('EDIT_PASSWORD') ?: 'change-me',

    // Google Sign-In. Create an OAuth 2.0 Web client at
    // https://console.cloud.google.com/apis/credentials and add your site
    // (e.g. https://tygrventures.com) as an Authorized JavaScript origin.
    // Paste the client ID here and in the frontend VITE_GOOGLE_CLIENT_ID.
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',

    // Comma-separated list of Google accounts allowed to edit the site.
    'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
];
