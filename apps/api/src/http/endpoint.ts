/**
 * Реалізація ендпоінтів з таблиці контрактів: перевірка доступу, розбір і валідація входу,
 * серіалізація відповіді. Обробник отримує вже типізовані params/query/body.
 */
import type { EndpointDef, EndpointOutput, ParsedBody, ParsedParams, ParsedQuery } from "@musicdb/contracts";
import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { AppEnv, Deps, SessionUser } from "../context";
import { ApiError, forbidden, unauthorized } from "./errors";

type UserFor<E extends EndpointDef> = E["auth"] extends "public" | "optional"
  ? SessionUser | null
  : SessionUser;

export type HandlerContext<E extends EndpointDef> = {
  c: Context<AppEnv>;
  deps: Deps;
  user: UserFor<E>;
  params: ParsedParams<E>;
  query: ParsedQuery<E>;
  body: ParsedBody<E>;
};

export type Handler<E extends EndpointDef> = (ctx: HandlerContext<E>) => Promise<EndpointOutput<E>>;

export type Implementation = {
  endpoint: EndpointDef;
  // biome-ignore lint/suspicious/noExplicitAny: типи перевіряються в implement()
  handler: Handler<any>;
};

export const implement = <E extends EndpointDef>(endpoint: E, handler: Handler<E>): Implementation => ({
  endpoint,
  handler,
});

function validationError(error: z.ZodError, where: string): ApiError {
  return new ApiError(
    422,
    "validation_failed",
    "Перевірте введені дані",
    error.issues.map((i) => ({ path: [where, ...i.path].join("."), message: i.message })),
  );
}

function parseQuery(c: Context): Record<string, string> {
  const url = new URL(c.req.url);
  const out: Record<string, string> = {};
  for (const [k, v] of url.searchParams) out[k] = v;
  return out;
}

const roleRank: Record<string, number> = { user: 0, artist: 0, moderator: 1, admin: 2 };

export function register(app: Hono<AppEnv>, deps: Deps, impls: Implementation[]) {
  for (const { endpoint: e, handler } of impls) {
    app.on(e.method, e.path, async (c) => {
      const user = c.get("user");
      if (e.auth === "user" || e.auth === "moderator" || e.auth === "admin") {
        if (!user) throw unauthorized();
        if (e.auth === "moderator" && (roleRank[user.role] ?? 0) < 1) throw forbidden();
        if (e.auth === "admin" && (roleRank[user.role] ?? 0) < 2) throw forbidden();
      }

      let params: unknown = {};
      if (e.params) {
        const r = e.params.safeParse(c.req.param());
        if (!r.success) throw validationError(r.error, "params");
        params = r.data;
      }
      let query: unknown = {};
      if (e.query) {
        const r = e.query.safeParse(parseQuery(c));
        if (!r.success) throw validationError(r.error, "query");
        query = r.data;
      }
      let body: unknown;
      if (e.body) {
        let raw: unknown;
        try {
          raw = await c.req.json();
        } catch {
          raw = {};
        }
        const r = e.body.safeParse(raw);
        if (!r.success) throw validationError(r.error, "body");
        body = r.data;
      }

      // biome-ignore lint/suspicious/noExplicitAny: params/query/body вже провалідовані за схемами endpoint
      const result = await handler({ c, deps, user, params, query, body } as any);

      if (!e.response) return c.body(null, 204);
      if (deps.env.NODE_ENV === "test") {
        // У тестах перевіряємо, що відповідь справді відповідає контракту.
        const r = e.response.safeParse(result);
        if (!r.success) {
          throw new Error(`Відповідь ${e.method} ${e.path} не відповідає контракту: ${r.error.message}`);
        }
      }
      if (e.cacheSeconds && e.method === "GET") {
        c.header(
          "cache-control",
          `public, max-age=${e.cacheSeconds}, stale-while-revalidate=${e.cacheSeconds * 5}`,
        );
      } else if (e.method === "GET") {
        c.header("cache-control", "private, no-cache");
      }
      return c.json(result as unknown as object, e.status ?? 200);
    });
  }
}
