<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer environment variables when the host supports them.
 * Never commit a production secret.
 */
return [
    // Editor password. Backup login even when Google Sign-In is configured.
    // Must be at least 16 characters. Placeholders such as "change-me" are rejected.
    'edit_password' => getenv('EDIT_PASSWORD') ?: '',

    // TidyCal REST API proxy. Unused by the site UI (Book a call opens the
    // hosted TidyCal page) but kept on purpose. Create a Personal Access Token
    // at https://tidycal.com/integrations/advanced -> "Manage API keys".
    'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',

    // Booking type id for the REST proxy. Digits only.
    // Find the ID via GET https://tidycal.com/api/booking-types.
    'tidycal_booking_type_id' => getenv('TIDYCAL_BOOKING_TYPE_ID') ?: '',

    // Google Sign-In. Create an OAuth 2.0 Web client at
    // https://console.cloud.google.com/apis/credentials
    // Authorized JavaScript origins (HTTP until SSL is live):
    //   http://localhost:5173
    //   http://tygrventures.com
    //   https://tygrventures.com
    // Authorized redirect URIs:
    //   http://localhost:5173/admin
    //   http://tygrventures.com/admin
    //   https://tygrventures.com/admin
    // The editor login reads this value live from /api/google.php.
    // A usable edit_password still works as a backup on /admin.
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',

    // Comma-separated list of Google accounts allowed to edit the site.
    // An empty list denies every account.
    'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
];
