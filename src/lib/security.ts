/** Shared security helpers used by the Vite dev mock and unit tests. */

export const PLACEHOLDER_PASSWORDS = new Set(["change-me", "local-dev-only"]);
export const MIN_PRODUCTION_PASSWORD_LENGTH = 16;
export const MAX_CONTENT_BYTES = 512_000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const BOOK_RATE_MAX = 8;
export const BOOK_RATE_WINDOW_MS = 10 * 60 * 1000;

const ALLOWED_UPLOAD_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const ISO_ZULU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DIGITS = /^\d+$/;
const GOOGLE_ISS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export function isPlaceholderPassword(password: string): boolean {
  return password === "" || PLACEHOLDER_PASSWORDS.has(password);
}

/** Production PHP rejects placeholders and short secrets. Vite may allow a local .env password. */
export function isProductionPasswordUsable(password: string): boolean {
  return !isPlaceholderPassword(password) && password.length >= MIN_PRODUCTION_PASSWORD_LENGTH;
}

export function secretEquals(given: string, expected: string): boolean {
  if (expected === "" || given.length !== expected.length) return false;
  let out = 0;
  for (let i = 0; i < expected.length; i += 1) {
    out |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return out === 0;
}

export function isDigitId(value: string): boolean {
  return DIGITS.test(value);
}

export function resolveBookingTypeId(requested: string, configured: string): string | null {
  if (configured !== "") return isDigitId(configured) ? configured : null;
  return isDigitId(requested) ? requested : null;
}

export function isIsoZulu(value: string): boolean {
  return ISO_ZULU.test(value);
}

export function isAllowedUploadExt(ext: string): boolean {
  return ALLOWED_UPLOAD_EXT.has(ext.toLowerCase());
}

export function parseAllowedEmails(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Empty allowlist denies every account (fail closed). */
export function emailOnAllowlist(email: string, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}

export function googleIssuerOk(iss: unknown): boolean {
  return typeof iss === "string" && GOOGLE_ISS.has(iss);
}

export function googleClaimsValid(
  claims: Record<string, unknown>,
  clientId: string,
  allowed: string[],
  nowMs = Date.now(),
): boolean {
  if (!clientId || allowed.length === 0) return false;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  const audOk = claims.aud === clientId;
  const exp = typeof claims.exp === "number" ? claims.exp * 1000 : 0;
  const email = typeof claims.email === "string" ? claims.email : "";
  return Boolean(
    verified && audOk && googleIssuerOk(claims.iss) && exp > nowMs && emailOnAllowlist(email, allowed),
  );
}

export function tidycalHostedPath(path?: string): string {
  if (!path) return "";
  const cleaned = path.replace(/^\/+/, "");
  if (!/^[a-zA-Z0-9/_-]+$/.test(cleaned)) return "";
  return `https://tidycal.com/${cleaned}`;
}

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  return /^(https?:|mailto:|tel:|\/|#)/i.test(trimmed);
}

export function safeHref(href: string | undefined | null): string {
  if (!href || !isSafeHref(href)) return "";
  return href.trim();
}

export function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

type LocationBits = { location_option?: unknown; location_link_source?: unknown };

export function sanitizeBookingType(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  const id = raw.id;
  const idNum = typeof id === "number" ? id : typeof id === "string" && isDigitId(id) ? Number(id) : NaN;
  if (!Number.isFinite(idNum)) return null;
  const locations = Array.isArray(raw.locations)
    ? raw.locations
        .filter((item): item is LocationBits => Boolean(item) && typeof item === "object")
        .map((item) => ({
          location_option: typeof item.location_option === "string" ? item.location_option : "",
          location_link_source: typeof item.location_link_source === "string" ? item.location_link_source : "",
        }))
    : [];
  return {
    id: idNum,
    title: typeof raw.title === "string" ? raw.title : "",
    duration_minutes: typeof raw.duration_minutes === "number" ? raw.duration_minutes : 0,
    description: typeof raw.description === "string" ? raw.description : "",
    url_slug: typeof raw.url_slug === "string" ? raw.url_slug : "",
    price: typeof raw.price === "number" ? raw.price : 0,
    currency_code: typeof raw.currency_code === "string" ? raw.currency_code : "",
    locations,
  };
}

export function sanitizeTimeslot(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  const starts = typeof raw.starts_at === "string" ? raw.starts_at : "";
  const ends = typeof raw.ends_at === "string" ? raw.ends_at : "";
  if (!starts || !ends) return null;
  const available =
    typeof raw.available_bookings === "number" ? raw.available_bookings : Number(raw.available_bookings);
  return {
    starts_at: starts,
    ends_at: ends,
    available_bookings: Number.isFinite(available) ? available : 0,
  };
}

export function sanitizeBooking(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  const idRaw = raw.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : typeof idRaw === "string" && isDigitId(idRaw)
        ? Number(idRaw)
        : null;
  if (id === null) return null;
  return {
    id,
    starts_at: typeof raw.starts_at === "string" ? raw.starts_at : "",
    ends_at: typeof raw.ends_at === "string" ? raw.ends_at : "",
    timezone: typeof raw.timezone === "string" ? raw.timezone : "",
    meeting_url: safeHttpsUrl(raw.meeting_url),
  };
}

export function createRateLimiter(max = BOOK_RATE_MAX, windowMs = BOOK_RATE_WINDOW_MS) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()) => {
    const prev = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (prev.length >= max) {
      hits.set(key, prev);
      return false;
    }
    prev.push(now);
    hits.set(key, prev);
    return true;
  };
}

/** Detect image type from the first bytes. SVG and other scriptable types return null. */
export function imageExtFromMagic(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ".jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return ".png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return ".gif";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return ".webp";
  const box = String.fromCharCode(...bytes.slice(4, 8));
  const brand = String.fromCharCode(...bytes.slice(8, 12));
  if (box === "ftyp" && (brand === "avif" || brand === "avis")) return ".avif";
  return null;
}
