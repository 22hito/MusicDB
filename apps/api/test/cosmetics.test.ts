import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Me, Profile } from "@musicdb/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runFfmpeg } from "../src/services/audio";
import { processCosmetic } from "../src/services/cosmetics";
import { createTestApp, type TestApp } from "./harness";

let t: TestApp;
let owner: { cookie: string; id: string };
let viewer: { cookie: string; id: string };
let admin: { cookie: string; id: string };

beforeAll(async () => {
  t = await createTestApp();
  admin = await t.signUp("admin@test.dev");
  owner = await t.signUp("owner@test.dev");
  viewer = await t.signUp("viewer@test.dev");
});
afterAll(() => t.close());

/** Завантажує файл як джерело оформлення (той самий шлях, що й у клієнта). */
async function uploadCosmetic(file: Buffer, name: string, mime: string) {
  const created = await t.request<{ uploadId: string }>("POST", "/v1/uploads", {
    cookie: owner.cookie,
    body: { purpose: "cosmetic", fileName: name, mimeType: mime, sizeBytes: file.length },
  });
  const [asset] = await t.db.query.assets.findMany({ where: (a, { eq }) => eq(a.id, created.body.uploadId) });
  await t.storage.put(asset!.storageKey, file, mime);
  await t.request("POST", `/v1/uploads/${created.body.uploadId}/complete`, { cookie: owner.cookie });
  return created.body.uploadId;
}

describe("оформлення Premium", () => {
  it("без Premium — 403", async () => {
    const res = await t.request<{ code: string }>("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "banner", preset: "aurora" },
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("premium_required");
  });

  it("готовий фон: бачить і власник, і відвідувачі профілю", async () => {
    await t.request("POST", "/v1/premium/checkout", {
      cookie: owner.cookie,
      body: { planId: "premium_month" },
    });
    const me = await t.request<Me>("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "background", preset: "nebula" },
    });
    expect(me.body.cosmetics.background).toMatchObject({ preset: "nebula", status: "ready" });
    const profile = await t.request<Profile>("GET", `/v1/users/${owner.id}`, { cookie: viewer.cookie });
    expect(profile.body.cosmetics?.background?.preset).toBe("nebula");
  });

  it("для аватара готових фонів немає", async () => {
    const res = await t.request("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "avatar", preset: "aurora" },
    });
    expect(res.status).toBe(400);
  });

  it("GIF → анімований WebP і перший кадр; фон сайту — ще й вертикальний варіант", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nowl-gif-"));
    const gif = join(dir, "a.gif");
    await runFfmpeg(["-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=10", "-t", "1", gif]);
    const file = readFileSync(gif);

    const avatarUpload = await uploadCosmetic(file, "a.gif", "image/gif");
    const pending = await t.request<Me>("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "avatar", uploadId: avatarUpload },
    });
    expect(pending.body.cosmetics.avatar?.status).toBe("processing");
    expect(t.jobs.queued.at(-1)).toMatchObject({ queue: "media.cosmetic" });
    await processCosmetic(t.deps, { userId: owner.id, slot: "avatar", assetId: avatarUpload });
    const done = await t.request<Me>("GET", "/v1/me", { cookie: owner.cookie });
    expect(done.body.cosmetics.avatar).toMatchObject({ status: "ready", preset: null });
    expect(done.body.cosmetics.avatar?.anim).toMatch(/\/v1\/media\//);
    expect(done.body.cosmetics.avatar?.poster).toMatch(/\/v1\/media\//);

    const siteUpload = await uploadCosmetic(file, "b.gif", "image/gif");
    await t.request("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "siteBackground", uploadId: siteUpload },
    });
    await processCosmetic(t.deps, { userId: owner.id, slot: "siteBackground", assetId: siteUpload });
    const site = await t.request<Me>("GET", "/v1/me", { cookie: owner.cookie });
    expect(site.body.cosmetics.siteBackground?.animPortrait).toBeTruthy();

    // Фон сайту приватний, аватар — публічний.
    const profile = await t.request<Profile & { cosmetics: Record<string, unknown> | null }>(
      "GET",
      `/v1/users/${owner.id}`,
      { cookie: viewer.cookie },
    );
    expect(profile.body.cosmetics?.avatar).toBeTruthy();
    expect(profile.body.cosmetics).not.toHaveProperty("siteBackground");

    // Готовий файл віддається як картинка.
    const media = await t.app.request(done.body.cosmetics.avatar!.anim!.replace(/^https?:\/\/[^/]+/, ""));
    expect(media.status).toBe(302);
  });

  it("прибрати оформлення", async () => {
    const me = await t.request<Me>("PUT", "/v1/me/cosmetics", {
      cookie: owner.cookie,
      body: { slot: "background", preset: null, uploadId: null },
    });
    expect(me.body.cosmetics.background).toBeNull();
  });

  it("після закінчення Premium відвідувачі не бачать оформлення, але воно збережене", async () => {
    await t.request("PATCH", `/v1/admin/users/${owner.id}`, {
      cookie: admin.cookie,
      body: { premiumDays: 0 },
    });
    const profile = await t.request<Profile>("GET", `/v1/users/${owner.id}`, { cookie: viewer.cookie });
    expect(profile.body.cosmetics).toBeNull();
    const me = await t.request<Me>("GET", "/v1/me", { cookie: owner.cookie });
    expect(me.body.cosmetics.avatar?.status).toBe("ready");
  });
});
