<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';
tygr_require_auth();
tygr_json_out(200, ['ok' => true]);
