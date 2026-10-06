/**
 * Преміум (офлайн-бібліотека й завантаження плейлистів — у застосунку).
 * PAYMENTS_MODE=telegram — оплата Telegram Stars через бота (checkout повертає посилання на бота, підписку
 * продовжує вебхук, див. telegram.ts); stub — «1 грн, тест» видає 30 днів без списання; disabled — вимкнено.
 */
import { endpoints } from "@musicdb/contracts";
import { type DbOrTx, newSecret, subscriptions } from "@musicdb/db";
import { and, desc, eq, gt } from "drizzle-orm";
import type { Deps } from "../../context";
import { implement } from "../../http/endpoint";
import { ApiError, badRequest } from "../../http/errors";
import { iso } from "../catalog/hydrate";
import { audit } from "../moderation/audit";
import { checkoutUrl, setTelegramRenewal } from "./telegram";

const STUB_PLAN = { id: "premium_month", amount: 1, currency: "UAH", periodDays: 30, test: true };

/** Тарифи для поточного режиму оплати: у Telegram — ціна в Stars. */
function plans(env: Deps["env"]) {
  return env.PAYMENTS_MODE === "telegram"
    ? [{ id: "premium_month", amount: env.PREMIUM_PRICE_STARS, currency: "XTR", periodDays: 30, test: false }]
    : [STUB_PLAN];
}
const DAY = 86400_000;

export async function currentSubscription(db: DbOrTx, userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  return sub ?? null;
}

function info(sub: typeof subscriptions.$inferSelect | null) {
  return {
    active: !!sub,
    plan: sub?.plan ?? null,
    provider: sub?.provider ?? null,
    until: sub ? iso(sub.currentPeriodEnd) : null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  };
}

/** Продовжує активну підписку або створює нову на `days` днів. */
export async function grantPremium(
  db: DbOrTx,
  userId: string,
  days: number,
  provider: string,
  providerRef: string | null,
) {
  const now = new Date();
  const active = await currentSubscription(db, userId);
  if (active) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        currentPeriodEnd: new Date(active.currentPeriodEnd.getTime() + days * DAY),
        cancelAtPeriodEnd: false,
      })
      .where(eq(subscriptions.id, active.id))
      .returning();
    return updated!;
  }
  const [created] = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "premium",
      status: "active",
      provider,
      providerRef,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + days * DAY),
    })
    .returning();
  return created!;
}

export async function revokePremium(db: DbOrTx, userId: string) {
  await db
    .update(subscriptions)
    .set({ status: "canceled", currentPeriodEnd: new Date() })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
}

export const premiumRoutes = [
  implement(endpoints.premium.plans, async ({ deps }) => ({
    paymentsEnabled: deps.env.PAYMENTS_MODE !== "disabled",
    provider: deps.env.PAYMENTS_MODE === "disabled" ? null : deps.env.PAYMENTS_MODE,
    plans: plans(deps.env),
  })),

  implement(endpoints.premium.subscription, async ({ deps, user }) =>
    info(await currentSubscription(deps.db, user.id)),
  ),

  implement(endpoints.premium.checkout, async ({ deps, user, body }) => {
    const plan = plans(deps.env).find((p) => p.id === body.planId);
    if (!plan) throw badRequest("unknown_plan", "Невідомий тариф");
    if (deps.env.PAYMENTS_MODE === "disabled")
      throw new ApiError(503, "payments_disabled", "Оформлення тимчасово недоступне");
    if (deps.env.PAYMENTS_MODE === "telegram") {
      return { type: "redirect" as const, url: checkoutUrl(deps, user.id) };
    }
    const sub = await deps.db.transaction(async (tx) => {
      const s = await grantPremium(tx, user.id, plan.periodDays, "stub", `stub_${newSecret().slice(0, 12)}`);
      await audit(tx, {
        actorId: user.id,
        action: "premium.stub_checkout",
        entityType: "user",
        entityId: user.id,
        data: { plan: plan.id },
      });
      return s;
    });
    return { type: "activated" as const, subscription: info(sub) };
  }),

  implement(endpoints.premium.cancel, async ({ deps, user }) => setRenewal(deps, user.id, false)),

  implement(endpoints.premium.resume, async ({ deps, user }) => setRenewal(deps, user.id, true)),
];

/** Не продовжувати після поточного періоду (або знову продовжувати); для Telegram — і в самому Telegram. */
async function setRenewal(deps: Deps, userId: string, enabled: boolean) {
  const sub = await currentSubscription(deps.db, userId);
  if (!sub) return info(null);
  if (sub.provider === "telegram") {
    try {
      await setTelegramRenewal(deps, sub, enabled);
    } catch (err) {
      deps.log.warn({ err, subscriptionId: sub.id }, "telegram renewal change failed");
      throw new ApiError(
        502,
        "telegram_unavailable",
        "Не вдалося змінити підписку в Telegram — спробуйте пізніше або в Telegram: Налаштування → Мої зірки",
      );
    }
  }
  const [updated] = await deps.db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: !enabled })
    .where(eq(subscriptions.id, sub.id))
    .returning();
  return info(updated ?? null);
}
