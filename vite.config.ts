import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

function readEnvPassword(mode: string) {
  const env = loadEnv(mode, root, "");
  return env.EDIT_PASSWORD || env.VITE_EDIT_PASSWORD || "change-me";
}

function readTidyCalConfig(mode: string) {
  const env = loadEnv(mode, root, "");
  return {
    token: env.TIDYCAL_TOKEN || "",
    bookingTypeId: env.TIDYCAL_BOOKING_TYPE_ID || "",
  };
}

const isoZulu = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/** Synthetic timeslots so the booking UI is testable locally without a token. */
function mockTimeslots(startsAt: string, endsAt: string, durationMin = 30) {
  const out: { starts_at: string; ends_at: string; available_bookings: number }[] = [];
  const end = new Date(endsAt);
  const now = Date.now();
  const cursor = new Date(Math.max(new Date(startsAt).getTime(), now));
  cursor.setUTCHours(0, 0, 0, 0);
  for (let d = new Date(cursor); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const h of [15, 16, 17, 18, 19, 20]) {
      const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, 0, 0));
      if (s.getTime() < now + 2 * 3600 * 1000 || s > end) continue;
      out.push({
        starts_at: isoZulu(s),
        ends_at: isoZulu(new Date(s.getTime() + durationMin * 60000)),
        available_bookings: 1,
      });
    }
  }
  return out;
}

const MOCK_BOOKING_TYPE = {
  id: 999001,
  title: "Discovery call",
  duration_minutes: 30,
  padding_minutes: 0,
  url_slug: "discovery-call",
  description: "A 30-minute intro call to talk through your constraint and whether the studio fits.",
  price: 0,
  currency_code: "USD",
  private: false,
  url: "https://tidycal.com/rasheqrahman/discovery-call",
};

/** Call the real TidyCal API from the dev server (token stays server-side). */
async function tidyCalReal(
  token: string,
  method: string,
  apiPath: string,
  body?: unknown,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(`https://tidycal.com/api${apiPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
    return { status: res.status, data };
  } catch {
    return { status: 502, data: { error: "TidyCal request failed" } };
  }
}

function readGoogleConfig(mode: string) {
  const env = loadEnv(mode, root, "");
  const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || "";
  const allowed = (env.GOOGLE_ALLOWED_EMAILS || env.VITE_GOOGLE_ALLOWED_EMAILS || "rasheq@tygrventures.com")
    .split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return { clientId, allowed };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Verify a Google ID token during local dev. When a client ID is configured we
 * validate against Google's tokeninfo endpoint (mirroring the PHP host). With no
 * client ID we decode-and-allowlist so a token can be simulated offline.
 */
async function verifyGoogleTokenDev(
  token: string,
  cfg: { clientId: string; allowed: string[] },
): Promise<boolean> {
  if (!token) return false;

  const emailAllowed = (email: unknown) => {
    if (typeof email !== "string") return false;
    return cfg.allowed.length === 0 || cfg.allowed.includes(email.toLowerCase());
  };

  if (cfg.clientId) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
      if (!res.ok) return false;
      const claims = (await res.json()) as Record<string, unknown>;
      const verified = claims.email_verified === true || claims.email_verified === "true";
      const audOk = !cfg.clientId || claims.aud === cfg.clientId;
      const notExpired = typeof claims.exp !== "number" || claims.exp * 1000 > Date.now();
      return verified && audOk && notExpired && emailAllowed(claims.email);
    } catch {
      return false;
    }
  }

  const claims = decodeJwtPayload(token);
  if (!claims) return false;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  const notExpired = typeof claims.exp !== "number" || claims.exp * 1000 > Date.now();
  return verified && notExpired && emailAllowed(claims.email);
}

function readJsonBody(req: import("http").IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseMultipart(body: Buffer, boundary: string) {
  const parts = body.toString("latin1").split(`--${boundary}`);
  const files: { filename: string; data: Buffer }[] = [];
  for (const part of parts) {
    if (!part.includes("Content-Disposition")) continue;
    const nameMatch = part.match(/filename="([^"]+)"/);
    if (!nameMatch) continue;
    const idx = part.indexOf("\r\n\r\n");
    if (idx === -1) continue;
    const raw = part.slice(idx + 4).replace(/\r\n$/, "");
    files.push({
      filename: path.basename(nameMatch[1]),
      data: Buffer.from(raw, "latin1"),
    });
  }
  return files;
}

function hostingerDevApi(mode: string): Plugin {
  const password = readEnvPassword(mode);
  const tidycal = readTidyCalConfig(mode);
  const google = readGoogleConfig(mode);
  const contentFile = path.join(root, "public", "content.json");
  const uploadDir = path.join(root, "public", "uploads");

  const authorize = async (req: import("http").IncomingMessage) => {
    const googleToken = String(req.headers["x-google-token"] || "");
    if (googleToken && (await verifyGoogleTokenDev(googleToken, google))) return true;
    const header = String(req.headers["x-edit-password"] || "");
    return header === password;
  };

  const json = (res: import("http").ServerResponse, status: number, data: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  return {
    name: "tygr-hostinger-dev-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        const query = new URLSearchParams(req.url?.split("?")[1] || "");

        if (url === "/api/tidycal.php") {
          const configuredType = tidycal.bookingTypeId;
          const resolveType = (requested: string) => (configuredType ? configuredType : requested);

          if (req.method === "GET" && query.get("action") === "booking-types") {
            if (tidycal.token) {
              const r = await tidyCalReal(tidycal.token, "GET", "/booking-types");
              let items = Array.isArray((r.data as { data?: unknown }).data)
                ? ((r.data as { data: Record<string, unknown>[] }).data)
                : [];
              if (configuredType) items = items.filter((b) => String(b.id) === configuredType);
              return json(res, r.status || 502, { ok: r.status === 200, data: items });
            }
            return json(res, 200, { ok: true, mock: true, data: [MOCK_BOOKING_TYPE] });
          }

          if (req.method === "GET" && query.get("action") === "timeslots") {
            const typeId = resolveType(query.get("booking_type_id") || "");
            const startsAt = query.get("starts_at") || "";
            const endsAt = query.get("ends_at") || "";
            if (!typeId || !startsAt || !endsAt) {
              return json(res, 400, { ok: false, error: "Missing booking_type_id, starts_at or ends_at" });
            }
            if (tidycal.token) {
              const qs = new URLSearchParams({ starts_at: startsAt, ends_at: endsAt }).toString();
              const r = await tidyCalReal(tidycal.token, "GET", `/booking-types/${typeId}/timeslots?${qs}`);
              return json(res, r.status || 502, { ok: r.status === 200, data: (r.data as { data?: unknown }).data ?? [] });
            }
            return json(res, 200, { ok: true, mock: true, data: mockTimeslots(startsAt, endsAt, MOCK_BOOKING_TYPE.duration_minutes) });
          }

          if (req.method === "POST") {
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse((await readJsonBody(req)) || "{}") as Record<string, unknown>;
            } catch {
              return json(res, 400, { ok: false, error: "Invalid JSON" });
            }
            if (input.action !== "book") return json(res, 400, { ok: false, error: "Unsupported action" });
            const typeId = resolveType(String(input.booking_type_id ?? ""));
            const startsAt = String(input.starts_at ?? "");
            const name = String(input.name ?? "").trim();
            const email = String(input.email ?? "").trim();
            const phone = String(input.phone ?? "").trim();
            const timezone = String(input.timezone ?? "UTC");
            if (!typeId || !startsAt || !name || !phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
              return json(res, 422, { ok: false, error: "Name, a valid email, a phone number and a time slot are required." });
            }
            if (tidycal.token) {
              // TidyCal's public API has no field for a booker phone on video booking
              // types, so append it to the name — the one free-text channel it stores
              // and shows on the booking, calendar event, and host notification.
              const bookedName = phone ? `${name} (${phone})`.slice(0, 191) : name.slice(0, 191);
              const r = await tidyCalReal(tidycal.token, "POST", `/booking-types/${typeId}/bookings`, {
                starts_at: startsAt,
                name: bookedName,
                email: email.slice(0, 191),
                phone_number: phone.slice(0, 40),
                timezone: timezone.slice(0, 191),
              });
              if (r.status === 201) return json(res, 201, { ok: true, data: (r.data as { data?: unknown }).data ?? null });
              if (r.status === 409) return json(res, 409, { ok: false, error: "That time was just taken. Please pick another slot." });
              return json(res, r.status || 502, { ok: false, error: String((r.data as { message?: unknown }).message ?? "Could not create the booking.") });
            }
            const start = new Date(startsAt);
            return json(res, 201, {
              ok: true,
              mock: true,
              data: {
                id: Math.floor(Math.random() * 1e6),
                booking_type_id: Number(typeId) || typeId,
                starts_at: isoZulu(start),
                ends_at: isoZulu(new Date(start.getTime() + MOCK_BOOKING_TYPE.duration_minutes * 60000)),
                timezone,
                meeting_url: "https://meet.tidycal.example/mock-room",
                contact: { name, email, phone_number: phone, timezone },
              },
            });
          }

          return json(res, 400, { ok: false, error: "Unsupported request" });
        }

        if (req.method === "POST" && url === "/api/auth.php") {
          if (!(await authorize(req))) return json(res, 401, { ok: false, error: "Not authorized" });
          return json(res, 200, { ok: true });
        }
        if (req.method === "POST" && url === "/api/save.php") {
          if (!(await authorize(req))) return json(res, 401, { ok: false, error: "Not authorized" });
          try {
            const raw = await readJsonBody(req);
            const parsed = JSON.parse(raw) as { content?: unknown };
            const content = parsed.content ?? parsed;
            await writeFile(contentFile, `${JSON.stringify(content, null, 2)}\n`, "utf8");
            return json(res, 200, { ok: true });
          } catch {
            return json(res, 400, { ok: false, error: "Invalid JSON" });
          }
        }
        if (req.method === "POST" && url === "/api/upload.php") {
          if (!(await authorize(req))) return json(res, 401, { ok: false, error: "Not authorized" });
          try {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              req.on("data", (c) => chunks.push(Buffer.from(c)));
              req.on("end", () => resolve());
              req.on("error", reject);
            });
            const ctype = String(req.headers["content-type"] || "");
            const boundary = ctype.match(/boundary=(.*)$/)?.[1];
            if (!boundary) return json(res, 400, { ok: false, error: "Expected multipart upload" });
            const files = parseMultipart(Buffer.concat(chunks), boundary);
            const file = files[0];
            if (!file) return json(res, 400, { ok: false, error: "No file" });
            const ext = path.extname(file.filename).toLowerCase();
            const allowed = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"]);
            if (!allowed.has(ext)) return json(res, 400, { ok: false, error: "Unsupported file type" });
            if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
            const safe = `${Date.now()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, "")}`;
            await writeFile(path.join(uploadDir, safe), file.data);
            return json(res, 200, { ok: true, url: `/uploads/${safe}` });
          } catch {
            return json(res, 500, { ok: false, error: "Upload failed" });
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), hostingerDevApi(mode)],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
}));
