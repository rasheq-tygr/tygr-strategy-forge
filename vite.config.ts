import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  BOOK_RATE_MAX,
  BOOK_RATE_WINDOW_MS,
  MAX_CONTENT_BYTES,
  MAX_UPLOAD_BYTES,
  createRateLimiter,
  googleClaimsValid,
  imageExtFromMagic,
  isIsoZulu,
  parseAllowedEmails,
  resolveBookingTypeId,
  sanitizeBooking,
  sanitizeBookingType,
  sanitizeTimeslot,
  secretEquals,
} from "./src/lib/security";

const root = path.dirname(fileURLToPath(import.meta.url));

function readEnvPassword(mode: string) {
  const env = loadEnv(mode, root, "");
  return env.EDIT_PASSWORD || "";
}

function readTidyCalConfig(mode: string) {
  const env = loadEnv(mode, root, "");
  return {
    token: env.TIDYCAL_TOKEN || "",
    bookingTypeId: env.TIDYCAL_BOOKING_TYPE_ID || "",
  };
}

const isoZulu = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

// Business-day window for synthetic availability, in UTC. ~9:00 AM–5:00 PM ET.
const MOCK_DAY_START_UTC_MIN = 13 * 60;
const MOCK_DAY_END_UTC_MIN = 21 * 60;

/**
 * Synthetic timeslots so the booking UI is testable locally without a token.
 * Emits slots at the booking type's real cadence (every `durationMin`) across a
 * full business day so the preview looks like genuine availability rather than a
 * handful of on-the-hour times.
 */
function mockTimeslots(startsAt: string, endsAt: string, durationMin = 30) {
  const out: { starts_at: string; ends_at: string; available_bookings: number }[] = [];
  const end = new Date(endsAt);
  const now = Date.now();
  const cursor = new Date(Math.max(new Date(startsAt).getTime(), now));
  cursor.setUTCHours(0, 0, 0, 0);
  const step = Math.max(15, durationMin);
  for (let d = new Date(cursor); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
    for (let mins = MOCK_DAY_START_UTC_MIN; mins + durationMin <= MOCK_DAY_END_UTC_MIN; mins += step) {
      const s = new Date(midnight + mins * 60000);
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

// Mirrors the real "TYGR Ventures 30 Minute Intro" booking type (id 2074091,
// Google Meet) so the preview fallback shows the correct event when TidyCal is
// unreachable. Booking type id is overridden with the configured id at runtime.
const MOCK_BOOKING_TYPE = {
  id: 2074091,
  title: "TYGR Ventures 30 Minute Intro",
  duration_minutes: 30,
  padding_minutes: 0,
  url_slug: "tygr-ventures-30-minute-intro",
  description: "A 30-minute intro over Google Meet to talk through your constraint and whether the studio is a fit.",
  price: 0,
  currency_code: "USD",
  private: false,
  url: "https://tidycal.com/rasheq/tygr-ventures-30-minute-intro",
  booking_page_url: "https://tidycal.com/rasheq/tygr-ventures-30-minute-intro",
  locations: [{ location_option: "Google Meet", location_link_source: "google_meet" }],
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
  const allowed = parseAllowedEmails(env.GOOGLE_ALLOWED_EMAILS || env.VITE_GOOGLE_ALLOWED_EMAILS || "");
  return { clientId, allowed };
}

/**
 * Verify a Google ID token during local dev. Always uses Google's tokeninfo
 * endpoint (POST). Unsigned JWTs and missing client IDs fail closed.
 */
async function verifyGoogleTokenDev(
  token: string,
  cfg: { clientId: string; allowed: string[] },
): Promise<boolean> {
  if (!token || !cfg.clientId || cfg.allowed.length === 0) return false;
  try {
    const res = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ id_token: token }).toString(),
    });
    if (!res.ok) return false;
    const claims = (await res.json()) as Record<string, unknown>;
    return googleClaimsValid(claims, cfg.clientId, cfg.allowed);
  } catch {
    return false;
  }
}

function readJsonBody(req: import("http").IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c) => {
      const buf = Buffer.from(c);
      size += buf.length;
      if (size > MAX_CONTENT_BYTES) {
        reject(new Error("payload too large"));
        return;
      }
      chunks.push(buf);
    });
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
  const allowBook = createRateLimiter(BOOK_RATE_MAX, BOOK_RATE_WINDOW_MS);

  const authorize = async (req: import("http").IncomingMessage) => {
    if (google.clientId) {
      const googleToken = String(req.headers["x-google-token"] || "");
      return googleToken !== "" && (await verifyGoogleTokenDev(googleToken, google));
    }
    const header = String(req.headers["x-edit-password"] || "");
    return secretEquals(header, password);
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
          const previewRaw = configuredType
            ? { ...MOCK_BOOKING_TYPE, id: Number(configuredType) || MOCK_BOOKING_TYPE.id }
            : MOCK_BOOKING_TYPE;
          const previewBookingType = sanitizeBookingType(previewRaw);

          if (req.method === "GET" && query.get("action") === "booking-types") {
            if (tidycal.token) {
              const r = await tidyCalReal(tidycal.token, "GET", "/booking-types");
              if (r.status === 502) {
                return json(res, 200, { ok: true, mock: true, data: previewBookingType ? [previewBookingType] : [] });
              }
              const items = Array.isArray((r.data as { data?: unknown }).data)
                ? ((r.data as { data: Record<string, unknown>[] }).data)
                : [];
              const clean = items
                .map((item) => sanitizeBookingType(item))
                .filter((item): item is NonNullable<typeof item> => item !== null)
                .filter((item) => !configuredType || String(item.id) === configuredType);
              return json(res, r.status || 502, { ok: r.status === 200, data: clean });
            }
            return json(res, 200, { ok: true, mock: true, data: previewBookingType ? [previewBookingType] : [] });
          }

          if (req.method === "GET" && query.get("action") === "timeslots") {
            const typeId = resolveBookingTypeId(query.get("booking_type_id") || "", configuredType);
            const startsAt = query.get("starts_at") || "";
            const endsAt = query.get("ends_at") || "";
            if (!typeId || !isIsoZulu(startsAt) || !isIsoZulu(endsAt)) {
              return json(res, 400, { ok: false, error: "Missing or invalid booking_type_id, starts_at or ends_at" });
            }
            if (tidycal.token) {
              const qs = new URLSearchParams({ starts_at: startsAt, ends_at: endsAt }).toString();
              const r = await tidyCalReal(tidycal.token, "GET", `/booking-types/${typeId}/timeslots?${qs}`);
              if (r.status === 502) {
                return json(res, 200, {
                  ok: true,
                  mock: true,
                  data: mockTimeslots(startsAt, endsAt, MOCK_BOOKING_TYPE.duration_minutes),
                });
              }
              const slots = Array.isArray((r.data as { data?: unknown }).data)
                ? ((r.data as { data: Record<string, unknown>[] }).data)
                : [];
              const clean = slots
                .map((slot) => sanitizeTimeslot(slot))
                .filter((slot): slot is NonNullable<typeof slot> => slot !== null);
              return json(res, r.status || 502, { ok: r.status === 200, data: clean });
            }
            return json(res, 200, {
              ok: true,
              mock: true,
              data: mockTimeslots(startsAt, endsAt, MOCK_BOOKING_TYPE.duration_minutes),
            });
          }

          if (req.method === "POST") {
            const ip = req.socket.remoteAddress || "0.0.0.0";
            if (!allowBook(ip)) {
              return json(res, 429, { ok: false, error: "Too many booking attempts. Please wait and try again." });
            }
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse((await readJsonBody(req)) || "{}") as Record<string, unknown>;
            } catch {
              return json(res, 400, { ok: false, error: "Invalid JSON" });
            }
            if (input.action !== "book") return json(res, 400, { ok: false, error: "Unsupported action" });
            const typeId = resolveBookingTypeId(String(input.booking_type_id ?? ""), configuredType);
            const startsAt = String(input.starts_at ?? "");
            const name = String(input.name ?? "").trim();
            const email = String(input.email ?? "").trim();
            const phone = String(input.phone ?? "").trim();
            const timezone = String(input.timezone ?? "UTC");
            if (!typeId || !isIsoZulu(startsAt) || !name || !phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
              return json(res, 422, { ok: false, error: "Name, a valid email, a phone number and a time slot are required." });
            }
            if (tidycal.token) {
              const bookedName = phone ? `${name} (${phone})`.slice(0, 191) : name.slice(0, 191);
              const r = await tidyCalReal(tidycal.token, "POST", `/booking-types/${typeId}/bookings`, {
                starts_at: startsAt,
                name: bookedName,
                email: email.slice(0, 191),
                phone_number: phone.slice(0, 40),
                timezone: timezone.slice(0, 64),
              });
              if (r.status === 201) {
                let booking = sanitizeBooking(((r.data as { data?: Record<string, unknown> }).data ?? null) as Record<string, unknown> | null);
                if (booking && !booking.meeting_url) {
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                  const follow = await tidyCalReal(tidycal.token, "GET", `/bookings/${booking.id}`);
                  const fresh = sanitizeBooking((follow.data as { data?: Record<string, unknown> }).data ?? null);
                  if (fresh?.meeting_url) booking = fresh;
                }
                return json(res, 201, { ok: true, data: booking });
              }
              if (r.status === 409) return json(res, 409, { ok: false, error: "That time was just taken. Please pick another slot." });
              if (r.status !== 502) {
                return json(res, r.status, { ok: false, error: String((r.data as { message?: unknown }).message ?? "Could not create the booking.") });
              }
            }
            const start = new Date(startsAt);
            return json(res, 201, {
              ok: true,
              mock: true,
              data: sanitizeBooking({
                id: Math.floor(Math.random() * 1e6),
                booking_type_id: Number(typeId) || typeId,
                starts_at: isoZulu(start),
                ends_at: isoZulu(new Date(start.getTime() + MOCK_BOOKING_TYPE.duration_minutes * 60000)),
                timezone,
                meeting_url: "https://meet.google.com/mock-preview",
              }),
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
            const serialized = `${JSON.stringify(content, null, 2)}\n`;
            if (Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES) {
              return json(res, 413, { ok: false, error: "Payload too large" });
            }
            await writeFile(contentFile, serialized, "utf8");
            return json(res, 200, { ok: true });
          } catch (err) {
            if (err instanceof Error && err.message === "payload too large") {
              return json(res, 413, { ok: false, error: "Payload too large" });
            }
            return json(res, 400, { ok: false, error: "Invalid JSON" });
          }
        }
        if (req.method === "POST" && url === "/api/upload.php") {
          if (!(await authorize(req))) return json(res, 401, { ok: false, error: "Not authorized" });
          try {
            const chunks: Buffer[] = [];
            let size = 0;
            await new Promise<void>((resolve, reject) => {
              req.on("data", (c) => {
                const buf = Buffer.from(c);
                size += buf.length;
                if (size > MAX_UPLOAD_BYTES) {
                  reject(new Error("too large"));
                  return;
                }
                chunks.push(buf);
              });
              req.on("end", () => resolve());
              req.on("error", reject);
            });
            const ctype = String(req.headers["content-type"] || "");
            const boundary = ctype.match(/boundary=(.*)$/)?.[1];
            if (!boundary) return json(res, 400, { ok: false, error: "Expected multipart upload" });
            const files = parseMultipart(Buffer.concat(chunks), boundary);
            const file = files[0];
            if (!file) return json(res, 400, { ok: false, error: "No file" });
            if (file.data.length > MAX_UPLOAD_BYTES) return json(res, 400, { ok: false, error: "File too large" });
            const sniffed = imageExtFromMagic(file.data);
            if (!sniffed) return json(res, 400, { ok: false, error: "Unsupported file type" });
            if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
            const safe = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${sniffed}`;
            await writeFile(path.join(uploadDir, safe), file.data);
            return json(res, 200, { ok: true, url: `/uploads/${safe}` });
          } catch (err) {
            if (err instanceof Error && err.message === "too large") {
              return json(res, 400, { ok: false, error: "File too large" });
            }
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
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
}));
