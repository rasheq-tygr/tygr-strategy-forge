# TYGR Ventures

Marketing site for [tygrventures.com](https://tygrventures.com): a Vite + React + TypeScript static build with a scroll-driven ecosystem, cream / navy / orange design system, and password-gated inline editing.

The server does **not** need Node at runtime. Hostinger serves the built files from `public_html`. A small PHP endpoint writes `content.json` when you save edits.

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

## Hostinger deploy

1. `npm run build` — output is `dist/`.
2. Upload **the contents of `dist/`** into `public_html` (not the `dist` folder itself).
3. Confirm these landed at the web root:
   - `index.html`, `assets/`, `.htaccess`
   - `content.json`
   - `api/auth.php`, `api/save.php`, `api/upload.php`, `api/lib.php`, `api/config.sample.php`
   - `uploads/` (writable by PHP, mode `755` or `775`)
4. On the host, copy `api/config.sample.php` to `api/config.php` and set a strong `edit_password`.
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
