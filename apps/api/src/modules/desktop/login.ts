/**
 * Вхід у застосунок для Windows через системний браузер (Google не пускає вхід у вбудованих вікнах).
 * Сайт після входу просить одноразовий код (POST /v1/desktop/code) і передає його застосунку посиланням
 * nowl://auth?code=…; застосунок обмінює код на cookie сесії (POST /v1/desktop/exchange). Код живе 2 хвилини
 * й спрацьовує один раз; зберігається в таблиці verifications (як і інші одноразові токени входу).
 */
import { newSecret, verifications } from "@musicdb/db";
import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv, Deps } from "../../context";

const TTL_MS = 2 * 60_000;
const PREFIX = "desktop-login:";

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
