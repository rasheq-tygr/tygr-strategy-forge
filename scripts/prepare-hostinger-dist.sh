#!/usr/bin/env bash
# Strip live-only Hostinger files from a Vite dist/ before FTP.
# Production content.json, uploads/, and api/config.php stay on the server.
set -euo pipefail

ROOT="${1:-dist}"

if [[ ! -d "$ROOT" ]]; then
  echo "prepare-hostinger-dist: expected a built folder at $ROOT" >&2
  exit 1
fi

rm -f "$ROOT/content.json"
rm -f "$ROOT/api/config.php"
rm -rf "$ROOT/uploads"
rm -f "$ROOT/.env" "$ROOT/.env.local"

echo "prepare-hostinger-dist: $ROOT is ready to publish (CMS files excluded)"
