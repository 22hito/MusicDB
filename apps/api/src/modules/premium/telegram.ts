/**
 * Преміум через Telegram-бота. Цифрові послуги в Telegram оплачуються лише в Telegram Stars (XTR).
 *
 * Шлях: сайт → POST /v1/premium/checkout → t.me/<бот>?start=<підписаний токен акаунта> → бот вітає й дає кнопку
 * з рахунком-підпискою (30 днів, Telegram сам продовжує щомісяця) → pre_checkout_query → successful_payment
 * (і далі щомісяця, is_recurring) → преміум до subscription_expiration_date. Скасування — лише автопродовження:
 * преміум діє до кінця оплаченого періоду, кошти не повертаємо. refunded_payment приходить, тільки якщо оплату
 * скасував сам Telegram чи магазин (спір, чарджбек) — тоді гроші списано з балансу бота, і преміум знімається.
 * /paysupport і будь-який текст у бота — звернення в «Баг-репорти» адмінки.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { bugReports, type DbOrTx, payments, subscriptions, users } from "@musicdb/db";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv, Deps } from "../../context";
import { audit } from "../moderation/audit";

const TG = "https://api.telegram.org";
/** Єдиний період підписки, який зараз дозволяє Telegram. */
export const SUBSCRIPTION_PERIOD = 2_592_000;
const START_TTL_S = 24 * 3600;
const DAY = 86400_000;

type TgUser = { id: number; first_name?: string; username?: string; language_code?: string };
type SuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
  subscription_expiration_date?: number;
  is_recurring?: boolean;
  is_first_recurring?: boolean;
};
type RefundedPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
};
type Update = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: TgUser;
    text?: string;
    successful_payment?: SuccessfulPayment;
    refunded_payment?: RefundedPayment;
  };
  pre_checkout_query?: {
    id: string;
    from: TgUser;
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
};

/** Виклик Bot API; помилка Telegram — виняток з його описом (без токена в тексті). */
export async function tg<T = true>(token: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TG}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    result?: T;
    description?: string;
  } | null;
  if (!json?.ok) throw new Error(`Telegram ${method}: ${json?.description ?? `HTTP ${res.status}`}`);
  return json.result as T;
}

// ─── Токен у посиланні t.me/<бот>?start=… (лише A–Z a–z 0–9 _ -, до 64 символів) ──────────────────

const sign = (secret: string, userId: string, exp: string) =>
  createHmac("sha256", secret).update(`tg-start:${userId}:${exp}`).digest("hex").slice(0, 16);

export function startToken(secret: string, userId: string, now = Date.now()) {
  const exp = Math.floor(now / 1000 + START_TTL_S).toString(36);
  return `${userId}-${exp}-${sign(secret, userId, exp)}`;
}

/** id користувача з токена або причина відмови. */
export function readStartToken(
  secret: string,
  token: string,
  now = Date.now(),
): { userId: string } | { error: "invalid" | "expired" } {
  const m = /^([A-Za-z0-9]{8,32})-([0-9a-z]{4,10})-([0-9a-f]{16})$/.exec(token);
  if (!m) return { error: "invalid" };
  const [, userId, exp, sig] = m as unknown as [string, string, string, string];
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(sign(secret, userId, exp)))) return { error: "invalid" };
  if (Number.parseInt(exp, 36) * 1000 < now) return { error: "expired" };
  return { userId };
}

export const checkoutUrl = (deps: Deps, userId: string) =>
  `https://t.me/${deps.env.TELEGRAM_BOT_USERNAME}?start=${startToken(deps.env.AUTH_SECRET, userId)}`;

const PAYLOAD = /^premium:([A-Za-z0-9]{8,32})$/;

// ─── Тексти бота ───────────────────────────────────────────────────────────────────────────────

const TEXT = {
  uk: {
    offer: (name: string, price: number) =>
      `Привіт, ${name}! 🦉\n\nN'Owl Premium — офлайн-бібліотека й завантаження плейлистів у застосунку.\n\n` +
      `${price} ⭐ на місяць, продовжується автоматично. Скасувати можна будь-коли — на сайті або в Telegram ` +
      "(Налаштування → Мої зірки): Premium діятиме до кінця оплаченого місяця. Кошти не повертаються.",
    pay: (price: number) => `Оформити за ${price} ⭐`,
    title: "N'Owl Premium",
    description: "Офлайн-бібліотека й завантаження плейлистів у застосунку N'Owl. Місяць, автопродовження.",
    noLink:
      "Щоб оформити Premium, відкрийте сторінку Premium на сайті N'Owl і натисніть «Оформити в Telegram» — " +
      "так бот знатиме ваш акаунт.",
    expired:
      "Посилання застаріло. Відкрийте сторінку Premium на сайті й натисніть «Оформити в Telegram» ще раз.",
    open: "Відкрити N'Owl",
    back: "Повернутися в N'Owl",
    paid: (date: string) => `Готово! Premium активний до ${date}. Дякуємо, що підтримуєте N'Owl 💛`,
    renewed: (date: string) => `Premium продовжено до ${date}.`,
    refunded: "Telegram скасував цю оплату — Premium вимкнено.",
    priceChanged: "Ціна змінилась — відкрийте посилання з сайту ще раз.",
    noUser: "Акаунт не знайдено — оформіть з сайту ще раз.",
    support:
      "Питання щодо оплати чи Premium? Опишіть проблему одним повідомленням — його отримає адміністратор N'Owl.",
    received: "Дякуємо! Звернення передано адміністратору.",
    terms:
      "Premium — підписка на місяць за Telegram Stars, продовжується автоматично, поки ви її не скасуєте. " +
      "Після скасування діє до кінця оплаченого періоду, наступного списання не буде. " +
      "Кошти за оплачений період не повертаються. Повні умови — на сайті:",
  },
  en: {
    offer: (name: string, price: number) =>
      `Hi, ${name}! 🦉\n\nN'Owl Premium — offline library and playlist downloads in the app.\n\n` +
      `${price} ⭐ per month, renews automatically. Cancel any time — on the website or in Telegram ` +
      "(Settings → My Stars): Premium stays active until the end of the paid month. No refunds.",
    pay: (price: number) => `Subscribe for ${price} ⭐`,
    title: "N'Owl Premium",
    description: "Offline library and playlist downloads in the N'Owl app. Monthly, auto-renewing.",
    noLink:
      "To get Premium, open the Premium page on the N'Owl website and tap “Subscribe in Telegram” — " +
      "that's how the bot knows your account.",
    expired:
      "This link has expired. Open the Premium page on the website and tap “Subscribe in Telegram” again.",
    open: "Open N'Owl",
    back: "Back to N'Owl",
    paid: (date: string) => `Done! Premium is active until ${date}. Thanks for supporting N'Owl 💛`,
    renewed: (date: string) => `Premium renewed until ${date}.`,
    refunded: "Telegram reversed this payment — Premium is off.",
    priceChanged: "The price has changed — open the link from the website again.",
    noUser: "Account not found — subscribe from the website again.",
    support:
      "Questions about payment or Premium? Describe the problem in one message — an N'Owl admin will get it.",
    received: "Thanks! Your message was passed to an admin.",
    terms:
      "Premium is a monthly Telegram Stars subscription that renews until you cancel it. " +
      "After cancelling it lasts until the end of the paid period and you won't be charged again. " +
      "Payments for a paid period are non-refundable. Full terms on the website:",
  },
};

const lang = (u?: TgUser): "uk" | "en" =>
  u?.language_code === "uk" || u?.language_code === "ru" ? "uk" : "en";
const fmtDate = (d: Date, l: "uk" | "en") =>
  d.toLocaleDateString(l === "uk" ? "uk-UA" : "en-US", { day: "numeric", month: "long", year: "numeric" });

// ─── Підписка ──────────────────────────────────────────────────────────────────────────────────

/** Активна підписка Telegram користувача: продовжує до `until` (не скорочує) або створює нову. */
async function extendTelegram(db: DbOrTx, userId: string, until: Date, tgUserId: number, chargeId: string) {
  const [active] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.provider, "telegram"),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  if (active) {
    const end = active.currentPeriodEnd > until ? active.currentPeriodEnd : until;
    // provider_ref лишається від першої оплати — це id підписки для editUserStarSubscription.
    const keepRef = active.providerRef?.startsWith(`${tgUserId}:`);
    const [u] = await db
      .update(subscriptions)
      .set({
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        ...(keepRef ? {} : { providerRef: `${tgUserId}:${chargeId}` }),
      })
      .where(eq(subscriptions.id, active.id))
      .returning();
    return u!;
  }
  const [created] = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "premium",
      status: "active",
      provider: "telegram",
      providerRef: `${tgUserId}:${chargeId}`,
      currentPeriodStart: new Date(),
      currentPeriodEnd: until,
    })
    .returning();
  return created!;
}

/**
 * Скасувати автопродовження в Telegram (з сайту). Пробує id першої оплати, потім — останньої:
 * Telegram не уточнює, який саме id вважає «ідентифікатором підписки».
 */
export async function setTelegramRenewal(
  deps: Deps,
  sub: typeof subscriptions.$inferSelect,
  enabled: boolean,
): Promise<void> {
  const token = deps.env.TELEGRAM_BOT_TOKEN;
  const [tgUser, firstCharge] = (sub.providerRef ?? "").split(":");
  if (!token || !tgUser || !firstCharge) throw new Error("Немає даних підписки Telegram");
  const [last] = await deps.db
    .select({ id: payments.providerChargeId })
    .from(payments)
    .where(and(eq(payments.userId, sub.userId), eq(payments.provider, "telegram")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  const ids = [...new Set([firstCharge, last?.id].filter((x): x is string => !!x))];
  let lastErr: unknown;
  for (const id of ids) {
    try {
      await tg(token, "editUserStarSubscription", {
        user_id: Number(tgUser),
        telegram_payment_charge_id: id,
        is_canceled: !enabled,
      });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// ─── Вебхук ────────────────────────────────────────────────────────────────────────────────────

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function telegramWebhook(deps: Deps) {
  return async (c: Context<AppEnv>) => {
    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret } = deps.env;
    if (deps.env.PAYMENTS_MODE !== "telegram" || !token || !secret) return c.json({ ok: false }, 404);
    if (!safeEqual(c.req.header("x-telegram-bot-api-secret-token") ?? "", secret)) {
      return c.json({ ok: false }, 401);
    }
    const update = (await c.req.json().catch(() => null)) as Update | null;
    if (!update) return c.json({ ok: true });
    try {
      await handleUpdate(deps, token, update);
    } catch (err) {
      // Telegram повторює запит, лише коли відповідь не 200: оплату не губимо (payments ідемпотентні),
      // а інші збої лише логуємо, щоб бот не застряг на одному повідомленні.
      deps.log.error({ err, updateId: update.update_id }, "telegram update failed");
      if (update.message?.successful_payment) return c.json({ ok: false }, 500);
    }
    return c.json({ ok: true });
  };
}

async function handleUpdate(deps: Deps, token: string, u: Update) {
  const web = deps.env.webOrigins[0] ?? deps.env.API_URL;
  const price = deps.env.PREMIUM_PRICE_STARS;

  if (u.pre_checkout_query) {
    const q = u.pre_checkout_query;
    const t = TEXT[lang(q.from)];
    const userId = PAYLOAD.exec(q.invoice_payload)?.[1];
    const [user] = userId
      ? await deps.db.select({ banned: users.banned }).from(users).where(eq(users.id, userId))
      : [];
    const error =
      !user || user.banned
        ? t.noUser
        : q.currency !== "XTR" || q.total_amount !== price
          ? t.priceChanged
          : null;
    await tg(token, "answerPreCheckoutQuery", {
      pre_checkout_query_id: q.id,
      ok: !error,
      ...(error ? { error_message: error } : {}),
    });
    return;
  }

  const m = u.message;
  if (m?.chat.type !== "private") return;
  const l = lang(m.from);
  const t = TEXT[l];
  const send = (text: string, button?: { text: string; url: string }) =>
    tg(token, "sendMessage", {
      chat_id: m.chat.id,
      text,
      ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
    });

  if (m.successful_payment && m.from) {
    const p = m.successful_payment;
    const userId = PAYLOAD.exec(p.invoice_payload)?.[1];
    if (!userId) return;
    const until = p.subscription_expiration_date
      ? new Date(p.subscription_expiration_date * 1000)
      : new Date(Date.now() + 30 * DAY);
    const renewal = !!p.is_recurring && !p.is_first_recurring;
    const tgUser = m.from;
    const sub = await deps.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(payments)
        .values({
          userId,
          provider: "telegram",
          providerChargeId: p.telegram_payment_charge_id,
          amount: p.total_amount,
          currency: p.currency,
          kind: renewal ? "renewal" : "first",
          data: { telegramUserId: tgUser.id, until: until.toISOString() },
        })
        .onConflictDoNothing()
        .returning({ id: payments.id });
      if (inserted.length === 0) return null; // Telegram надіслав ту саму оплату ще раз
      const s = await extendTelegram(tx, userId, until, tgUser.id, p.telegram_payment_charge_id);
      await audit(tx, {
        actorId: userId,
        action: renewal ? "premium.telegram_renewal" : "premium.telegram_payment",
        entityType: "user",
        entityId: userId,
        data: { stars: p.total_amount, until: until.toISOString() },
      });
      return s;
    });
    if (sub) {
      const date = fmtDate(sub.currentPeriodEnd, l);
      await send(renewal ? t.renewed(date) : t.paid(date), { text: t.back, url: `${web}/premium` });
    }
    return;
  }

  if (m.refunded_payment) {
    const p = m.refunded_payment;
    const userId = PAYLOAD.exec(p.invoice_payload)?.[1];
    if (!userId) return;
    await deps.db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({ status: "canceled", currentPeriodEnd: new Date(), cancelAtPeriodEnd: true })
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.provider, "telegram"),
            eq(subscriptions.status, "active"),
          ),
        );
      await tx
        .update(payments)
        .set({ data: sql`coalesce(${payments.data}, '{}'::jsonb) || '{"refunded":true}'::jsonb` })
        .where(
          and(eq(payments.provider, "telegram"), eq(payments.providerChargeId, p.telegram_payment_charge_id)),
        );
      await audit(tx, {
        actorId: null,
        action: "premium.telegram_refund",
        entityType: "user",
        entityId: userId,
        data: { stars: p.total_amount },
      });
    });
    await send(t.refunded);
    return;
  }

  const text = m.text?.trim();
  if (!text) return;

  const start = /^\/start(?:@\w+)?(?:\s+(\S+))?$/.exec(text);
  if (start) {
    const arg = start[1];
    if (!arg) return send(t.noLink, { text: t.open, url: `${web}/premium` });
    const read = readStartToken(deps.env.AUTH_SECRET, arg);
    if ("error" in read) {
      return send(read.error === "expired" ? t.expired : t.noLink, { text: t.open, url: `${web}/premium` });
    }
    const [user] = await deps.db
      .select({ name: users.name, banned: users.banned })
      .from(users)
      .where(eq(users.id, read.userId));
    if (!user || user.banned) return send(t.noUser, { text: t.open, url: `${web}/premium` });
    const link = await tg<string>(token, "createInvoiceLink", {
      title: t.title,
      description: t.description,
      payload: `premium:${read.userId}`,
      currency: "XTR",
      prices: [{ label: t.title, amount: price }],
      subscription_period: SUBSCRIPTION_PERIOD,
    });
    return send(t.offer(user.name, price), { text: t.pay(price), url: link });
  }
  if (/^\/paysupport(?:@\w+)?$/.test(text) || /^\/help(?:@\w+)?$/.test(text)) return send(t.support);
  if (/^\/terms(?:@\w+)?$/.test(text)) return send(`${t.terms} ${web}/legal/terms`);
  if (text.startsWith("/")) return send(t.noLink, { text: t.open, url: `${web}/premium` });

  // Звичайний текст — звернення в підтримку (видно в адмінці, «Баг-репорти»).
  const from = m.from;
  const [linked] = from
    ? await deps.db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.provider, "telegram"),
            sql`${subscriptions.providerRef} like ${`${from.id}:%`}`,
          ),
        )
        .orderBy(desc(subscriptions.currentPeriodEnd))
        .limit(1)
    : [];
  await deps.db.insert(bugReports).values({
    userId: linked?.userId ?? null,
    description: text.slice(0, 4000),
    context: {
      source: "telegram",
      topic: "payment",
      telegramUserId: from?.id ?? null,
      telegramUsername: from?.username ?? null,
    },
  });
  deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
  await send(t.received);
}
