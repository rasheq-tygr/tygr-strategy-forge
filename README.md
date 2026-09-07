# TYGR Ventures

Marketing site for [tygrventures.com](https://tygrventures.com): a Vite + React + TypeScript static build with a scroll-driven ecosystem, cream / navy / orange design system, and server-verified inline editing.

The server does **not** need Node at runtime. Hostinger serves the built files from `public_html`. A small PHP endpoint writes `content.json` when you save edits.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Open the printed local URL. The local editor password is `EDIT_PASSWORD` in `.env` (default `local-dev-only`). It is checked only by the Vite mock — it is never inlined into the client bundle.

- Public site: `/`
- Editors: `/admin` (blog, case studies, capabilities)
- Inline edit: unlock via `/admin`, then click outlined copy on any page
- Save: the floating **Save to host** control, or Save in `/admin`

`npm run dev` mocks `/api/auth.php`, `/api/save.php`, `/api/upload.php`, and `/api/tidycal.php` so saves write `public/content.json` without PHP.

## Stack

- Vite 7, React 19, TypeScript, React Router
- Copy source of truth: `public/content.json` (fetched at runtime so Hostinger edits persist)
- Media: local upload to `/uploads` (raster images only) or Unsplash search (optional `VITE_UNSPLASH_ACCESS_KEY`)
- Logo: geometric tiger placeholder SVG — replace when the SoftRiver lockup is ready

## Editor sign-in

The editor is verified server-side by the PHP `/api/*.php` endpoints (and by the dev mock during `npm run dev`).

### Google Sign-In (production)

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add **Authorized JavaScript origins**: `http://localhost:5173` (dev) and `https://tygrventures.com` (prod).
3. Copy the **Client ID** into:
   - `.env`: `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (dev mock)
   - Hostinger `api/config.php`: `google_client_id`
4. Set the allowlist of editor accounts:
   - `.env`: `VITE_GOOGLE_ALLOWED_EMAILS` / `GOOGLE_ALLOWED_EMAILS`
   - Hostinger `api/config.php`: `google_allowed_emails`

When `GOOGLE_CLIENT_ID` is set, password login is disabled. The ID token is verified with Google's `tokeninfo` endpoint (POST) and must match the allowlist. An empty allowlist denies every account.

### Edit password (local / when Google is not configured)

| Where | What to set |
| --- | --- |
| Local `.env` | `EDIT_PASSWORD` (server-side only — never `VITE_EDIT_PASSWORD`) |
| Hostinger | Copy `public/api/config.sample.php` → `api/config.php` and set a unique `edit_password` of at least 16 characters |

Never commit `api/config.php` or a real production password. PHP rejects empty passwords, placeholders (`change-me`, `local-dev-only`), and secrets shorter than 16 characters.

## Hostinger deploy

1. `npm run build` — output is `dist/`.
2. Upload **the contents of `dist/`** into `public_html` (not the `dist` folder itself).
3. Confirm these landed at the web root:
   - `index.html`, `assets/`, `.htaccess`
   - `content.json`
   - `api/auth.php`, `api/save.php`, `api/upload.php`, `api/tidycal.php`, `api/lib.php`, `api/config.sample.php`
   - `uploads/` (writable by PHP, mode `755` or `775`)
4. On the host, copy `api/config.sample.php` to `api/config.php`. Set `google_client_id` + `google_allowed_emails`, **or** a strong unique `edit_password` (16+ characters). Do not leave the sample defaults.
5. Apache should already honor `.htaccess` (SPA fallback to `index.html` while real files like PHP and JSON still win).
6. Visit `https://tygrventures.com/admin`, unlock, edit, save. Confirm `content.json` updates on disk.

If saves fail, check that `public_html/content.json` and `public_html/uploads` are writable by the PHP user, and that Google Sign-In (or the password in `api/config.php`) matches what you use.

## Unsplash

Create a free app at [unsplash.com/developers](https://unsplash.com/developers) and put the Access Key in `.env` as `VITE_UNSPLASH_ACCESS_KEY`. Rebuild for production so the key is available in the admin media picker. Uploads work without Unsplash.

## Booking CTA

The contact section books through `/api/tidycal.php` (server-side TidyCal token). Set `TIDYCAL_TOKEN` and `TIDYCAL_BOOKING_TYPE_ID` in `.env` / `api/config.php`. **Book a call** buttons fall back to the hosted TidyCal page (`contact.tidycalPath`) or `mailto:`.

## Design notes

- Palette: cream `#f5f3ef`, navy `#0a0f1a`, orange `#eb8400`
- Display: Playfair Display. UI / body: Manrope
- Hero parallax is mouse-lerp only. Section reveals use IntersectionObserver (10% threshold, 0.8s ease-out-cubic)
- ICF is not named on the site; that work is described as a global coaching federation pending clearance
