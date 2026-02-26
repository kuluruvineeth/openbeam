import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type pino from "pino";
import type { DownloadTokenStore } from "../file-download/token-store.js";

type FilesRouteOptions = {
  downloadTokenStore: DownloadTokenStore;
  logger: pino.Logger;
};

export function createFilesRoutes({
  downloadTokenStore,
  logger,
}: FilesRouteOptions): Hono {
  const app = new Hono();

  app.get("/api/files/download", async (c) => {
    const tokenRaw = c.req.query("token");
    const token = tokenRaw?.trim() || null;

    if (!token) {
      return c.json({ error: "Missing download token" }, 400);
    }

    const entry = downloadTokenStore.consumeToken(token);
    if (!entry) {
      return c.json({ error: "Invalid or expired token" }, 403);
    }

    try {
      const fileStats = await stat(entry.absolutePath);
      if (!fileStats.isFile()) {
        return c.json({ error: "File not found" }, 404);
      }
    } catch {
      return c.json({ error: "File not found" }, 404);
    }

    const safeFileName = entry.fileName.replace(/["\r\n]/g, "_");
    c.header("Content-Type", entry.mimeType);
    c.header("Content-Disposition", `attachment; filename="${safeFileName}"`);
    c.header("Content-Length", entry.size.toString());

    return stream(c, async (s) => {
      const readable = createReadStream(entry.absolutePath);
      try {
        for await (const chunk of readable) {
          await s.write(chunk as Uint8Array);
        }
      } catch (err) {
        logger.error({ err }, "Failed to stream download");
      }
    });
  });

  return app;
}
