<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer environment variables when the host supports them.
 * Never commit a production secret.
 */
return [
    // Editor password used only when Google Sign-In is not configured.
    // Must be at least 16 characters. Placeholders such as "change-me" are rejected.
    'edit_password' => getenv('EDIT_PASSWORD') ?: '',

    // TidyCal REST API (custom booking flow). Create a Personal Access Token at
    // https://tidycal.com/integrations/advanced -> "Manage API keys" (paid plan).
    // The token stays server-side; the browser only talks to /api/tidycal.php.
    'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',

    // The booking type the "Book a call" scheduler uses. Digits only.
    // Find the ID via GET https://tidycal.com/api/booking-types.
    'tidycal_booking_type_id' => getenv('TIDYCAL_BOOKING_TYPE_ID') ?: '',

    // Google Sign-In. Create an OAuth 2.0 Web client at
    // https://console.cloud.google.com/apis/credentials and add your site
    // (e.g. https://tygrventures.com) as an Authorized JavaScript origin.
    // Paste the client ID here and in the frontend VITE_GOOGLE_CLIENT_ID.
    // When this is set, password login is disabled.
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',

    // Comma-separated list of Google accounts allowed to edit the site.
    // An empty list denies every account.
    'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
];
