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
