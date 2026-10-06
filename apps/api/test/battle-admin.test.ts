import type { AdminTrackDetail, AdminTrackRow, Page } from "@musicdb/contracts";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;
let alice: { cookie: string; id: string };
let bob: { cookie: string; id: string };
let admin: { cookie: string; id: string };

type Stats = { trackId: string; wins: number; mine: number };

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
  alice = await t.signUp("alice@test.dev", "Alice");
  bob = await t.signUp("bob@test.dev", "Bob");
  admin = await t.signUp("admin@test.dev", "Admin");
});
afterAll(() => t.close());

describe("перемоги в батл роялі", () => {
  it("зараховуються пісні; той самий турнір — один раз; загальні й мої", async () => {
    const numb = s.tracks.numb.id;
    const win = (cookie: string, battleKey: string) =>
      t.request<Stats>("POST", "/v1/battle/wins", {
        cookie,
        body: { trackId: numb, battleKey, poolSize: 16, poolTitle: "rock" },
      });
    expect((await win(alice.cookie, "aaaa1111bbbb")).body).toMatchObject({ wins: 1, mine: 1 });
    // повторне надсилання того самого турніру (оновили сторінку)
    expect((await win(alice.cookie, "aaaa1111bbbb")).body).toMatchObject({ wins: 1, mine: 1 });
    expect((await win(alice.cookie, "cccc2222dddd")).body).toMatchObject({ wins: 2, mine: 2 });
    expect((await win(bob.cookie, "aaaa1111bbbb")).body).toMatchObject({ wins: 3, mine: 1 });

    const anon = await t.request<Stats>("GET", `/v1/tracks/${numb}/battle-wins`);
    expect(anon.body).toEqual({ trackId: numb, wins: 3, mine: 0 });
    const mine = await t.request<Stats>("GET", `/v1/tracks/${numb}/battle-wins`, { cookie: alice.cookie });
    expect(mine.body.mine).toBe(2);
  });

  it("без входу не зараховується; невідомий трек — 404", async () => {
    const res = await t.request("POST", "/v1/battle/wins", {
      body: { trackId: s.tracks.numb.id, battleKey: "eeee3333ffff", poolSize: 8 },
    });
    expect(res.status).toBe(401);
    const missing = await t.request("POST", "/v1/battle/wins", {
      cookie: alice.cookie,
      body: { trackId: "nope_nope_nope00", battleKey: "eeee3333ffff", poolSize: 8 },
    });
    expect(missing.status).toBe(404);
  });
});

describe("адмінка: редагування пісень", () => {
  it("лише для адміна", async () => {
    const res = await t.request("GET", "/v1/admin/tracks", { cookie: alice.cookie });
    expect(res.status).toBe(403);
  });

  it("список: пошук за виконавцем, фільтр «без відео», загальна кількість", async () => {
    const all = await t.request<Page<AdminTrackRow> & { total: number }>("GET", "/v1/admin/tracks", {
      cookie: admin.cookie,
    });
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(6);
    const lp = await t.request<Page<AdminTrackRow> & { total: number }>(
      "GET",
      "/v1/admin/tracks?q=linkin&sort=title",
      { cookie: admin.cookie },
    );
    expect(lp.body.items.map((x) => x.title)).toEqual(["Faint", "Numb", "Somewhere I Belong"]);
    expect(lp.body.items[1]).toMatchObject({ artists: ["Linkin Park"], releaseTitle: "Meteora" });
    const noVideo = await t.request<Page<AdminTrackRow>>("GET", "/v1/admin/tracks?missing=video", {
      cookie: admin.cookie,
    });
    expect(noVideo.body.items.map((x) => x.title).sort()).toEqual([
      "Can You Feel My Heart",
      "Somewhere I Belong",
    ]);
  });

  it("часткова зміна не затирає жанри й explicit; приховування й повернення", async () => {
    const id = s.tracks.numb.id;
    const before = await t.request<AdminTrackDetail>("GET", `/v1/admin/tracks/${id}`, {
      cookie: admin.cookie,
    });
    expect(before.body.genres.length).toBeGreaterThan(0);
    await t.request("PATCH", `/v1/admin/tracks/${id}`, { cookie: admin.cookie, body: { explicit: true } });
    const upd = await t.request<AdminTrackDetail>("PATCH", `/v1/admin/tracks/${id}`, {
      cookie: admin.cookie,
      body: { title: "Numb (Remastered)" },
    });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({
      title: "Numb (Remastered)",
      explicit: true,
      genres: before.body.genres,
    });

    const hidden = await t.request<AdminTrackDetail>("PATCH", `/v1/admin/tracks/${id}`, {
      cookie: admin.cookie,
      body: { status: "hidden", releaseDate: null, lyricsSynced: "[00:01.00]Numb" },
    });
    expect(hidden.body).toMatchObject({ status: "hidden", lyricsSynced: "[00:01.00]Numb", hasLyrics: true });
    expect((await t.request("GET", `/v1/tracks/${id}`)).status).toBe(404);
    const back = await t.request<AdminTrackDetail>("PATCH", `/v1/admin/tracks/${id}`, {
      cookie: admin.cookie,
      body: { status: "published" },
    });
    expect(back.body.status).toBe("published");
    expect((await t.request("GET", `/v1/tracks/${id}`)).status).toBe(200);
  });

  it("розбіжність звірки: позначити перевіреною вручну й повернути", async () => {
    const id = s.tracks.faint.id;
    await t.db.execute(sql`insert into catalog_checks (entity_type, entity_id, status, conflicts)
      values ('track', ${id}, 'conflict', '{"releaseDate":{"db":"2003-03-25","deezer":"2003-06-09"}}'::jsonb)`);
    const ids = async (check: string) =>
      (
        await t.request<Page<AdminTrackRow>>("GET", `/v1/admin/tracks?check=${check}`, {
          cookie: admin.cookie,
        })
      ).body.items.map((x) => x.id);
    expect(await ids("conflict")).toContain(id);

    const denied = await t.request("POST", `/v1/admin/tracks/${id}/check`, {
      cookie: alice.cookie,
      body: { resolved: true },
    });
    expect(denied.status).toBe(403);

    const done = await t.request<AdminTrackDetail>("POST", `/v1/admin/tracks/${id}/check`, {
      cookie: admin.cookie,
      body: { resolved: true },
    });
    expect(done.body.check).toMatchObject({ status: "resolved", resolvedBy: "Admin" });
    expect(await ids("conflict")).not.toContain(id);
    expect(await ids("resolved")).toContain(id);

    const back = await t.request<AdminTrackDetail>("POST", `/v1/admin/tracks/${id}/check`, {
      cookie: admin.cookie,
      body: { resolved: false },
    });
    expect(back.body.check).toMatchObject({ status: "conflict", resolvedBy: null });
    expect(back.body.check?.conflicts).toHaveProperty("releaseDate");
    expect(await ids("conflict")).toContain(id);

    // Ще не звірену пісню позначити не можна — нічого не змінюється.
    const unchecked = await t.request<AdminTrackDetail>(
      "POST",
      `/v1/admin/tracks/${s.tracks.numb.id}/check`,
      {
        cookie: admin.cookie,
        body: { resolved: true },
      },
    );
    expect(unchecked.body.check).toBeNull();
  });
});
