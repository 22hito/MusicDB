import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./harness";

let t: TestApp;
let user: { cookie: string; id: string };

beforeAll(async () => {
  t = await createTestApp();
  user = await t.signUp("desk@test.dev", "Desk");
});
afterAll(() => t.close());

describe("вхід у застосунок через браузер", () => {
  it("код лише з входом; обмін — cookie сесії, один раз", async () => {
    expect((await t.request("POST", "/v1/desktop/code")).status).toBe(401);

    const { body } = await t.request<{ code: string }>("POST", "/v1/desktop/code", { cookie: user.cookie });
    expect(body.code).toMatch(/^[A-Za-z0-9]{32}$/);

    const ex = await t.request<{ name: string; value: string }>("POST", "/v1/desktop/exchange", {
      body: { code: body.code },
    });
    expect(ex.status).toBe(200);
    expect(ex.body.name).toMatch(/nowl\.session_token$/);
    // з цим cookie API впізнає користувача
    const me = await t.request<{ id: string }>("GET", "/v1/me", {
      cookie: `${ex.body.name}=${ex.body.value}`,
    });
    expect(me.body.id).toBe(user.id);

    const again = await t.request("POST", "/v1/desktop/exchange", { body: { code: body.code } });
    expect(again.status).toBe(410);
    expect((await t.request("POST", "/v1/desktop/exchange", { body: { code: "x" } })).status).toBe(400);
  });

  it("пара: застосунок чекає ключ, сайт прив'язує вхід, ключ спрацьовує один раз", async () => {
    const pair = "P".repeat(32);
    expect((await t.request("POST", "/v1/desktop/claim", { body: { pair } })).status).toBe(404);
    const linked = await t.request("POST", "/v1/desktop/code", { cookie: user.cookie, body: { pair } });
    expect(linked.status).toBe(200);
    const got = await t.request<{ name: string; value: string }>("POST", "/v1/desktop/claim", {
      body: { pair },
    });
    expect(got.status).toBe(200);
    const me = await t.request<{ id: string }>("GET", "/v1/me", {
      cookie: `${got.body.name}=${got.body.value}`,
    });
    expect(me.body.id).toBe(user.id);
    expect((await t.request("POST", "/v1/desktop/claim", { body: { pair } })).status).toBe(404);
  });
});
