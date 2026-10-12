/**
 * Вхід у застосунок для Windows через системний браузер (Google не пускає вхід у вбудованих вікнах).
 *
 * Основний шлях — без діалогу браузера «Відкрити застосунок?»: застосунок відкриває /desktop-login?pair=<ключ>,
 * сайт після входу прив'язує сесію до ключа (POST /v1/desktop/code { pair }), а застосунок сам перевіряє
 * ключ (POST /v1/desktop/claim) і забирає cookie сесії. Запасний шлях — код у посиланні nowl://auth?code=…
 * (POST /v1/desktop/exchange). Усе одноразове, живе кілька хвилин, лежить у таблиці verifications.
 */
import { newSecret, verifications } from "@musicdb/db";
import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv, Deps } from "../../context";

const TTL_MS = 2 * 60_000;
const PAIR_TTL_MS = 10 * 60_000;
const PREFIX = "desktop-login:";
const PAIR = "desktop-pair:";
const KEY = /^[A-Za-z0-9]{32}$/;

/** Cookie сесії з запиту (назва з префіксом nowl, у production — з __Secure-). */
function sessionCookie(header: string | undefined) {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name.endsWith("nowl.session_token")) return { name, value: part.slice(i + 1).trim() };
  }
  return null;
}

export function desktopCode(deps: Deps) {
  return async (c: Context<AppEnv>) => {
    const user = c.get("user");
    const cookie = sessionCookie(c.req.header("cookie"));
    if (!user || !cookie) return c.json({ code: "unauthorized", message: "Потрібен вхід" }, 401);
    const body = (await c.req.json().catch(() => null)) as { pair?: string } | null;
    if (body?.pair) {
      if (!KEY.test(body.pair)) return c.json({ code: "bad_pair", message: "Невірний ключ" }, 400);
      await deps.db.insert(verifications).values({
        identifier: `${PAIR}${body.pair}`,
        value: JSON.stringify(cookie),
        expiresAt: new Date(Date.now() + PAIR_TTL_MS),
      });
      return c.json({ paired: true });
    }
    const code = newSecret();
    await deps.db.insert(verifications).values({
      identifier: `${PREFIX}${code}`,
      value: JSON.stringify(cookie),
      expiresAt: new Date(Date.now() + TTL_MS),
    });
    return c.json({ code });
  };
}

export function desktopExchange(deps: Deps) {
  return async (c: Context<AppEnv>) => {
    const body = (await c.req.json().catch(() => null)) as { code?: string } | null;
    const code = body?.code;
    if (!code || !/^[A-Za-z0-9]{32}$/.test(code))
      return c.json({ code: "bad_code", message: "Невірний код" }, 400);
    const [row] = await deps.db
      .delete(verifications)
      .where(and(eq(verifications.identifier, `${PREFIX}${code}`), gt(verifications.expiresAt, new Date())))
      .returning({ value: verifications.value });
    if (!row) return c.json({ code: "expired", message: "Код застарів — увійдіть ще раз" }, 410);
    return c.json(JSON.parse(row.value) as { name: string; value: string });
  };
}

/** Застосунок перевіряє свій ключ пари: 200 — cookie сесії (один раз), 404 — вхід у браузері ще не завершено. */
export function desktopClaim(deps: Deps) {
  return async (c: Context<AppEnv>) => {
    const body = (await c.req.json().catch(() => null)) as { pair?: string } | null;
    if (!body?.pair || !KEY.test(body.pair))
      return c.json({ code: "bad_pair", message: "Невірний ключ" }, 400);
    const [row] = await deps.db
      .delete(verifications)
      .where(
        and(eq(verifications.identifier, `${PAIR}${body.pair}`), gt(verifications.expiresAt, new Date())),
      )
      .returning({ value: verifications.value });
    if (!row) return c.json({ code: "pending", message: "Очікуємо вхід" }, 404);
    return c.json(JSON.parse(row.value) as { name: string; value: string });
  };
}
