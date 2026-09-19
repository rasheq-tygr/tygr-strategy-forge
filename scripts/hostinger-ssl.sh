#!/usr/bin/env bash
# Check / install Hostinger lifetime SSL for tygrventures.com.
# Requires HOSTINGER_API_TOKEN. Never prints the token.
set -euo pipefail

API="${HOSTINGER_API:-https://developers.hostinger.com}"
USER="${HOSTINGER_USER:-u764653958}"
DOMAIN="${HOSTINGER_DOMAIN:-tygrventures.com}"
TOKEN="${HOSTINGER_API_TOKEN:?HOSTINGER_API_TOKEN is required}"

notice() { echo "::notice::$1"; }
warn() { echo "::warning::$1"; }
err() { echo "::error::$1"; }

api() {
  local method=$1
  local path=$2
  local data=${3:-}
  local out=$4
  local extra=()
  if [[ -n "$data" ]]; then
    extra=(-d "$data")
  fi
  curl -sS -o "$out" -w '%{http_code}' -X "$method" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "${extra[@]}" \
    "${API}${path}"
}

parse_ssl() {
  python3 - "$1" <<'PY'
import json, sys
path = sys.argv[1]
try:
    p = json.load(open(path))
except Exception as e:
    print("PARSE_ERROR")
    print(e)
    sys.exit(0)

def pick(obj):
    if not isinstance(obj, dict):
        return {}
    statuses = {
        "active", "failed", "installing", "waiting_for_retry",
        "not_installed", "expired",
    }
    inner = obj.get("data") if isinstance(obj.get("data"), dict) else None
    if inner and inner.get("status") in statuses:
        return inner
    if obj.get("status") in statuses:
        return obj
    return inner or obj

d = pick(p)
fields = (
    "status", "provider", "last_error", "is_https_redirect_enabled",
    "expires_at", "is_lifetime",
)
for k in fields:
    v = d.get(k)
    print(f"{k}={'' if v is None else v}")
PY
}

ssl_field() {
  local key=$1
  parse_ssl /tmp/ssl-status.json | awk -F= -v k="$key" '$1==k{print substr($0,index($0,"=")+1)}'
}

dump() {
  local title=$1
  local file=$2
  echo "::group::${title}"
  python3 - "$file" <<'PY' || cat "$file"
import json,sys
p=json.load(open(sys.argv[1]))
print(json.dumps(p, indent=2)[:20000])
PY
  echo
  echo "::endgroup::"
}

summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    cat >> "$GITHUB_STEP_SUMMARY"
  fi
}

echo "=== websites (domain filter) ==="
code=$(api GET "/api/hosting/v1/websites?domain=${DOMAIN}&per_page=25" "" /tmp/websites.json)
echo "HTTP ${code}"
dump "websites domain=${DOMAIN}" /tmp/websites.json

echo "=== websites (username filter) ==="
code=$(api GET "/api/hosting/v1/websites?username=${USER}&per_page=25" "" /tmp/websites-user.json)
echo "HTTP ${code}"
dump "websites username=${USER}" /tmp/websites-user.json

echo "=== ssl status (before) ==="
code=$(api GET "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/status" "" /tmp/ssl-status.json)
echo "HTTP ${code}"
dump "ssl-status-before" /tmp/ssl-status.json
parse_ssl /tmp/ssl-status.json
STATUS=$(ssl_field status)
LAST_ERROR=$(ssl_field last_error)
notice "SSL before: status=${STATUS} last_error=${LAST_ERROR}"

echo "=== clear cache ==="
code=$(api DELETE "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/cache/clear" "" /tmp/cache-clear.json || true)
echo "HTTP ${code}"
dump "cache-clear" /tmp/cache-clear.json || true

echo "=== HTTPS redirect off until TLS works ==="
code=$(api PATCH "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/https-redirect/toggle" '{"is_enabled":false}' /tmp/redirect.json || true)
echo "HTTP ${code}"
dump "https-redirect-off" /tmp/redirect.json || true

should_install=1
if [[ "$STATUS" == "installing" || "$STATUS" == "waiting_for_retry" ]]; then
  should_install=0
  notice "SSL already ${STATUS}; not calling setup (Hostinger returns 422 while an install is in progress)."
fi

if [[ "$should_install" -eq 1 ]]; then
  if [[ "$STATUS" == "failed" || "$STATUS" == "expired" || "$STATUS" == "not_installed" || "$STATUS" == "active" ]]; then
    echo "=== uninstall (safe no-op if none assigned; required before replacing a custom cert) ==="
    code=$(api DELETE "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl" "" /tmp/ssl-uninstall.json || true)
    echo "uninstall HTTP ${code}"
    dump "ssl-uninstall" /tmp/ssl-uninstall.json || true
    if [[ "$code" == "422" ]]; then
      warn "Uninstall returned 422 (install in progress or free subdomain). Will try setup anyway."
    fi
  fi

  echo "=== request SSL install ==="
  code=$(api POST "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/setup" "" /tmp/ssl-install.json)
  echo "install HTTP ${code}"
  dump "ssl-setup" /tmp/ssl-install.json
  notice "SSL setup HTTP ${code}"
  if [[ "$code" != "200" && "$code" != "201" && "$code" != "202" && "$code" != "204" ]]; then
    warn "SSL setup returned HTTP ${code} (422 is expected while installing, or if a custom cert is present)."
  fi
fi

echo "=== poll SSL status ==="
STATUS=""
for i in $(seq 1 24); do
  code=$(api GET "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/status" "" /tmp/ssl-status.json)
  echo "poll ${i} HTTP ${code}"
  parse_ssl /tmp/ssl-status.json
  STATUS=$(ssl_field status)
  LAST_ERROR=$(ssl_field last_error)
  notice "poll ${i}: status=${STATUS} last_error=${LAST_ERROR}"
  if [[ "$STATUS" == "active" ]]; then
    notice "API reports SSL active"
    break
  fi
  if [[ "$STATUS" == "failed" ]]; then
    dump "ssl-status-failed" /tmp/ssl-status.json
    err "SSL installation failed last_error=${LAST_ERROR}"
    {
      echo "## Hostinger SSL"
      echo
      echo "API status: **failed**"
      echo
      echo "last_error: \`${LAST_ERROR}\`"
    } | summary
    exit 1
  fi
  sleep 20
done

dump "ssl-status-after" /tmp/ssl-status.json

echo "=== prove TLS on port 443 ==="
python3 - <<'PY'
import socket, ssl, sys

host = "tygrventures.com"
ip = socket.gethostbyname(host)
print(f"resolved {host} -> {ip}")

# HTTP on 80
try:
    s = socket.create_connection((ip, 80), 8)
    s.settimeout(8)
    s.sendall(b"GET / HTTP/1.1\r\nHost: tygrventures.com\r\nConnection: close\r\n\r\n")
    data = s.recv(400)
    s.close()
    line = data.split(b"\r\n", 1)[0]
    print("http80", line.decode("latin1", "replace"), "bytes", len(data))
except Exception as e:
    print("http80 fail", type(e).__name__, e)

# HTTP on 443 (the Chrome ERR_SSL_PROTOCOL_ERROR pattern)
try:
    s = socket.create_connection((ip, 443), 8)
    s.settimeout(8)
    s.sendall(b"GET / HTTP/1.1\r\nHost: tygrventures.com\r\nConnection: close\r\n\r\n")
    data = s.recv(400)
    s.close()
    head = data[:120]
    print("http443", head)
    if data.startswith(b"HTTP/"):
        print("PORT_443_SPEAKS_HTTP")
except Exception as e:
    print("http443 fail", type(e).__name__, e)

# Real TLS
ctx = ssl.create_default_context()
try:
    with socket.create_connection((ip, 443), 8) as raw:
        raw.settimeout(8)
        with ctx.wrap_socket(raw, server_hostname=host) as ss:
            cert = ss.getpeercert()
            print("TLS_OK", ss.version(), ss.cipher())
            print("subject", cert.get("subject"))
            print("SAN", cert.get("subjectAltName"))
            sys.exit(0)
except Exception as e:
    print("TLS_FAIL", type(e).__name__, e)
    sys.exit(2)
PY
tls_rc=$?

if [[ "$tls_rc" -eq 0 ]]; then
  notice "Port 443 is speaking TLS"
  echo "=== enable HTTPS redirect ==="
  code=$(api PATCH "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/https-redirect/toggle" '{"is_enabled":true}' /tmp/redirect-on.json || true)
  echo "HTTP ${code}"
  dump "https-redirect-on" /tmp/redirect-on.json || true
  {
    echo "## Hostinger SSL"
    echo
    echo "Port 443 is speaking TLS. HTTPS redirect turned on."
    echo
    echo "API status: **${STATUS}**"
  } | summary
  exit 0
fi

warn "Port 443 is not serving a TLS certificate yet (Chrome ERR_SSL_PROTOCOL_ERROR)."
{
  echo "## Hostinger SSL"
  echo
  echo "Chrome \`ERR_SSL_PROTOCOL_ERROR\` is expected until Hostinger finishes installing the cert."
  echo
  echo "- API status: **${STATUS:-unknown}**"
  echo "- last_error: \`${LAST_ERROR:-}\`"
  echo "- Port 443 currently accepts TCP but does not complete a TLS handshake (often it answers plain HTTP 403 instead of TLS)."
  echo "- Hostinger lifetime SSL can take up to 1–2 hours after setup."
  echo "- Until then try \`http://tygrventures.com\` (HTTPS redirect is off)."
  echo
  echo "hPanel → website Dashboard → Security → SSL."
} | summary

if [[ "$STATUS" == "active" ]]; then
  err "API says SSL is active but port 443 is not speaking TLS."
  exit 1
fi

# Installing can legally take longer than this job.
if [[ "$STATUS" == "installing" || "$STATUS" == "waiting_for_retry" ]]; then
  notice "SSL still ${STATUS}. Leave this job green; re-run Hostinger SSL in ~15 minutes."
  exit 0
fi

exit 0
