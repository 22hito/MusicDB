import { bugReports, payments } from "@musicdb/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readStartToken, startToken } from "../src/modules/premium/telegram";
import { createTestApp, type TestApp } from "./harness";

const SECRET = "webhook-secret-0123456789";
const AUTH_SECRET = "test-secret-test-secret-test-secret-123";
let t: TestApp;
let user: { cookie: string; id: string };

type Sub = { active: boolean; until: string | null; cancelAtPeriodEnd: boolean; provider: string | null };
type Call = { method: string; body: Record<string, unknown> };

/** Підроблений Bot API: запам'ятовує виклики, createInvoiceLink повертає посилання. */
let calls: Call[] = [];
let failRenewalChange = false;
function mockTelegram() {
  calls = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const method = String(input).split("/").pop()!;
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ method, body });
    if (method === "editUserStarSubscription" && failRenewalChange) {
      return Response.json({ ok: false, description: "Bad Request: SUBSCRIPTION_NOT_FOUND" });
    }
    return Response.json({
      ok: true,
      result: method === "createInvoiceLink" ? "https://t.me/$invoice123" : true,
    });
  });
}

const hook = (update: unknown, secret = SECRET) =>
  t.request("POST", "/v1/telegram/webhook", {
    body: update,
    headers: { "x-telegram-bot-api-secret-token": secret },
  });
const from = { id: 777, first_name: "Dima", language_code: "uk" };
const chat = { id: 777, type: "private" };
const text = (updateId: number, value: string) => ({
  update_id: updateId,
  message: { message_id: updateId, chat, from, text: value },
});
const paid = (charge: string, extra: Record<string, unknown>) => ({
  update_id: Math.floor(Math.random() * 1e9),
  message: {
    message_id: 5,
    chat,
    from,
    successful_payment: {
      currency: "XTR",
      total_amount: 150,
      invoice_payload: `premium:${user.id}`,
      telegram_payment_charge_id: charge,
      provider_payment_charge_id: "",
      ...extra,
    },
  },
});
const subscription = async () =>
  (await t.request<Sub>("GET", "/v1/me/subscription", { cookie: user.cookie })).body;

beforeAll(async () => {
  t = await createTestApp({
    TELEGRAM_BOT_TOKEN: "123:abc",
    TELEGRAM_BOT_USERNAME: "nowl_test_bot",
    TELEGRAM_WEBHOOK_SECRET: SECRET,
  });
  user = await t.signUp("tg@test.dev", "Dima");
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(() => t.close());

describe("преміум через Telegram Stars", () => {
  it("токен у посиланні: справжній, підроблений, прострочений", () => {
    const tok = startToken(AUTH_SECRET, user.id);
    expect(tok.length).toBeLessThanOrEqual(64);
    expect(tok).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(readStartToken(AUTH_SECRET, tok)).toEqual({ userId: user.id });
    const forged = `${tok.slice(0, -1)}${tok.endsWith("0") ? "1" : "0"}`;
    expect(readStartToken(AUTH_SECRET, forged)).toEqual({ error: "invalid" });
    expect(readStartToken(AUTH_SECRET, tok, Date.now() + 2 * 86400_000)).toEqual({ error: "expired" });
  });

  it("тарифи в Stars; оформлення — посилання на бота", async () => {
    const plans = await t.request<{ provider: string; plans: { amount: number; currency: string }[] }>(
      "GET",
      "/v1/premium/plans",
    );
    expect(plans.body).toMatchObject({ provider: "telegram", plans: [{ amount: 150, currency: "XTR" }] });
    const res = await t.request<{ type: string; url: string }>("POST", "/v1/premium/checkout", {
      cookie: user.cookie,
      body: { planId: "premium_month" },
    });
    expect(res.body.type).toBe("redirect");
    expect(res.body.url).toMatch(/^https:\/\/t\.me\/nowl_test_bot\?start=/);
  });

  it("вебхук без правильного секрету — 401, у Telegram нічого не надсилається", async () => {
    mockTelegram();
    expect((await hook({ update_id: 1 }, "wrong-secret-0123456789")).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("/start з токеном — рахунок-підписка на 30 днів у Stars", async () => {
    mockTelegram();
    const checkout = await t.request<{ url: string }>("POST", "/v1/premium/checkout", {
      cookie: user.cookie,
      body: { planId: "premium_month" },
    });
    const token = new URL(checkout.body.url).searchParams.get("start");
    expect((await hook(text(2, `/start ${token}`))).status).toBe(200);
    expect(calls.find((c) => c.method === "createInvoiceLink")?.body).toMatchObject({
      currency: "XTR",
      payload: `premium:${user.id}`,
      prices: [{ amount: 150 }],
      subscription_period: 2592000,
    });
    const msg = calls.find((c) => c.method === "sendMessage")!;
    expect(String(msg.body.text)).toContain("Dima");
    expect(JSON.stringify(msg.body.reply_markup)).toContain("https://t.me/$invoice123");
  });

  it("/start без токена або з підробленим — підказка відкрити сайт, без рахунку", async () => {
    mockTelegram();
    await hook(text(3, "/start"));
    await hook(text(4, "/start abcdefgh-zzzz-0000000000000000"));
    expect(calls.filter((c) => c.method === "createInvoiceLink")).toHaveLength(0);
    expect(calls.filter((c) => c.method === "sendMessage")).toHaveLength(2);
  });

  it("pre_checkout: правильна ціна — ok; інша ціна чи невідомий акаунт — відмова", async () => {
    mockTelegram();
    const q = (amount: number, payload: string) => ({
      update_id: 5,
      pre_checkout_query: { id: "q1", from, currency: "XTR", total_amount: amount, invoice_payload: payload },
    });
    await hook(q(150, `premium:${user.id}`));
    await hook(q(99, `premium:${user.id}`));
    await hook(q(150, "premium:Nobody0000000000"));
    const answers = calls.filter((c) => c.method === "answerPreCheckoutQuery").map((c) => c.body.ok);
    expect(answers).toEqual([true, false, false]);
  });

  it("оплата → преміум до дати Telegram; повтор тієї ж оплати не зараховується; продовження", async () => {
    mockTelegram();
    const exp1 = Math.floor(Date.now() / 1000) + 30 * 86400;
    const first = paid("ch_1", {
      is_recurring: true,
      is_first_recurring: true,
      subscription_expiration_date: exp1,
    });
    expect((await hook(first)).status).toBe(200);
    const sub = await subscription();
    expect(sub).toMatchObject({ active: true, provider: "telegram", cancelAtPeriodEnd: false });
    expect(new Date(sub.until!).getTime()).toBe(exp1 * 1000);

    await hook(first);
    expect(await t.db.select().from(payments)).toHaveLength(1);

    const exp2 = exp1 + 30 * 86400;
    await hook(paid("ch_2", { is_recurring: true, subscription_expiration_date: exp2 }));
    expect(new Date((await subscription()).until!).getTime()).toBe(exp2 * 1000);
    const kinds = (await t.db.select().from(payments)).map((p) => p.kind).sort();
    expect(kinds).toEqual(["first", "renewal"]);
    // повідомлення в бот: «готово» і «продовжено»; за повтор — нічого
    expect(calls.filter((c) => c.method === "sendMessage")).toHaveLength(2);
  });

  it("скасування з сайту скасовує й у Telegram (id першої оплати); відновлення", async () => {
    mockTelegram();
    const off = await t.request<Sub>("POST", "/v1/premium/cancel", { cookie: user.cookie });
    expect(off.body).toMatchObject({ active: true, cancelAtPeriodEnd: true });
    expect(calls.at(-1)).toMatchObject({
      method: "editUserStarSubscription",
      body: { user_id: 777, telegram_payment_charge_id: "ch_1", is_canceled: true },
    });
    const on = await t.request<Sub>("POST", "/v1/premium/resume", { cookie: user.cookie });
    expect(on.body.cancelAtPeriodEnd).toBe(false);
    expect(calls.at(-1)?.body.is_canceled).toBe(false);
  });

  it("Telegram не прийняв скасування — помилка, стан не змінюється", async () => {
    mockTelegram();
    failRenewalChange = true;
    const res = await t.request("POST", "/v1/premium/cancel", { cookie: user.cookie });
    failRenewalChange = false;
    expect(res.status).toBe(502);
    // пробував обидва id: першої й останньої оплати
    const tried = calls
      .filter((c) => c.method === "editUserStarSubscription")
      .map((c) => c.body.telegram_payment_charge_id);
    expect(tried).toEqual(["ch_1", "ch_2"]);
    expect((await subscription()).cancelAtPeriodEnd).toBe(false);
  });

  it("текст у бота — звернення в баг-репорти; повернення коштів вимикає преміум", async () => {
    mockTelegram();
    await hook(text(8, "Оплатив, а преміуму нема"));
    const reports = await t.db.select().from(bugReports);
    expect(reports.at(-1)).toMatchObject({ userId: user.id, description: "Оплатив, а преміуму нема" });

    await hook({
      update_id: 9,
      message: {
        message_id: 10,
        chat,
        from,
        refunded_payment: {
          currency: "XTR",
          total_amount: 150,
          invoice_payload: `premium:${user.id}`,
          telegram_payment_charge_id: "ch_2",
        },
      },
    });
    expect((await subscription()).active).toBe(false);
  });
});
