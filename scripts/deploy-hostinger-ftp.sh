#!/usr/bin/env bash
# Mirror a Vite dist/ onto Hostinger over FTP.
# The website document root is /home/u764653958/domains/tygrventures.com/public_html.
# The FTP account often jails into a different public_html, so publish to the vhost
# (../domains/tygrventures.com/public_html) and also to the login directory.
set -euo pipefail

HOST="${FTP_HOST:-82.25.82.89}"
USER="${FTP_USER:-u764653958}"
PASS="${FTP_PASSWORD:?FTP_PASSWORD is required}"
LOCAL="${1:-dist}"
VHOST="../domains/tygrventures.com/public_html"

if [[ ! -d "$LOCAL" ]]; then
  echo "deploy-hostinger-ftp: expected built files at $LOCAL" >&2
  exit 1
fi

LOCAL_ABS=$(cd "$LOCAL" && pwd)

lftp_cmd() {
  timeout 180 lftp -u "$USER,$PASS" "$HOST" -e "set ftp:ssl-allow no; set net:timeout 20; set net:max-retries 2; set cmd:fail-exit yes; $1"
}

remote_listing=$(lftp_cmd "cls -1; pwd; bye")
echo "FTP listing at login:"
echo "$remote_listing"
echo "::notice::FTP login listing $(echo "$remote_listing" | tr '\n' ' ' | head -c 400)"

dry_flag=""
if [[ "${FTP_DRY_RUN:-}" == "true" ]]; then
  dry_flag="--dry-run"
  echo "FTP_DRY_RUN=true (no files written)"
fi

publish_dir() {
  local remote="$1"
  echo "Publishing $LOCAL_ABS/ -> $remote/"
  echo "::notice::FTP publishing to $remote/"
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
}

# Real vhost. Fail the job if this path cannot be written.
publish_dir "$VHOST"

# Login directory is a separate public_html. Keep it current too.
publish_dir "."
