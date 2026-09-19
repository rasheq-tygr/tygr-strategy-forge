# TYGR Ventures

Marketing site for [tygrventures.com](https://tygrventures.com): a Vite + React + TypeScript static build with a scroll-driven ecosystem, cream / navy / orange design system, and password-gated inline editing.

**Source of truth:** this GitHub repo (`rasheq-tygr/tygr-strategy-forge`).  
**Production:** Hostinger shared hosting at `https://tygrventures.com` (`public_html`).

The server does **not** need Node at runtime. GitHub Actions builds the Vite app and FTPs `dist/` to Hostinger. A small PHP endpoint writes `content.json` when you save edits.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open the printed local URL. Default edit password is `change-me` (from `EDIT_PASSWORD` / `VITE_EDIT_PASSWORD` in `.env`).

- Public site: `/`
- Editors: `/admin` (blog, case studies, capabilities)
- Inline edit: unlock via `/admin`, then click outlined copy on any page
- Save: the floating **Save to host** control, or Save in `/admin`

`npm run dev` mocks `/api/auth.php`, `/api/save.php`, and `/api/upload.php` so saves write `public/content.json` without PHP.

## Stack

- Vite 7, React 19, TypeScript, React Router
- Copy source of truth: `public/content.json` (fetched at runtime so Hostinger edits persist)
- Media: local upload to `/uploads` or Unsplash search (optional `VITE_UNSPLASH_ACCESS_KEY`)
- Logo: geometric tiger placeholder SVG — replace when the SoftRiver lockup is ready

## Editor sign-in

The editor accepts **Google Sign-In** (preferred) with an **edit password** as a backup. Both are verified server-side by the PHP `/api/*.php` endpoints (and by the dev mock during `npm run dev`).

### Google Sign-In (recommended)

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add **Authorized JavaScript origins**: `http://localhost:5173` (dev) and `https://tygrventures.com` (prod).
3. Copy the **Client ID** into:
   - `.env`: `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (dev mock)
   - Hostinger `api/config.php`: `google_client_id`
4. Set the allowlist of editor accounts:
   - `.env`: `VITE_GOOGLE_ALLOWED_EMAILS` / `GOOGLE_ALLOWED_EMAILS`
   - Hostinger `api/config.php`: `google_allowed_emails`
   - Defaults to `rasheq@tygrventures.com`.

The frontend only unlocks after the ID token is verified against Google's `tokeninfo` endpoint and matched to the allowlist. Leaving `VITE_GOOGLE_CLIENT_ID` blank hides the Google button and falls back to the password login.

### Edit password (backup / static preview)

| Where | What to set |
| --- | --- |
| Local `.env` | `EDIT_PASSWORD` and matching `VITE_EDIT_PASSWORD` |
| Hostinger | Copy `public/api/config.sample.php` → `api/config.php` and set `edit_password`, **or** set the `EDIT_PASSWORD` environment variable |

Never commit `api/config.php` or a real production password. `VITE_EDIT_PASSWORD` is only a fallback when the PHP auth route is missing (static preview). On the live host, PHP is the source of truth.

## GitHub → Hostinger deploy

Pushes to `main` (and manual **Run workflow**) run [`.github/workflows/deploy-hostinger.yml`](.github/workflows/deploy-hostinger.yml): `npm ci` → `npm run build` → FTP the contents of `dist/` into `public_html`.

The sync **does not overwrite** live editor data:

| Left on the host | Why |
| --- | --- |
| `content.json` | Inline /admin edits |
| `uploads/` | Media uploaded on the host |
| `api/config.php` | Edit password, Google client, TidyCal token |

### One-time GitHub secret

The workflow already uses the Hostinger FTP host `82.25.82.89` and user `u764653958`. It detects whether that account lands in `public_html` or already inside it. Add **one** repo secret:

[https://github.com/rasheq-tygr/tygr-strategy-forge/settings/secrets/actions](https://github.com/rasheq-tygr/tygr-strategy-forge/settings/secrets/actions)

| Secret | Value |
| --- | --- |
| `FTP_PASSWORD` | FTP password from hPanel → **Files → FTP Accounts** (the hidden field on that card; reveal or reset it there) |
| `VITE_GOOGLE_CLIENT_ID` | Optional. Baked into the production JS bundle |
| `VITE_GOOGLE_ALLOWED_EMAILS` | Optional. Defaults in code to `rasheq@tygrventures.com` |
| `VITE_UNSPLASH_ACCESS_KEY` | Optional. Admin photo search |
| `VITE_BOOKING_URL` | Optional. Fallback booking link |

Do not put `EDIT_PASSWORD`, `TIDYCAL_TOKEN`, or `api/config.php` in GitHub. Those stay on the host.

After `FTP_PASSWORD` exists, push to `main` or **Actions → Deploy to Hostinger → Run workflow**. Use **dry_run** on a manual dispatch to list the FTP plan without writing files.

### SSL (Chrome `ERR_SSL_PROTOCOL_ERROR`)

Hostinger must install a certificate before `https://tygrventures.com` works. Until port 443 speaks TLS, Chrome shows **This site can’t provide a secure connection** / `ERR_SSL_PROTOCOL_ERROR`.

Add repo secret `HOSTINGER_API_TOKEN` (hPanel → **API**). Deploy on `main` retries SSL after FTP. You can also **Actions → Hostinger SSL → Run workflow**.

If Hostinger reports **Domain challenge failed**, port 80 is not serving `/.well-known/acme-challenge/` to their validator (HTTP 403, force-HTTPS, or DNS). HTTPS redirect stays off until TLS works. Meanwhile try `http://tygrventures.com`.

### First time on a new Hostinger account

Do this once in File Manager if the files are not already on disk:

1. Copy `public/api/config.sample.php` → `public_html/api/config.php` and set `edit_password`, Google, and TidyCal values.
2. Seed `public_html/content.json` from `public/content.json` in this repo.
3. Create `public_html/uploads` and set it writable (`755` or `775`).

Then let GitHub Actions publish the rest (`index.html`, `assets/`, `.htaccess`, `api/*.php`, logos).

### Manual upload (fallback)

1. `npm run build` — output is `dist/`.
2. `bash scripts/prepare-hostinger-dist.sh dist` so you do not clobber live CMS files.
3. Upload **the contents of `dist/`** into `public_html` (not the `dist` folder itself).
4. Confirm `index.html`, `assets/`, `.htaccess`, and `api/*.php` landed at the web root.
5. Apache should already honor `.htaccess` (SPA fallback to `index.html` while real files like PHP and JSON still win).
6. Visit `https://tygrventures.com/admin`, unlock, edit, save. Confirm `content.json` updates on disk.

If saves fail, check that `public_html/content.json` and `public_html/uploads` are writable by the PHP user, and that the password in `api/config.php` matches what you type.

## Unsplash

Create a free app at [unsplash.com/developers](https://unsplash.com/developers) and put the Access Key in `.env` as `VITE_UNSPLASH_ACCESS_KEY`. Rebuild for production so the key is available in the admin media picker. Uploads work without Unsplash.

## Booking CTA

Set `contact.bookingUrl` in `content.json` (or `VITE_BOOKING_URL` locally). If empty, **Book a call** falls back to `mailto:rasheq@tygrventures.com`.

## Design notes

- Palette: cream `#f5f3ef`, navy `#0a0f1a`, orange `#f97316`
- Display: Playfair Display. UI / body: Manrope
- Hero parallax is mouse-lerp only. Section reveals use IntersectionObserver (10% threshold, 0.8s ease-out-cubic)
- ICF is not named on the site; that work is described as a global coaching federation pending clearance
