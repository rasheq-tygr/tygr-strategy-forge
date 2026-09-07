# AGENTS.md

Guidance for AI coding agents working in this repository.

## Cursor Cloud specific instructions

- **Google Sign-In (editor login) cannot be end-to-end tested from the Cloud Agent VM.** Google blocks its Identity Services library (`accounts.google.com/gsi/client`) for datacenter IPs, so after a few attempts the in-VM browser gets `403` on `gsi/client` and the button reports `The OAuth client was not found` / `invalid_client` even when the OAuth client and origins are configured correctly. A direct `curl` to `gsi/client` from the VM still returns `200`, which confirms the block is browser/anti-abuse based, not a network problem. Verify Google Sign-In in a local browser on a residential IP (logged in as an approved editor). The server-side token verification and the editor unlock are covered by `verifyGoogleTokenDev` (dev) / `tygr_verify_google_token` (PHP) and can be exercised by posting a token to `/api/auth.php` with an `X-Google-Token` header.

- **Dev server / preview shows `ERR_CONNECTION_REFUSED` intermittently:** this is almost always two Vite servers competing for port 5173 (a stale one from an earlier session plus a fresh one), each bound to a different address family (`0.0.0.0`/IPv4 vs `::1`/IPv6). Because `localhost` resolves to both `::1` and `127.0.0.1`, the browser hits whichever is flapping. Fix: kill all Vite processes/sessions on 5173, then start a single server bound dual-stack with `npm run dev -- --host :: --port 5173` so both `127.0.0.1` and `::1` are served by one process. Verify with `curl http://127.0.0.1:5173/` and `curl http://[::1]:5173/` (both should return 200) and `ss -ltnp | grep :5173` (one listener on `:::5173`).
