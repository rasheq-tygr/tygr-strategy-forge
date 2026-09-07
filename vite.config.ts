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
  const contentFile = path.join(root, "public", "content.json");
  const uploadDir = path.join(root, "public", "uploads");

  const authorize = (req: import("http").IncomingMessage) => {
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
          if (!authorize(req)) return json(res, 401, { ok: false, error: "Invalid password" });
          return json(res, 200, { ok: true });
        }
        if (req.method === "POST" && url === "/api/save.php") {
          if (!authorize(req)) return json(res, 401, { ok: false, error: "Invalid password" });
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
          if (!authorize(req)) return json(res, 401, { ok: false, error: "Invalid password" });
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
