/**
 * Сховище файлів: Cloudflare R2 / будь-яке S3 у продакшні, локальна тека в розробці.
 * Клієнти завантажують і отримують файли напряму за підписаними посиланнями — байти не йдуть через API.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../env";

export type PresignedUpload = { url: string; headers: Record<string, string> };

export interface Storage {
  presignPut(key: string, opts: { contentType: string; expiresIn: number }): Promise<PresignedUpload>;
  presignGet(
    key: string,
    opts: { expiresIn: number; downloadName?: string; contentType?: string },
  ): Promise<string>;
  /** Постійна публічна адреса (CDN) — лише для публічних картинок; null, якщо сховище приватне. */
  publicUrl(key: string): string | null;
  put(key: string, body: Buffer | Readable, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  head(key: string): Promise<{ size: number; contentType: string | null } | null>;
  delete(key: string): Promise<void>;
}

// ─── S3 / R2 ──────────────────────────────────────────────────────────────

export class S3Storage implements Storage {
  private client: S3Client;
  constructor(
    private bucket: string,
    opts: { endpoint?: string; region: string; accessKeyId: string; secretAccessKey: string },
    private publicBase?: string,
  ) {
    this.client = new S3Client({
      region: opts.region,
      ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
      forcePathStyle: true,
    });
  }

  async presignPut(key: string, opts: { contentType: string; expiresIn: number }) {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: opts.contentType }),
      { expiresIn: opts.expiresIn },
    );
    return { url, headers: { "content-type": opts.contentType } };
  }

  presignGet(key: string, opts: { expiresIn: number; downloadName?: string; contentType?: string }) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(opts.downloadName
          ? {
              ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(opts.downloadName)}`,
            }
          : {}),
        ...(opts.contentType ? { ResponseContentType: opts.contentType } : {}),
      }),
      { expiresIn: opts.expiresIn },
    );
  }

  publicUrl(key: string) {
    return this.publicBase ? `${this.publicBase.replace(/\/$/, "")}/${key}` : null;
  }

  async put(key: string, body: Buffer | Readable, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  async head(key: string) {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? null };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

// ─── Локальна тека (розробка) ─────────────────────────────────────────────

type LocalToken = { k: string; op: "get" | "put"; exp: number; ct?: string; dn?: string };

/**
 * Імітує підписані посилання S3: токен (HMAC) у шляху /v1/storage/:token веде на маршрут API,
 * який читає/пише файл у теці. Підтримує Range — аудіо можна перемотувати.
 */
export class LocalStorage implements Storage {
  constructor(
    readonly root: string,
    private baseUrl: string,
    private secret: string,
  ) {}

  private sign(payload: LocalToken) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = createHmac("sha256", this.secret).update(body).digest("base64url");
    return `${body}.${mac}`;
  }

  verify(token: string): LocalToken | null {
    const [body, mac] = token.split(".");
    if (!body || !mac) return null;
    const expected = createHmac("sha256", this.secret).update(body).digest("base64url");
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LocalToken;
    return payload.exp > Date.now() ? payload : null;
  }

  pathOf(key: string) {
    const full = resolve(this.root, key);
    if (!full.startsWith(resolve(this.root) + sep)) throw new Error("Invalid storage key");
    return full;
  }

  async presignPut(key: string, opts: { contentType: string; expiresIn: number }) {
    const token = this.sign({
      k: key,
      op: "put",
      exp: Date.now() + opts.expiresIn * 1000,
      ct: opts.contentType,
    });
    return { url: `${this.baseUrl}/v1/storage/${token}`, headers: { "content-type": opts.contentType } };
  }

  async presignGet(key: string, opts: { expiresIn: number; downloadName?: string; contentType?: string }) {
    const token = this.sign({
      k: key,
      op: "get",
      exp: Date.now() + opts.expiresIn * 1000,
      ...(opts.contentType ? { ct: opts.contentType } : {}),
      ...(opts.downloadName ? { dn: opts.downloadName } : {}),
    });
    return `${this.baseUrl}/v1/storage/${token}`;
  }

  publicUrl() {
    return null;
  }

  async put(key: string, body: Buffer | Readable, _contentType: string) {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    if (Buffer.isBuffer(body)) {
      const ws = createWriteStream(path);
      await new Promise<void>((ok, fail) => ws.end(body, () => ok()).on("error", fail));
    } else {
      await pipeline(body, createWriteStream(path));
    }
  }

  async get(key: string) {
    return createReadStream(this.pathOf(key));
  }

  async head(key: string) {
    try {
      const s = await stat(this.pathOf(key));
      return { size: s.size, contentType: null };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.pathOf(key), { force: true });
  }
}

export function createStorage(env: Env): Storage {
  if (env.STORAGE_DRIVER === "s3") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_DRIVER=s3 потребує S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
    }
    return new S3Storage(
      env.S3_BUCKET,
      {
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
        region: env.S3_REGION,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      env.S3_PUBLIC_URL,
    );
  }
  return new LocalStorage(resolve(env.STORAGE_LOCAL_DIR), env.API_URL, env.AUTH_SECRET);
}
