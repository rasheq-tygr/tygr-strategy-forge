#!/usr/bin/env bash
# Mirror a Vite dist/ onto Hostinger over FTP.
# The website document root is domains/tygrventures.com/public_html (Hostinger API).
# FTP accounts often jail into a different public_html; prefer the real vhost path.
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

remote_listing=$(lftp_cmd "cls -1; pwd; bye")
echo "FTP listing at login:"
echo "$remote_listing"
echo "::notice::FTP login listing $(echo "$remote_listing" | tr '\n' ' ' | head -c 400)"

can_cd() {
  local dir=$1
  local out
  out=$(lftp_cmd "cd $dir && pwd && bye" 2>&1) || true
  echo "$out" >&2
  if echo "$out" | grep -qiE 'access failed|failed to change|No such file|cannot be found|550 '; then
    return 1
  fi
  if echo "$out" | grep -qE '/public_html|/domains/'; then
    return 0
  fi
  # cd . always works
  if [[ "$dir" == "." ]]; then
    return 0
  fi
  return 1
}

remote=""
for dir in \
  "domains/tygrventures.com/public_html" \
  "../domains/tygrventures.com/public_html" \
  "../../domains/tygrventures.com/public_html"
do
  echo "Trying FTP cd $dir"
  if can_cd "$dir"; then
    remote="$dir"
    break
  fi
done

if [[ -z "$remote" ]]; then
  if echo "$remote_listing" | grep -qE '^public_html/?$'; then
    remote="public_html"
  else
    remote="."
  fi
fi

echo "Publishing $LOCAL_ABS/ -> $remote/"
echo "::notice::FTP publishing to $remote/"

dry_flag=""
if [[ "${FTP_DRY_RUN:-}" == "true" ]]; then
  dry_flag="--dry-run"
  echo "FTP_DRY_RUN=true (no files written)"
fi

publish_out=$(lftp_cmd "
cd $remote
pwd
mirror -R --verbose --parallel=4 $dry_flag \
  --exclude-glob content.json \
  --exclude-glob .env \
  --exclude-glob .env.* \
  --exclude-glob uploads/ \
  --exclude-glob api/config.php \
  $LOCAL_ABS/ .
echo '--- after ---'
ls
echo '--- canary ---'
cls -1 tygr-ssl-check.txt tygr-deploy.txt index.html .well-known/acme-challenge || true
bye
")
echo "$publish_out"
echo "::notice::FTP after $(echo "$publish_out" | tr '\n' ' ' | head -c 500)"
echo "deploy-hostinger-ftp: published to $remote/"
