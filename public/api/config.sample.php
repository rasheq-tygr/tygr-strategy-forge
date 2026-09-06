<?php
/**
 * Copy this file to config.php on the host (not committed).
 * Prefer environment variables when the host supports them.
 * Never commit a production secret.
 */
return [
    'edit_password' => getenv('EDIT_PASSWORD') ?: 'change-me',

    // TidyCal REST API (custom booking flow). Create a Personal Access Token at
    // https://tidycal.com/integrations/advanced -> "Manage API keys" (paid plan).
    // The token stays server-side; the browser only talks to /api/tidycal.php.
    'tidycal_token' => getenv('TIDYCAL_TOKEN') ?: '',

    // The booking type the "Book a call" scheduler uses. Find the ID via
    // GET https://tidycal.com/api/booking-types. Leave blank to let the site
    // pick the booking type that matches contact.tidycalPath (or the first one).
    'tidycal_booking_type_id' => getenv('TIDYCAL_BOOKING_TYPE_ID') ?: '',
];
