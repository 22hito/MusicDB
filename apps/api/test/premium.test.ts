import type { Me } from "@musicdb/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./harness";

let t: TestApp;
let user: { cookie: string; id: string };
let admin: { cookie: string; id: string };

type Sub = { active: boolean; until: string | null; cancelAtPeriodEnd: boolean; provider: string | null };

beforeAll(async () => {
  t = await createTestApp();
  user = await t.signUp("buyer@test.dev");
  admin = await t.signUp("admin@test.dev");
});
afterAll(() => t.close());

describe("преміум (тестова оплата)", () => {
  it("тарифи доступні без входу", async () => {
    const res = await t.request<{
      paymentsEnabled: boolean;
      plans: { id: string; amount: number; test: boolean }[];
    }>("GET", "/v1/premium/plans");
    expect(res.body).toMatchObject({
      paymentsEnabled: true,
      plans: [{ id: "premium_month", amount: 1, test: true }],
    });
  });

  it("оформлення видає 30 днів; повторне — продовжує", async () => {
    const before = await t.request<Sub>("GET", "/v1/me/subscription", { cookie: user.cookie });
    expect(before.body.active).toBe(false);
    const first = await t.request<{ type: string; subscription: Sub }>("POST", "/v1/premium/checkout", {
      cookie: user.cookie,
      body: { planId: "premium_month" },
    });
    expect(first.body).toMatchObject({ type: "activated", subscription: { active: true, provider: "stub" } });
    const until1 = new Date(first.body.subscription.until!).getTime();
    expect(until1 - Date.now()).toBeGreaterThan(29 * 86400_000);
    const second = await t.request<{ subscription: Sub }>("POST", "/v1/premium/checkout", {
      cookie: user.cookie,
      body: { planId: "premium_month" },
    });
    expect(new Date(second.body.subscription.until!).getTime() - until1).toBeGreaterThan(29 * 86400_000);
    const me = await t.request<Me>("GET", "/v1/me", { cookie: user.cookie });
    expect(me.body.premium.active).toBe(true);
  });

  it("скасування — доступ до кінця періоду, без продовження", async () => {
    const res = await t.request<Sub>("POST", "/v1/premium/cancel", { cookie: user.cookie });
    expect(res.body).toMatchObject({ active: true, cancelAtPeriodEnd: true });
  });

  it("невідомий тариф — 400", async () => {
    const res = await t.request<{ code: string }>("POST", "/v1/premium/checkout", {
      cookie: user.cookie,
      body: { planId: "gold" },
    });
    expect(res.body.code).toBe("unknown_plan");
  });

  it("адмін видає й знімає преміум вручну", async () => {
    const other = await t.signUp("gift@test.dev");
    await t.request("PATCH", `/v1/admin/users/${other.id}`, {
      cookie: admin.cookie,
      body: { premiumDays: 7 },
    });
    const granted = await t.request<Sub>("GET", "/v1/me/subscription", { cookie: other.cookie });
    expect(granted.body).toMatchObject({ active: true, provider: "manual" });
    await t.request("PATCH", `/v1/admin/users/${other.id}`, {
      cookie: admin.cookie,
      body: { premiumDays: 0 },
    });
    const revoked = await t.request<Sub>("GET", "/v1/me/subscription", { cookie: other.cookie });
    expect(revoked.body.active).toBe(false);
  });
});
