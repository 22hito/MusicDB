/** Маршрути локального сховища: імітація підписаних посилань S3 (лише розробка). Підтримує Range. */
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Hono } from "hono";
import type { AppEnv } from "../context";
import type { LocalStorage } from "./storage";

export function storageRoutes(storage: LocalStorage) {
  const r = new Hono<AppEnv>();

  r.put("/:token", async (c) => {
    const token = storage.verify(c.req.param("token"));
    if (token?.op !== "put") return c.json({ code: "invalid_token" }, 403);
    const path = storage.pathOf(token.k);
    await mkdir(dirname(path), { recursive: true });
    const body = c.req.raw.body;
    if (!body) return c.json({ code: "empty_body" }, 400);
    // biome-ignore lint/suspicious/noExplicitAny: web stream → node stream
    await pipeline(Readable.fromWeb(body as any), createWriteStream(path));
    return c.body(null, 200);
  });

  r.get("/:token", async (c) => {
    const token = storage.verify(c.req.param("token"));
    if (token?.op !== "get") return c.json({ code: "invalid_token" }, 403);
    const path = storage.pathOf(token.k);
    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      return c.json({ code: "not_found" }, 404);
    }
    const headers: Record<string, string> = {
      "accept-ranges": "bytes",
      "content-type": token.ct ?? "application/octet-stream",
      "cache-control": "private, max-age=3600",
    };
    if (token.dn)
      headers["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(token.dn)}`;
    const match = c.req.header("range")?.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start >= size || start > end) return c.body(null, 416, { "content-range": `bytes */${size}` });
      const stream = createReadStream(path, { start, end });
      return c.body(Readable.toWeb(stream) as ReadableStream, 206, {
        ...headers,
        "content-range": `bytes ${start}-${end}/${size}`,
        "content-length": String(end - start + 1),
      });
    }
    return c.body(Readable.toWeb(createReadStream(path)) as ReadableStream, 200, {
      ...headers,
      "content-length": String(size),
    });
  });

  return r;
}
