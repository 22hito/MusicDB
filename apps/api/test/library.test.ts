import type { Me, Page, Playlist, PlaylistDetail, Rating, Track } from "@musicdb/contracts";
import { trackArtists, tracks } from "@musicdb/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;
let alice: { cookie: string; id: string };
let bob: { cookie: string; id: string };

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
  alice = await t.signUp("alice@test.dev", "Alice");
  bob = await t.signUp("bob@test.dev", "Bob");
});
afterAll(() => t.close());

describe("акаунт", () => {
  it("без входу — 401", async () => {
    const res = await t.request<{ code: string }>("GET", "/v1/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("unauthorized");
  });

  it("профіль, зміна імені користувача й унікальність", async () => {
    const me = await t.request<Me>("GET", "/v1/me", { cookie: alice.cookie });
    expect(me.body).toMatchObject({ email: "alice@test.dev", role: "user", premium: { active: false } });
    const upd = await t.request<Me>("PATCH", "/v1/me", {
      cookie: alice.cookie,
      body: { username: "Alice.W", bio: "Слухаю рок" },
    });
    expect(upd.body.username).toBe("alice.w");
    const clash = await t.request<{ code: string }>("PATCH", "/v1/me", {
      cookie: bob.cookie,
      body: { username: "alice.w" },
    });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe("username_taken");
  });

  it("email з ADMIN_EMAILS отримує роль admin", async () => {
    const admin = await t.signUp("admin@test.dev");
    const me = await t.request<Me>("GET", "/v1/me", { cookie: admin.cookie });
    expect(me.body.role).toBe("admin");
  });

  it("список пристроїв містить поточну сесію", async () => {
    const res = await t.request<{ items: { current: boolean }[] }>("GET", "/v1/me/sessions", {
      cookie: alice.cookie,
    });
    expect(res.body.items.some((x) => x.current)).toBe(true);
  });
});

describe("бібліотека", () => {
  it("вподобання: ідемпотентно, список, id, лічильник", async () => {
    await t.request("PUT", `/v1/me/tracks/${s.tracks.numb.id}`, { cookie: alice.cookie });
    await t.request("PUT", `/v1/me/tracks/${s.tracks.numb.id}`, { cookie: alice.cookie });
    await t.request("PUT", `/v1/me/tracks/${s.tracks.moses.id}`, { cookie: alice.cookie });
    const ids = await t.request<{ ids: string[] }>("GET", "/v1/me/tracks/ids", { cookie: alice.cookie });
    expect(ids.body.ids.sort()).toEqual([s.tracks.numb.id, s.tracks.moses.id].sort());
    const list = await t.request<Page<{ track: Track }>>("GET", "/v1/me/tracks?limit=1", {
      cookie: alice.cookie,
    });
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]!.track.id).toBe(s.tracks.moses.id);
    const next = await t.request<Page<{ track: Track }>>(
      "GET",
      `/v1/me/tracks?limit=1&cursor=${list.body.nextCursor}`,
      {
        cookie: alice.cookie,
      },
    );
    expect(next.body.items[0]!.track.id).toBe(s.tracks.numb.id);
    const detail = await t.request<{ likeCount: number; viewer: { liked: boolean } }>(
      "GET",
      `/v1/tracks/${s.tracks.numb.id}`,
      {
        cookie: alice.cookie,
      },
    );
    expect(detail.body).toMatchObject({ likeCount: 1, viewer: { liked: true } });
    await t.request("DELETE", `/v1/me/tracks/${s.tracks.moses.id}`, { cookie: alice.cookie });
    const after = await t.request<{ ids: string[] }>("GET", "/v1/me/tracks/ids", { cookie: alice.cookie });
    expect(after.body.ids).toEqual([s.tracks.numb.id]);
  });

  it("підписка на виконавця й бібліотека для бічної панелі", async () => {
    await t.request("PUT", `/v1/me/following/artists/${s.artists.lp.id}`, { cookie: alice.cookie });
    await t.request("PUT", `/v1/me/releases/${s.releases.sempiternal.id}`, { cookie: alice.cookie });
    const lib = await t.request<{
      likedCount: number;
      artists: { name: string; followerCount: number }[];
      releases: { title: string }[];
    }>("GET", "/v1/me/library", { cookie: alice.cookie });
    expect(lib.body.likedCount).toBe(1);
    expect(lib.body.artists).toMatchObject([{ name: "Linkin Park", followerCount: 1 }]);
    expect(lib.body.releases.map((r) => r.title)).toEqual(["Sempiternal"]);
  });

  it("прослуховування зараховується після 30 с і не двічі поспіль", async () => {
    const short = await t.request<{ counted: boolean }>("POST", "/v1/plays", {
      cookie: alice.cookie,
      body: { trackId: s.tracks.faint.id, msPlayed: 10_000 },
    });
    expect(short.body.counted).toBe(false);
    const ok = await t.request<{ counted: boolean }>("POST", "/v1/plays", {
      cookie: alice.cookie,
      body: {
        trackId: s.tracks.faint.id,
        msPlayed: 31_000,
        context: { type: "album", id: s.releases.meteora.id },
      },
    });
    expect(ok.status).toBe(202);
    expect(ok.body.counted).toBe(true);
    const again = await t.request<{ counted: boolean }>("POST", "/v1/plays", {
      cookie: alice.cookie,
      body: { trackId: s.tracks.faint.id, msPlayed: 40_000 },
    });
    expect(again.body.counted).toBe(false);
    const history = await t.request<Page<{ track: Track; context: { type: string } }>>(
      "GET",
      "/v1/me/history",
      { cookie: alice.cookie },
    );
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0]!.context).toEqual({ type: "album", id: s.releases.meteora.id });
    const track = await t.request<Track>("GET", `/v1/tracks/${s.tracks.faint.id}`);
    expect(track.body.playCount).toBe(1);
  });

  it("головна з персональними полицями після прослуховувань", async () => {
    const res = await t.request<{ shelves: { id: string }[] }>("GET", "/v1/home", { cookie: alice.cookie });
    expect(res.body.shelves[0]!.id).toBe("recent");
  });
});

describe("плейлисти", () => {
  let playlist: Playlist;

  it("створення з треками, порядок і тривалість", async () => {
    const res = await t.request<Playlist>("POST", "/v1/playlists", {
      cookie: alice.cookie,
      body: { title: "Ранок", trackIds: [s.tracks.numb.id, s.tracks.moses.id] },
    });
    expect(res.status).toBe(201);
    playlist = res.body;
    expect(playlist).toMatchObject({ trackCount: 2, durationMs: 185_000 + 245_000, visibility: "private" });
    expect(playlist.mosaic).toHaveLength(2);
  });

  it("вставка після елемента, переміщення на початок, видалення", async () => {
    const detail = await t.request<PlaylistDetail>("GET", `/v1/playlists/${playlist.id}`, {
      cookie: alice.cookie,
    });
    const [first] = detail.body.items;
    await t.request("POST", `/v1/playlists/${playlist.id}/items`, {
      cookie: alice.cookie,
      body: { trackIds: [s.tracks.faint.id], afterItemId: first!.id },
    });
    let d = await t.request<PlaylistDetail>("GET", `/v1/playlists/${playlist.id}`, { cookie: alice.cookie });
    expect(d.body.items.map((i) => i.track.title)).toEqual(["Numb", "Faint", "Shadow Moses"]);
    const moses = d.body.items[2]!;
    await t.request("PATCH", `/v1/playlists/${playlist.id}/items/${moses.id}`, {
      cookie: alice.cookie,
      body: { afterItemId: null },
    });
    d = await t.request<PlaylistDetail>("GET", `/v1/playlists/${playlist.id}`, { cookie: alice.cookie });
    expect(d.body.items.map((i) => i.track.title)).toEqual(["Shadow Moses", "Numb", "Faint"]);
    await t.request("DELETE", `/v1/playlists/${playlist.id}/items/${d.body.items[1]!.id}`, {
      cookie: alice.cookie,
    });
    d = await t.request<PlaylistDetail>("GET", `/v1/playlists/${playlist.id}`, { cookie: alice.cookie });
    expect(d.body.items.map((i) => i.track.title)).toEqual(["Shadow Moses", "Faint"]);
    expect(d.body.trackCount).toBe(2);
    expect(d.body.viewer).toEqual({ isOwner: true, canEdit: true, following: false });
  });

  it("приватний плейлист не видно іншим; публічний — видно й можна зберегти", async () => {
    const hidden = await t.request("GET", `/v1/playlists/${playlist.id}`, { cookie: bob.cookie });
    expect(hidden.status).toBe(404);
    await t.request("PATCH", `/v1/playlists/${playlist.id}`, {
      cookie: alice.cookie,
      body: { visibility: "public" },
    });
    const visible = await t.request<PlaylistDetail>("GET", `/v1/playlists/${playlist.id}`, {
      cookie: bob.cookie,
    });
    expect(visible.status).toBe(200);
    expect(visible.body.viewer!.canEdit).toBe(false);
    const edit = await t.request<{ code: string }>("POST", `/v1/playlists/${playlist.id}/items`, {
      cookie: bob.cookie,
      body: { trackIds: [s.tracks.heart.id] },
    });
    expect(edit.status).toBe(403);
    await t.request("PUT", `/v1/playlists/${playlist.id}/follow`, { cookie: bob.cookie });
    const lib = await t.request<{ playlists: { id: string }[] }>("GET", "/v1/me/library", {
      cookie: bob.cookie,
    });
    expect(lib.body.playlists.map((p) => p.id)).toContain(playlist.id);
    const search = await t.request<{ playlists: { id: string }[] }>(
      "GET",
      "/v1/search?q=ранок&types=playlist",
    );
    expect(search.body.playlists.map((p) => p.id)).toEqual([playlist.id]);
  });

  it("спільний плейлист можуть редагувати друзі (взаємна підписка)", async () => {
    await t.request("PATCH", `/v1/playlists/${playlist.id}`, {
      cookie: alice.cookie,
      body: { collaborative: true },
    });
    const before = await t.request("POST", `/v1/playlists/${playlist.id}/items`, {
      cookie: bob.cookie,
      body: { trackIds: [s.tracks.heart.id] },
    });
    expect(before.status).toBe(403);
    await t.request("PUT", `/v1/users/${alice.id}/follow`, { cookie: bob.cookie });
    await t.request("PUT", `/v1/users/${bob.id}/follow`, { cookie: alice.cookie });
    const after = await t.request<{ items: { addedBy: { name: string } }[] }>(
      "POST",
      `/v1/playlists/${playlist.id}/items`,
      {
        cookie: bob.cookie,
        body: { trackIds: [s.tracks.heart.id] },
      },
    );
    expect(after.status).toBe(201);
    expect(after.body.items[0]!.addedBy.name).toBe("Bob");
  });
});

describe("оцінки", () => {
  it("оцінка з рецензією, середнє, гістограма, видалення", async () => {
    const put = await t.request<Rating>("PUT", `/v1/tracks/${s.tracks.numb.id}/rating`, {
      cookie: alice.cookie,
      body: { score: 90, review: "Класика" },
    });
    expect(put.body).toMatchObject({ score: 90, review: "Класика" });
    await t.request("PUT", `/v1/tracks/${s.tracks.numb.id}/rating`, {
      cookie: bob.cookie,
      body: { score: 71 },
    });
    const list = await t.request<{
      items: Rating[];
      summary: { average: number; count: number; histogram: number[] };
    }>("GET", `/v1/tracks/${s.tracks.numb.id}/ratings`);
    expect(list.body.summary.average).toBe(80.5);
    expect(list.body.summary.count).toBe(2);
    expect(list.body.summary.histogram[9]).toBe(1);
    expect(list.body.summary.histogram[7]).toBe(1);
    const reviews = await t.request<{ items: Rating[] }>(
      "GET",
      `/v1/tracks/${s.tracks.numb.id}/ratings?withReview=true`,
    );
    expect(reviews.body.items).toHaveLength(1);
    const bad = await t.request("PUT", `/v1/tracks/${s.tracks.numb.id}/rating`, {
      cookie: bob.cookie,
      body: { score: 101 },
    });
    expect(bad.status).toBe(422);
    await t.request("DELETE", `/v1/tracks/${s.tracks.numb.id}/rating`, { cookie: bob.cookie });
    const track = await t.request<Track>("GET", `/v1/tracks/${s.tracks.numb.id}`);
    expect(track.body.rating).toEqual({ average: 90, count: 1 });
  });
});

describe("рекомендації", () => {
  it("працюють, коли у вподобаних треків немає жанрів (без порожнього CASE у SQL)", async () => {
    const fresh = await t.signUp("nogenre@test.dev");
    const [bare] = await t.db
      .insert(tracks)
      .values({ title: "Без жанру", youtubeVideoId: "bbbbbbbbbbb" })
      .returning();
    await t.db.insert(trackArtists).values({ trackId: bare!.id, artistId: s.artists.oe.id });
    await t.request("PUT", `/v1/me/tracks/${bare!.id}`, { cookie: fresh.cookie });
    const res = await t.request<{ items: Track[] }>("GET", "/v1/me/recommendations", {
      cookie: fresh.cookie,
    });
    expect(res.status).toBe(200);
    const home = await t.request<{ shelves: { id: string }[] }>("GET", "/v1/home", { cookie: fresh.cookie });
    expect(home.status).toBe(200);
  });

  it("на головній немає «Підібрано для вас», поки смак невідомий", async () => {
    const newbie = await t.signUp("newbie@test.dev");
    const home = await t.request<{ shelves: { id: string }[] }>("GET", "/v1/home", { cookie: newbie.cookie });
    expect(home.body.shelves.map((x) => x.id)).not.toContain("for-you");
  });

  it("на основі вподобаного, без уже вподобаних треків, з поясненням", async () => {
    const res = await t.request<{ items: (Track & { reason: string })[] }>("GET", "/v1/me/recommendations", {
      cookie: alice.cookie,
    });
    expect(res.status).toBe(200);
    const ids = res.body.items.map((x) => x.id);
    expect(ids).not.toContain(s.tracks.numb.id);
    expect(res.body.items.every((x) => x.reason.length > 0)).toBe(true);
  });
});
