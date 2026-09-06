const PASS_KEY = "tygr.edit.password";

export function getStoredPassword() {
  return sessionStorage.getItem(PASS_KEY) || "";
}

export function storePassword(password: string) {
  sessionStorage.setItem(PASS_KEY, password);
}

export function clearPassword() {
  sessionStorage.removeItem(PASS_KEY);
}

export function authHeaders(password = getStoredPassword()): HeadersInit {
  return { "X-Edit-Password": password };
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth.php", {
      method: "POST",
      headers: { ...authHeaders(password), "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return true;
    if (res.status !== 404 && res.status !== 405) return false;
  } catch {
    // Fall through to local preview fallback.
  }
  const local = import.meta.env.VITE_EDIT_PASSWORD;
  return Boolean(local) && password === local;
}

export async function saveContent(content: unknown, password = getStoredPassword()) {
  const res = await fetch("/api/save.php", {
    method: "POST",
    headers: { ...authHeaders(password), "Content-Type": "application/json" },
    body: JSON.stringify({ content, password }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Save failed");
  }
}

export async function uploadImage(file: File, password = getStoredPassword()) {
  const body = new FormData();
  body.append("file", file);
  body.append("password", password);
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
  if (!path) return "";
  return `https://tidycal.com/${path.replace(/^\/+/, "")}`;
}

/**
 * Resolve the "Book a call" destination. Priority: explicit bookingUrl override,
 * then the TidyCal hosted page, then a build-time fallback, then email.
 */
export function bookingHref(contact: BookingContact) {
  if (contact.bookingUrl) return contact.bookingUrl;
  const tidycal = tidycalUrl(contact.tidycalPath);
  if (tidycal) return tidycal;
  return (import.meta.env.VITE_BOOKING_URL as string) || `mailto:${contact.email}`;
}
