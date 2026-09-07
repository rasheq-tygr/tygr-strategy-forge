import { safeHref, tidycalHostedPath } from "./security";

const PASS_KEY = "tygr.edit.password";
const GOOGLE_KEY = "tygr.edit.google";

export function getStoredPassword() {
  return sessionStorage.getItem(PASS_KEY) || "";
}

export function storePassword(password: string) {
  sessionStorage.setItem(PASS_KEY, password);
}

export function clearPassword() {
  sessionStorage.removeItem(PASS_KEY);
}

export function getStoredGoogleToken() {
  return sessionStorage.getItem(GOOGLE_KEY) || "";
}

export function storeGoogleToken(token: string) {
  sessionStorage.setItem(GOOGLE_KEY, token);
}

export function clearGoogleToken() {
  sessionStorage.removeItem(GOOGLE_KEY);
}

/** Clear every stored editor credential (password + Google). */
export function clearCredentials() {
  clearPassword();
  clearGoogleToken();
}

export function authHeaders(
  password = getStoredPassword(),
  googleToken = getStoredGoogleToken(),
): HeadersInit {
  const headers: Record<string, string> = {};
  if (password) headers["X-Edit-Password"] = password;
  if (googleToken) headers["X-Google-Token"] = googleToken;
  return headers;
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth.php", {
      method: "POST",
      headers: { "X-Edit-Password": password, "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verify a Google ID token as an editor credential. The server (PHP tokeninfo /
 * dev mock) is the source of truth — the client never accepts an unsigned JWT.
 */
export async function verifyGoogleToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth.php", {
      method: "POST",
      headers: { "X-Google-Token": token, "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveContent(content: unknown, password = getStoredPassword()) {
  const res = await fetch("/api/save.php", {
    method: "POST",
    headers: { ...authHeaders(password), "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Save failed");
  }
}

export async function uploadImage(file: File, password = getStoredPassword()) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload.php", {
    method: "POST",
    headers: authHeaders(password),
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Upload failed");
  }
  return data.url;
}

type BookingContact = {
  bookingUrl?: string;
  tidycalPath?: string;
  email: string;
};

/** Full TidyCal hosted booking URL for a `username/booking-type` path. */
export function tidycalUrl(path?: string) {
  return tidycalHostedPath(path);
}

/**
 * Resolve the "Book a call" destination. Priority: explicit bookingUrl override,
 * then the TidyCal hosted page, then a build-time fallback, then email.
 */
export function bookingHref(contact: BookingContact) {
  const override = safeHref(contact.bookingUrl);
  if (override) return override;
  const tidycal = tidycalUrl(contact.tidycalPath);
  if (tidycal) return tidycal;
  const fallback = safeHref((import.meta.env.VITE_BOOKING_URL as string) || "");
  if (fallback) return fallback;
  return `mailto:${contact.email}`;
}
