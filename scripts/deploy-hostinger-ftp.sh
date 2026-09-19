#!/usr/bin/env bash
# Mirror a Vite dist/ onto Hostinger over FTP.
# Detects whether the account lands in public_html or one level above it.
set -euo pipefail

HOST="${FTP_HOST:-82.25.82.89}"
USER="${FTP_USER:-u764653958}"
PASS="${FTP_PASSWORD:?FTP_PASSWORD is required}"
LOCAL="${1:-dist}"

if [[ ! -d "$LOCAL" ]]; then
  echo "deploy-hostinger-ftp: expected built files at $LOCAL" >&2
  exit 1
fi

LOCAL_ABS=$(cd "$LOCAL" && pwd)

lftp_cmd() {
  lftp -u "$USER,$PASS" "$HOST" -e "set ftp:ssl-allow no; set net:timeout 30; set net:max-retries 3; $1"
}

remote_listing=$(lftp_cmd "cls -1; bye")
echo "FTP listing at login:"
echo "$remote_listing"

remote="."
if echo "$remote_listing" | grep -qE '^public_html/?$'; then
  remote="public_html"
elif echo "$remote_listing" | grep -qE '^domains/?$'; then
  remote="domains/tygrventures.com/public_html"
fi
echo "Publishing $LOCAL_ABS/ -> $remote/"

dry_flag=""
if [[ "${FTP_DRY_RUN:-}" == "true" ]]; then
  dry_flag="--dry-run"
  echo "FTP_DRY_RUN=true (no files written)"
fi

lftp_cmd "
cd $remote
pwd
mirror -R --verbose --parallel=4 $dry_flag \
  --exclude-glob content.json \
  --exclude-glob .env \
  --exclude-glob .env.* \
  --exclude-glob uploads/ \
  --exclude-glob api/config.php \
  $LOCAL_ABS/ .
ls
bye
"
echo "deploy-hostinger-ftp: published to $remote/"
