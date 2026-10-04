---
name: load-locally
description: Pull the Cloud Agent or PR branch onto this laptop and start the Vite site. Use when the user says load locally, preview locally, run it locally, try it locally, open locally, or similar.
environments: [local]
---

# Load the site locally

Bring the latest Cloud Agent / PR branch onto **this laptop** and start Vite. Cloud Agents cannot run this — they have no access to the user's Mac.

## Abort if this is a Cloud Agent

Stop immediately if any of these are true:

- `CURSOR_AGENT` is set in the environment
- The cwd is `/workspace` on a remote VM (not `/Users/...`)
- You only have the Cloud Agent VM, not the user's Desktop checkout

Tell the user to say **load locally** in a **local** Cursor chat on their laptop (or use **Checkout Branch** / `git pull` in Terminal.app). Do not try `npm run dev` in the cloud for this skill.

## Do this on the laptop

Repo root is the folder that contains `package.json` (usually `tygr-strategy-forge`). Run every command there.

1. **Fetch**

```bash
git fetch origin
```

2. **Land on the right branch**

- If HEAD is already a `cursor/...` branch, pull it: `git pull origin "$(git branch --show-current)"`
- Else if the user named a branch, check that out and pull
- Else pick the open PR branch (`gh pr list --head cursor/ --state open`) or the newest `origin/cursor/*` ref, check it out, and pull

Confirm with `git branch --show-current` and `git log -1 --oneline`.

3. **Env and install**

```bash
if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi
if [ ! -x node_modules/.bin/vite ]; then npm install; fi
```

4. **Free port 5173** (do not use `pkill -f`)

```bash
kill -9 $(lsof -ti :5173) 2>/dev/null || true
```

Stale Vite on 5173 is why localhost often still shows old UI.

5. **Start one dual-stack server** (see `AGENTS.md`)

```bash
npm run dev -- --host :: --port 5173
```

6. **Verify** both `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/` and `http://[::1]:5173/` return 200 (or the server log shows ready).

7. Tell the user to open **http://localhost:5173** and hard-refresh (`Cmd+Shift+R`).

If `Port 5173 is already in use` after the kill, run the kill command again, wait a second, then retry step 5. Alternatively start on 5174 and tell them to use **http://localhost:5174** so they do not hit the old process.
