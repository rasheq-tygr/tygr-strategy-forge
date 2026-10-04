export type GoogleIdentity = {
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
};

/** Decode the payload of a Google ID token (JWT) without verifying its signature. */
export function decodeIdToken(token: string): GoogleIdentity | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const payload = JSON.parse(json) as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return null;
    return {
      email: email.toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      aud: typeof payload.aud === "string" ? payload.aud : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
      nonce: typeof payload.nonce === "string" ? payload.nonce : undefined,
    };
  } catch {
    return null;
  }
}

export function googleClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
}

const NONCE_KEY = "tygr.google.nonce";
const GIS_SRC = "https://accounts.google.com/gsi/client";
let consumedRedirect: { token: string; error: string } | null = null;

export type GoogleCredentialResponse = { credential?: string };

type GoogleIdConfig = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  ux_mode?: "popup" | "redirect";
};

type GoogleButtonOptions = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  width?: number;
  logo_alignment?: "left" | "center";
};

type GoogleAccountsId = {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<GoogleAccountsId> | null = null;

/** Official Google button. It checks the JavaScript origin and does not send a redirect URI. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity requires a browser"));
  }
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const finish = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google Identity failed to initialise"));
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity")), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function beginGoogleNonce(): string {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE_KEY, nonce);
  return nonce;
}

export function currentGoogleNonce(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(NONCE_KEY);
}

/** Live Hostinger `api/config.php` wins over the value baked into the JS bundle. */
export async function resolveGoogleClientId(): Promise<string> {
  const baked = googleClientId();
  try {
    const res = await fetch("/api/google.php", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { google_client_id?: unknown };
      const fromHost = typeof data.google_client_id === "string" ? data.google_client_id.trim() : "";
      if (fromHost) return fromHost;
    }
  } catch {
    // Static preview / missing PHP: use the Vite env fallback.
  }
  return baked;
}

export function googleOauthErrorMessage(error: string): string {
  if (error === "redirect_uri_mismatch") {
    return "Google rejected the sign-in request. Use the Google button on this page, and in Google Cloud Console add this site under Authorized JavaScript origins.";
  }
  if (error === "access_denied") return "Google sign-in was cancelled.";
  if (error === "nonce_mismatch") return "Google sign-in could not be verified. Please try again.";
  return error ? `Google sign-in failed (${error}).` : "Google sign-in failed.";
}

/** The returned ID token must carry the nonce this tab stored before redirecting. */
export function redirectNonceMatches(tokenNonce: string | undefined, expected: string | null): boolean {
  return Boolean(expected && tokenNonce && tokenNonce === expected);
}

function takeStoredNonce(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const expected = sessionStorage.getItem(NONCE_KEY);
  sessionStorage.removeItem(NONCE_KEY);
  return expected;
}

/** Read an OAuth redirect once (id_token lives in the URL hash). */
export function consumeGoogleRedirect(): { token: string; error: string } {
  if (consumedRedirect) return consumedRedirect;
  if (typeof window === "undefined") {
    consumedRedirect = { token: "", error: "" };
    return consumedRedirect;
  }
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get("error") || query.get("error") || "";
  const token = hash.get("id_token") || "";
  if (token || error) {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  if (token) {
    const expected = takeStoredNonce();
    const identity = decodeIdToken(token);
    if (!identity || !redirectNonceMatches(identity.nonce, expected)) {
      consumedRedirect = { token: "", error: "nonce_mismatch" };
      return consumedRedirect;
    }
  }
  consumedRedirect = { token, error };
  return consumedRedirect;
}

