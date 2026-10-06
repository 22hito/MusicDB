/**
 * Преміум (офлайн-бібліотека й завантаження плейлистів — у застосунку).
 * Оплата зараз — заглушка (PAYMENTS_MODE=stub): «1 грн, тест» видає 30 днів без списання. Справжній провайдер
 * (LiqPay чи посередник) підключиться сюди ж: checkout поверне { type: "redirect", url }, а вебхук продовжить підписку.
 */
import { endpoints } from "@musicdb/contracts";
import { type DbOrTx, newSecret, subscriptions } from "@musicdb/db";
import { and, desc, eq, gt } from "drizzle-orm";
import { implement } from "../../http/endpoint";
import { ApiError, badRequest } from "../../http/errors";
import { iso } from "../catalog/hydrate";
import { audit } from "../moderation/audit";

export const PLANS = [
  { id: "premium_month", amount: 1, currency: "UAH", periodDays: 30, test: true },
] as const;
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
    plans: PLANS.map((p) => ({ ...p })),
  })),

  implement(endpoints.premium.subscription, async ({ deps, user }) =>
    info(await currentSubscription(deps.db, user.id)),
  ),

  implement(endpoints.premium.checkout, async ({ deps, user, body }) => {
    const plan = PLANS.find((p) => p.id === body.planId);
    if (!plan) throw badRequest("unknown_plan", "Невідомий тариф");
    if (deps.env.PAYMENTS_MODE === "disabled")
      throw new ApiError(503, "payments_disabled", "Оформлення тимчасово недоступне");
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

  implement(endpoints.premium.cancel, async ({ deps, user }) => {
    const sub = await currentSubscription(deps.db, user.id);
    if (!sub) return info(null);
    const [updated] = await deps.db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    return info(updated ?? null);
  }),
];
