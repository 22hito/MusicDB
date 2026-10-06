import { assets } from "@musicdb/db";
import { Scalar } from "@scalar/hono-api-reference";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv, Deps, Role, SessionUser } from "./context";
import { register } from "./http/endpoint";
import { ApiError } from "./http/errors";
import { clearMemo } from "./http/memo";
import { buildOpenApi } from "./http/openapi";
import { youtubeSearch } from "./modules/catalog/hydrate";
import { allRoutes } from "./modules/index";
import { telegramWebhook } from "./modules/premium/telegram";
import { LocalStorage } from "./services/storage";
import { storageRoutes } from "./services/storage-routes";

const problem = (status: number, code: string, title: string) => ({
  type: "about:blank",
  title,
  status,
  code,
});

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>();
  const { env, log } = deps;
  youtubeSearch.enabled = env.youtubeKeys.length > 0;
  clearMemo();

  app.use("*", requestId());
  // JSON стискається (gzip/deflate за Accept-Encoding): відповіді каталогу в 5–8 разів менші; аудіо не чіпається.
  const gzip = compress();
  app.use("/v1/*", (c, next) =>
    // Файли (аудіо з Range, зображення) віддаються як є.
    c.req.path.startsWith("/v1/storage") || c.req.path.startsWith("/v1/media") ? next() : gzip(c, next),
  );
  // ETag на відповіді API: повторний запит без змін отримує 304 без тіла (браузер бере з кешу).
  const tag = etag({ weak: true });
  app.use("/v1/*", (c, next) =>
    c.req.method !== "GET" || c.req.path.startsWith("/v1/storage") || c.req.path.startsWith("/v1/media")
      ? next()
      : tag(c, next),
  );
  app.use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use(
    "/v1/*",
    cors({
      origin: (origin) => (env.webOrigins.includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["content-type", "authorization", "x-request-id"],
      exposeHeaders: ["x-request-id", "set-auth-token"],
      maxAge: 86400,
    }),
  );

  app.use("*", async (c, next) => {
    const started = performance.now();
    await next();
    if (c.req.path === "/health") return;
    const ms = Math.round(performance.now() - started);
    log.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, ms, rid: c.get("requestId") },
      "request",
    );
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.on(["GET", "POST"], "/v1/auth/*", (c) => deps.auth.handler(c.req.raw));

  app.use("/v1/*", async (c, next) => {
    c.set("user", null);
    if (c.req.path.startsWith("/v1/storage/") || c.req.path.startsWith("/v1/telegram/")) return next();
    const session = await deps.auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (session?.user && !session.user.banned) {
      const user: SessionUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image ?? null,
        role: ((session.user as { role?: string }).role ?? "user") as Role,
        sessionId: session.session.id,
      };
      c.set("user", user);
    }
    await next();
  });

  register(app, deps, allRoutes);

  // Вебхук Telegram-бота (оплата преміуму Stars); справжність — за секретом у заголовку.
  app.post("/v1/telegram/webhook", telegramWebhook(deps));

  if (deps.storage instanceof LocalStorage) app.route("/v1/storage", storageRoutes(deps.storage));

  // Публічні картинки (аватари, обкладинки, фото виконавців), коли сховище без CDN: редирект на підписане посилання.
  app.get("/v1/media/:id", async (c) => {
    const [asset] = await deps.db
      .select()
      .from(assets)
      .where(eq(assets.id, c.req.param("id")));
    const isPublicImage =
      asset?.kind === "image" &&
      (asset.status === "uploaded" || asset.status === "ready") &&
      !asset.storageKey.startsWith("images/screenshots/");
    if (!asset || !isPublicImage) return c.json(problem(404, "media_not_found", "Не знайдено"), 404);
    const url = await deps.storage.presignGet(asset.storageKey, {
      expiresIn: 24 * 3600,
      contentType: asset.mimeType ?? undefined,
    });
    c.header("cache-control", "public, max-age=3600");
    return c.redirect(url, 302);
  });

  const openapi = buildOpenApi(allRoutes, env.API_URL);
  app.get("/v1/openapi.json", (c) => c.json(openapi));
  app.get("/docs", Scalar({ url: "/v1/openapi.json", pageTitle: "N'Owl API" }));

  app.notFound((c) => c.json(problem(404, "route_not_found", "Маршрут не знайдено"), 404));

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(err.toProblem(), err.status as 400, { "content-type": "application/problem+json" });
    }
    if (err instanceof HTTPException) {
      return c.json(problem(err.status, "http_error", err.message), err.status);
    }
    log.error({ err, path: c.req.path, rid: c.get("requestId") }, "unhandled error");
    return c.json(problem(500, "internal_error", "Щось пішло не так"), 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
