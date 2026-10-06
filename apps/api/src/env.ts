import { readFileSync } from "node:fs";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(8787),
  /** Публічна адреса API (для посилань, OAuth-колбеків). */
  API_URL: z.string().url().default("http://localhost:8787"),
  /** Адреса сайту — CORS, редиректи після входу. Кілька — через кому. */
  WEB_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@127.0.0.1:54329/musicdb"),
  DATABASE_POOL_MAX: z.coerce.number().int().default(10),
  AUTO_MIGRATE: bool,
  AUTH_SECRET: z.string().min(32).default("dev-secret-change-me-dev-secret-change-me"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Email-и, які при вході отримують роль admin (перехідний механізм до ролей у базі). */
  ADMIN_EMAILS: z.string().default(""),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("../../.data/storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Публічна адреса бакета з обкладинками/аватарками (CDN); аудіо завжди через підписані посилання. */
  S3_PUBLIC_URL: z.string().optional(),
  YOUTUBE_API_KEYS: z.string().default(""),
  /**
   * Файл із ключами YouTube (секрет, змонтований файлом, або налаштування v1): JSON
   * { "YouTube": { "ApiKeys": [...] } } / { "keys": [...] } чи текст — ключ на рядок.
   */
  YOUTUBE_API_KEYS_FILE: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MOBILE_SCHEME: z.string().default("nowl"),
  /** inline — воркер фонових задач у процесі API; off — окремим процесом (src/worker.ts). */
  WORKER_MODE: z.enum(["inline", "off"]).default("inline"),
  /**
   * stub — тестова оплата без грошей; telegram — Telegram Stars через бота; disabled — оформлення вимкнене.
   * Без значення: telegram, якщо задано бота, інакше stub у розробці й disabled у production.
   */
  PAYMENTS_MODE: z.enum(["stub", "telegram", "disabled"]).optional(),
  /** Бот для оплати преміуму (токен від @BotFather), його @username без «@» і секрет вебхука (A–Z, a–z, 0–9, _ -). */
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .regex(/^[\w-]{16,256}$/)
    .optional(),
  /** Ціна преміуму на місяць у Telegram Stars. */
  PREMIUM_PRICE_STARS: z.coerce.number().int().min(1).max(10000).default(150),
});

export type Env = Omit<z.infer<typeof EnvSchema>, "PAYMENTS_MODE"> & {
  PAYMENTS_MODE: "stub" | "telegram" | "disabled";
  webOrigins: string[];
  adminEmails: Set<string>;
  youtubeKeys: string[];
  isProd: boolean;
};

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Некоректна конфігурація:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.AUTH_SECRET.startsWith("dev-secret")) {
    throw new Error("AUTH_SECRET має бути заданий у production");
  }
  // Тестова оплата (преміум без списання) — лише в розробці; у production без явного налаштування вимкнена.
  const hasBot = !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME && env.TELEGRAM_WEBHOOK_SECRET);
  const paymentsMode =
    env.PAYMENTS_MODE ?? (hasBot ? "telegram" : env.NODE_ENV === "production" ? "disabled" : "stub");
  if (paymentsMode === "telegram" && !hasBot) {
    throw new Error(
      "PAYMENTS_MODE=telegram потребує TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME і TELEGRAM_WEBHOOK_SECRET",
    );
  }
  const list = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    ...env,
    PAYMENTS_MODE: paymentsMode,
    webOrigins: list(env.WEB_ORIGINS),
    adminEmails: new Set(list(env.ADMIN_EMAILS).map((e) => e.toLowerCase())),
    youtubeKeys: [...new Set([...list(env.YOUTUBE_API_KEYS), ...keysFromFile(env.YOUTUBE_API_KEYS_FILE)])],
    isProd: env.NODE_ENV === "production",
  };
}

/** Ключі YouTube з файлу; невідомий формат або відсутній файл — порожньо (сервер працює без пошуку відео). */
function keysFromFile(path: string | undefined): string[] {
  if (!path) return [];
  let raw: string;
  try {
    raw = readFileSync(path, "utf8").replace(/^﻿/, "");
  } catch {
    return [];
  }
  try {
    const json = JSON.parse(raw) as {
      YouTube?: { ApiKeys?: unknown; ApiKey?: unknown };
      keys?: unknown;
    };
    const pick = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : []);
    return [...pick(json.YouTube?.ApiKeys), ...pick(json.YouTube?.ApiKey), ...pick(json.keys)]
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter(Boolean);
  } catch {
    return raw
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith("#"));
  }
}
