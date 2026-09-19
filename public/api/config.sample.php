<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer environment variables when the host supports them.
 * Never commit a production secret.
 */
return [
    // Fallback edit password (used when no Google sign-in is present).
    'edit_password' => getenv('EDIT_PASSWORD') ?: 'change-me',

    // TidyCal REST API (custom booking flow). Create a Personal Access Token at
    // https://tidycal.com/integrations/advanced -> "Manage API keys" (paid plan).
    // The token stays server-side; the browser only talks to /api/tidycal.php.
    'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',

    // The booking type the "Book a call" scheduler uses. Find the ID via
    // GET https://tidycal.com/api/booking-types. Leave blank to let the site
    // pick the booking type that matches contact.tidycalPath (or the first one).
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
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',

    // Comma-separated list of Google accounts allowed to edit the site.
    'google_allowed_emails' => getenv('GOOGLE_ALLOWED_EMAILS') ?: 'rasheq@tygrventures.com',
];
