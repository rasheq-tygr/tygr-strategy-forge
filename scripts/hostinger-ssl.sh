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

echo "=== websites ==="
code=$(api GET "/api/hosting/v1/websites?domain=${DOMAIN}&per_page=25" "" /tmp/websites.json)
echo "HTTP ${code}"
dump "websites domain=${DOMAIN}" /tmp/websites.json
python3 - <<'PY'
import json
p=json.load(open("/tmp/websites.json"))
items = p.get("data") if isinstance(p.get("data"), list) else None
if items is None and isinstance(p.get("data"), dict):
    items = p["data"].get("data") or p["data"].get("items") or []
if items is None:
    items = p.get("items") or []
keys = (
    "domain", "username", "is_enabled", "ipv4", "ip", "ipv6",
    "root_directory", "vhost_type", "website_type", "status",
)
for w in items[:12]:
    if not isinstance(w, dict):
        continue
    bits = [f"{k}={w.get(k)}" for k in keys if k in w]
    extra = [f"{k}={w.get(k)}" for k in w if k not in keys][:8]
    print("::notice::website " + " ".join(bits + extra))
PY
true

echo "=== DNS zone ==="
code=$(api GET "/api/dns/v1/zones/${DOMAIN}" "" /tmp/dns-zone.json)
echo "HTTP ${code}"
dump "dns-zone" /tmp/dns-zone.json
python3 - <<'PY'
import json
p=json.load(open("/tmp/dns-zone.json"))
recs = p if isinstance(p, list) else p.get("data") or p.get("records") or p.get("zone") or []
if isinstance(recs, dict):
    recs = recs.get("data") or recs.get("records") or recs.get("zone") or []
aaaa = []
for r in recs:
    if not isinstance(r, dict):
        continue
    typ = str(r.get("type") or r.get("record_type") or "")
    name = str(r.get("name") or r.get("host") or "")
    content = str(r.get("content") or r.get("value") or r.get("records") or "")
    print(f"::notice::dns {typ} {name} {content}"[:220])
    if typ.upper() == "AAAA":
        aaaa.append(name)
open("/tmp/aaaa-names.txt","w").write("\n".join(aaaa))
PY

if [[ -s /tmp/aaaa-names.txt ]]; then
  warn "Deleting AAAA records so Let's Encrypt does not validate over a Hostinger parking IPv6."
  code=$(api DELETE "/api/dns/v1/zones/${DOMAIN}" '{"filters":[{"name":"@","type":"AAAA"},{"name":"www","type":"AAAA"}]}' /tmp/dns-del-aaaa.json || true)
  echo "delete AAAA HTTP ${code}"
  dump "dns-del-aaaa" /tmp/dns-del-aaaa.json || true
fi

echo "=== parked domains ==="
code=$(api GET "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/parked-domains" "" /tmp/parked.json || true)
echo "HTTP ${code}"
dump "parked-domains" /tmp/parked.json || true
code=$(api POST "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/parked-domains" '{"domain":"www.tygrventures.com"}' /tmp/park-www.json || true)
echo "park www HTTP ${code}"
dump "park-www" /tmp/park-www.json || true

echo "=== disable website cache ==="
code=$(api PATCH "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/cache/toggle" '{"is_enabled":false}' /tmp/cache-off.json || true)
echo "HTTP ${code}"
dump "cache-off" /tmp/cache-off.json || true
code=$(api DELETE "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/cache/clear" "" /tmp/cache-clear.json || true)
echo "clear cache HTTP ${code}"

echo "=== public HTTP (must be 200 for SSL domain challenge) ==="
http80=$(curl -sS -o /tmp/http80.body -w '%{http_code}' --max-time 20 -A 'Mozilla/5.0' "http://${DOMAIN}/" || echo err)
canary=$(curl -sS -o /tmp/canary.body -w '%{http_code}' --max-time 20 -A 'Mozilla/5.0' "http://${DOMAIN}/.well-known/acme-challenge/tygr-ssl-check.txt" || echo err)
www80=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -A 'Mozilla/5.0' "http://www.${DOMAIN}/" || echo err)
notice "http80=${http80} www80=${www80} canary=${canary} canary_body=$(head -c 80 /tmp/canary.body 2>/dev/null | tr '\n' ' ')"
if [[ "$http80" == "403" || "$canary" == "403" ]]; then
  warn "HTTP 403 from GitHub Actions. Hostinger cannot complete Domain challenge until port 80 serves the site (and /.well-known/acme-challenge/)."
fi

echo "=== ssl status (before) ==="
code=$(api GET "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/status" "" /tmp/ssl-status.json)
echo "HTTP ${code}"
dump "ssl-status-before" /tmp/ssl-status.json
parse_ssl /tmp/ssl-status.json
STATUS=$(ssl_field status)
LAST_ERROR=$(ssl_field last_error)
notice "SSL before: status=${STATUS} last_error=${LAST_ERROR}"

echo "=== HTTPS redirect off until TLS works ==="
code=$(api PATCH "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/https-redirect/toggle" '{"is_enabled":false}' /tmp/redirect.json || true)
echo "HTTP ${code}"
dump "https-redirect-off" /tmp/redirect.json || true

challenge_stuck=0
if [[ "${LAST_ERROR}" == *"Domain challenge failed"* ]]; then
  challenge_stuck=1
fi
if [[ "$STATUS" == "failed" || "$STATUS" == "not_installed" || "$STATUS" == "expired" ]]; then
  challenge_stuck=1
fi
if [[ "$STATUS" == "waiting_for_retry" && "$challenge_stuck" -eq 1 ]]; then
  notice "Uninstalling stuck SSL (waiting_for_retry + Domain challenge failed) so a new setup can run."
fi

if [[ "$STATUS" != "installing" ]]; then
  if [[ "$challenge_stuck" -eq 1 || "$STATUS" == "active" || "$STATUS" == "waiting_for_retry" ]]; then
    echo "=== uninstall ==="
    code=$(api DELETE "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl" "" /tmp/ssl-uninstall.json || true)
    echo "uninstall HTTP ${code}"
    dump "ssl-uninstall" /tmp/ssl-uninstall.json || true
    notice "SSL uninstall HTTP ${code}"
  fi

  echo "=== request SSL install ==="
  code=$(api POST "/api/hosting/v1/accounts/${USER}/websites/${DOMAIN}/ssl/setup" "" /tmp/ssl-install.json)
  echo "install HTTP ${code}"
  dump "ssl-setup" /tmp/ssl-install.json
  notice "SSL setup HTTP ${code}"
  if [[ "$code" != "200" && "$code" != "201" && "$code" != "202" && "$code" != "204" ]]; then
    warn "SSL setup returned HTTP ${code}"
  fi
else
  notice "SSL is installing; not calling setup (Hostinger returns 422)."
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
set +e
python3 - <<'PY'
import socket, ssl, sys

host = "tygrventures.com"
ip = socket.gethostbyname(host)
print(f"resolved {host} -> {ip}")
print(f"::notice::resolved {host} -> {ip}")

try:
    s = socket.create_connection((ip, 80), 8)
    s.settimeout(8)
    s.sendall(b"GET / HTTP/1.1\r\nHost: tygrventures.com\r\nConnection: close\r\n\r\n")
    data = s.recv(400)
    s.close()
    line = data.split(b"\r\n", 1)[0].decode("latin1", "replace")
    print("http80", line, "bytes", len(data))
    print(f"::notice::prove http80 {line}")
except Exception as e:
    print("http80 fail", type(e).__name__, e)

try:
    s = socket.create_connection((ip, 443), 8)
    s.settimeout(8)
    s.sendall(b"GET / HTTP/1.1\r\nHost: tygrventures.com\r\nConnection: close\r\n\r\n")
    data = s.recv(400)
    s.close()
    print("http443", data[:120])
    if data.startswith(b"HTTP/"):
        print("PORT_443_SPEAKS_HTTP")
        print("::notice::PORT_443_SPEAKS_HTTP")
except Exception as e:
    print("http443 fail", type(e).__name__, e)

ctx = ssl.create_default_context()
try:
    with socket.create_connection((ip, 443), 8) as raw:
        raw.settimeout(8)
        with ctx.wrap_socket(raw, server_hostname=host) as ss:
            cert = ss.getpeercert()
            print("TLS_OK", ss.version(), ss.cipher())
            print("::notice::TLS_OK", ss.version())
            print("SAN", cert.get("subjectAltName"))
            sys.exit(0)
except Exception as e:
    print("TLS_FAIL", type(e).__name__, e)
    print(f"::notice::TLS_FAIL {type(e).__name__}: {e}")
    sys.exit(2)
PY
tls_rc=$?
set -e

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
  echo "Chrome \`ERR_SSL_PROTOCOL_ERROR\` continues until Hostinger can issue the cert."
  echo
  echo "- API status: **${STATUS:-unknown}**"
  echo "- last_error: \`${LAST_ERROR:-}\`"
  echo "- HTTP from this runner: \`http80=${http80}\` \`canary=${canary}\`"
  echo "- Port 443 currently answers plain HTTP instead of TLS."
  echo "- Hostinger last_error **Domain challenge failed** means HTTP-01 could not see the domain (port 80 403, HTTPS redirect, or DNS)."
  echo "- Until then try \`http://tygrventures.com\`."
  echo
  echo "hPanel → website Dashboard → Security → SSL → Uninstall, then Install."
} | summary

if [[ "$STATUS" == "active" ]]; then
  err "API says SSL is active but port 443 is not speaking TLS."
  exit 1
fi

if [[ "${LAST_ERROR}" == *"Domain challenge failed"* ]]; then
  err "Hostinger Domain challenge failed. HTTPS will not work until http://${DOMAIN}/.well-known/acme-challenge/ is reachable on port 80."
  exit 1
fi

if [[ "$STATUS" == "installing" ]]; then
  notice "SSL still installing."
  exit 0
fi

exit 1
