<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

/**
 * Public booking proxy for the TidyCal REST API. Visitors hit this endpoint;
 * the secret Bearer token is added server-side and never exposed to the client.
 * Supported:
 *   GET  ?action=booking-types
 *   GET  ?action=timeslots&booking_type_id=ID&starts_at=..&ends_at=..
 *   POST {action:"book", booking_type_id, starts_at, name, email, phone, timezone}
 */

$config = tygr_config();
$token = (string) ($config['tidycal_token'] ?? '');
$configuredType = (string) ($config['tidycal_booking_type_id'] ?? '');

if ($token === '') {
    tygr_json_out(503, ['ok' => false, 'error' => 'Booking is not configured yet.']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

/** Enforce the configured booking type when one is set, else trust the request. */
$resolveType = static function (string $requested) use ($configuredType): string {
    if ($configuredType !== '') {
        return $configuredType;
    }
    return $requested;
};

if ($method === 'GET' && $action === 'booking-types') {
    [$code, $data] = tygr_tidycal_request('GET', '/booking-types');
    $items = is_array($data['data'] ?? null) ? $data['data'] : [];
    if ($configuredType !== '') {
        $items = array_values(array_filter($items, static fn ($b) => (string) ($b['id'] ?? '') === $configuredType));
    }
    tygr_json_out($code ?: 502, ['ok' => $code === 200, 'data' => $items]);
}

if ($method === 'GET' && $action === 'timeslots') {
    $typeId = $resolveType((string) ($_GET['booking_type_id'] ?? ''));
    $startsAt = (string) ($_GET['starts_at'] ?? '');
    $endsAt = (string) ($_GET['ends_at'] ?? '');
    if ($typeId === '' || $startsAt === '' || $endsAt === '') {
        tygr_json_out(400, ['ok' => false, 'error' => 'Missing booking_type_id, starts_at or ends_at']);
    }
    $query = http_build_query(['starts_at' => $startsAt, 'ends_at' => $endsAt]);
    [$code, $data] = tygr_tidycal_request('GET', "/booking-types/{$typeId}/timeslots?{$query}");
    tygr_json_out($code ?: 502, ['ok' => $code === 200, 'data' => $data['data'] ?? []]);
}

if ($method === 'POST') {
    $input = tygr_json_input();
    if (($input['action'] ?? '') !== 'book') {
        tygr_json_out(400, ['ok' => false, 'error' => 'Unsupported action']);
    }
    $typeId = $resolveType((string) ($input['booking_type_id'] ?? ''));
    $startsAt = (string) ($input['starts_at'] ?? '');
    $name = trim((string) ($input['name'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $phone = trim((string) ($input['phone'] ?? ''));
    $timezone = (string) ($input['timezone'] ?? 'UTC');
    if ($typeId === '' || $startsAt === '' || $name === '' || $phone === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        tygr_json_out(422, ['ok' => false, 'error' => 'Name, a valid email, a phone number and a time slot are required.']);
    }
    // TidyCal's public API has no field for a booker phone on video booking types,
    // so append it to the name — the one free-text channel it stores and shows on
    // the booking, calendar event, and host notification.
    $bookedName = $phone !== '' ? "{$name} ({$phone})" : $name;
    $body = [
        'starts_at' => $startsAt,
        'name' => mb_substr($bookedName, 0, 191),
        'email' => mb_substr($email, 0, 191),
        'phone_number' => mb_substr($phone, 0, 40),
        'timezone' => mb_substr($timezone, 0, 191),
    ];
    if (isset($input['booking_questions']) && is_array($input['booking_questions'])) {
        $body['booking_questions'] = $input['booking_questions'];
    }
    [$code, $data] = tygr_tidycal_request('POST', "/booking-types/{$typeId}/bookings", $body);
    if ($code === 201) {
        tygr_json_out(201, ['ok' => true, 'data' => $data['data'] ?? null]);
    }
    if ($code === 409) {
        tygr_json_out(409, ['ok' => false, 'error' => 'That time was just taken. Please pick another slot.']);
    }
    $message = is_string($data['message'] ?? null) ? $data['message'] : 'Could not create the booking.';
    tygr_json_out($code ?: 502, ['ok' => false, 'error' => $message]);
}

tygr_json_out(400, ['ok' => false, 'error' => 'Unsupported request']);
