<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    tygr_json_out(405, ['ok' => false, 'error' => 'POST required']);
}

tygr_require_auth();

$payload = tygr_json_input();
$collection = tygr_collection_name($payload['collection'] ?? null);

// Per-item save: merge one post/study/capability into host content.json.
if ($collection !== null) {
    if (isset($payload['deleteId'])) {
        $deleteId = (string) $payload['deleteId'];
        tygr_mutate_content(
            static fn (array $content): array => tygr_delete_collection_item($content, $collection, $deleteId)
        );
        tygr_json_out(200, ['ok' => true, 'collection' => $collection, 'deleted' => trim($deleteId)]);
    }

    $item = $payload['item'] ?? null;
    if (!is_array($item) || $item === []) {
        tygr_json_out(400, ['ok' => false, 'error' => 'Expected item object']);
    }
    tygr_mutate_content(
        static fn (array $content): array => tygr_upsert_collection_item($content, $collection, $item)
    );
    tygr_json_out(200, [
        'ok' => true,
        'collection' => $collection,
        'id' => trim((string) ($item['id'] ?? '')),
    ]);
}

// Full-document save (legacy / save everything).
$content = $payload['content'] ?? $payload;
if (!is_array($content) || $content === []) {
    tygr_json_out(400, ['ok' => false, 'error' => 'Expected content object or collection item']);
}

tygr_write_content($content);
tygr_json_out(200, ['ok' => true]);
