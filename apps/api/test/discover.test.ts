/** Розділи відкриття: каталог, статистика, машина часу, чарт з рухом, плейлисти для батлу, смак, спільне, моя статистика. */
import type {
  Artist,
  CatalogStats,
  ChartEntry,
  Era,
  MyStats,
  Page,
  Playlist,
  Taste,
  Timeline,
  Track,
} from "@musicdb/contracts";
import { plays, trackLikes } from "@musicdb/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
});
afterAll(() => t.close());

describe("таблиця каталогу", () => {
  it("текстовий фільтр: назва, виконавець, альбом; кілька слів — усі мають збігтися", async () => {
    const byArtist = await t.request<Page<Track>>("GET", "/v1/tracks?q=linkin&column=title");
    expect(byArtist.body.items.map((x) => x.title)).toEqual(["Faint", "Numb", "Somewhere I Belong"]);
    const byAlbum = await t.request<Page<Track>>("GET", "/v1/tracks?q=sempiternal&column=title");
    expect(byAlbum.body.items.map((x) => x.title)).toEqual(["Can You Feel My Heart", "Shadow Moses"]);
    const twoWords = await t.request<Page<Track>>("GET", "/v1/tracks?q=linkin%20numb");
    expect(twoWords.body.items.map((x) => x.title)).toEqual(["Numb"]);
    const cyrillic = await t.request<Page<Track>>("GET", "/v1/tracks?q=океан");
    expect(cyrillic.body.items.map((x) => x.title)).toEqual(["Обійми"]);
    const percent = await t.request<Page<Track>>("GET", "/v1/tracks?q=%25");
    expect(percent.body.items).toEqual([]);
  });

  it("сортування за колонкою в обидва боки", async () => {
    const asc = await t.request<Page<Track>>("GET", "/v1/tracks?column=duration&dir=asc&limit=2");
    expect(asc.body.items.map((x) => x.title)).toEqual(["Faint", "Numb"]);
    const desc = await t.request<Page<Track>>("GET", "/v1/tracks?column=artist&dir=desc&limit=1");
    expect(desc.body.items[0]!.artists[0]!.name).toBe("Океан Ельзи");
  });

  it("випадковий порядок стабільний для одного зерна й без повторів між сторінками", async () => {
    const first = await t.request<Page<Track>>("GET", "/v1/tracks?sort=random&seed=abc&limit=3");
    const again = await t.request<Page<Track>>("GET", "/v1/tracks?sort=random&seed=abc&limit=3");
    expect(again.body.items.map((x) => x.id)).toEqual(first.body.items.map((x) => x.id));
    const rest = await t.request<Page<Track>>(
      "GET",
      `/v1/tracks?sort=random&seed=abc&limit=3&cursor=${first.body.nextCursor}`,
    );
    const all = [...first.body.items, ...rest.body.items].map((x) => x.id);
    expect(new Set(all).size).toBe(6);
  });

  it("статистика каталогу", async () => {
    const res = await t.request<CatalogStats>("GET", "/v1/stats/catalog");
    expect(res.body).toEqual({ tracks: 6, genres: 3, albums: 2, singles: 0, artists: 3 });
    const audio = await t.request<CatalogStats>("GET", "/v1/stats/catalog?playable=audio");
    expect(audio.body.tracks).toBe(0);
  });

  it("виконавці: пошук і сортування", async () => {
    const found = await t.request<Page<Artist>>("GET", "/v1/artists?q=океан");
    expect(found.body.items.map((a) => a.name)).toEqual(["Океан Ельзи"]);
    const byTracks = await t.request<Page<Artist>>("GET", "/v1/artists?sort=tracks");
    expect(byTracks.body.items[0]!.name).toBe("Linkin Park");
    const za = await t.request<Page<Artist>>("GET", "/v1/artists?sort=name_desc");
    expect(za.body.items.map((a) => a.name)).toEqual(["Океан Ельзи", "Linkin Park", "Bring Me The Horizon"]);
  });
});

describe("машина часу й десятиліття", () => {
  it("шкала: роки й десятиліття з кількістю пісень (рік — трек або його реліз)", async () => {
    const res = await t.request<Timeline>("GET", "/v1/time-machine");
    expect(res.status).toBe(200);
    expect(res.body.decades).toEqual([
      { decade: 2000, tracks: 3, years: [{ year: 2003, tracks: 3 }] },
      { decade: 2010, tracks: 2, years: [{ year: 2013, tracks: 2 }] },
    ]);
  });

  it("епоха: пісні, альбоми, жанри й виконавці за рік або десятиліття", async () => {
    const year = await t.request<Era>("GET", "/v1/time-machine/2003/2003");
    expect(year.body.trackCount).toBe(3);
    expect(year.body.releases.map((r) => r.title)).toEqual(["Meteora"]);
    expect(year.body.artists[0]).toMatchObject({ name: "Linkin Park", eraTracks: 3 });
    expect(year.body.genres[0]).toMatchObject({ name: "nu metal", tracks: 3 });
    const decade = await t.request<Era>("GET", "/v1/time-machine/2010/2019");
    expect(decade.body.tracks.map((x) => x.title).sort()).toEqual(["Can You Feel My Heart", "Shadow Moses"]);
    const bad = await t.request("GET", "/v1/time-machine/1990/2010");
    expect(bad.status).toBe(400);
  });

  it("фільтр каталогу за десятиліттям", async () => {
    const res = await t.request<Page<Track>>("GET", "/v1/tracks?decade=2010&column=title");
    expect(res.body.items.map((x) => x.title)).toEqual(["Can You Feel My Heart", "Shadow Moses"]);
    const bad = await t.request("GET", "/v1/tracks?decade=2015");
    expect(bad.status).toBe(422);
  });
});

describe("топ, плейлисти для батлу, смак", () => {
  it("топ тижня — за кількістю різних слухачів, а не прослуховувань", async () => {
    const a = await t.signUp("top-a@test.dev");
    const b = await t.signUp("top-b@test.dev");
    await t.db.insert(plays).values([
      // Faint: 5 прослуховувань однієї людини; Numb: по одному від двох.
      ...Array.from({ length: 5 }, () => ({ userId: a.id, trackId: s.tracks.faint.id, msPlayed: 60_000 })),
      { userId: a.id, trackId: s.tracks.numb.id, msPlayed: 60_000 },
      { userId: b.id, trackId: s.tracks.numb.id, msPlayed: 60_000 },
    ]);
    const res = await t.request<{ items: (Track & { rank: number; plays: number; listeners: number })[] }>(
      "GET",
      "/v1/charts/top?period=week&limit=3",
    );
    const [first, second] = res.body.items;
    expect([first!.title, first!.listeners, first!.plays]).toEqual(["Numb", 2, 2]);
    expect([second!.title, second!.listeners, second!.plays]).toEqual(["Faint", 1, 5]);
  });

  it("публічні плейлисти з мінімальною кількістю пісень", async () => {
    const owner = await t.signUp("battle@test.dev");
    const trackIds = Object.values(s.tracks).map((x) => x.id);
    for (const [title, visibility, n] of [
      ["Великий", "public", 5],
      ["Малий", "public", 2],
      ["Таємний", "private", 6],
    ] as const) {
      await t.request("POST", "/v1/playlists", {
        cookie: owner.cookie,
        body: { title, visibility, trackIds: trackIds.slice(0, n) },
      });
    }
    const res = await t.request<Page<Playlist>>("GET", "/v1/playlists?minTracks=4");
    expect(res.body.items.map((p) => p.title)).toEqual(["Великий"]);
    const all = await t.request<Page<Playlist>>("GET", "/v1/playlists");
    expect(all.body.items.map((p) => p.title).sort()).toEqual(["Великий", "Малий"]);
  });

  it("смак: мій профіль, збіг, друзі й спільні улюблені", async () => {
    const me = await t.signUp("taste-me@test.dev");
    const other = await t.signUp("taste-other@test.dev");
    await t.db.insert(trackLikes).values([
      { userId: me.id, trackId: s.tracks.numb.id },
      { userId: me.id, trackId: s.tracks.faint.id },
      { userId: other.id, trackId: s.tracks.numb.id },
    ]);
    await t.request("PUT", `/v1/users/${other.id}/follow`, { cookie: me.cookie });
    await t.request("PUT", `/v1/users/${me.id}/follow`, { cookie: other.cookie });
    const res = await t.request<Taste>("GET", "/v1/me/taste", { cookie: me.cookie });
    expect(res.status).toBe(200);
    expect(res.body.me.likedCount).toBe(2);
    expect(res.body.me.topArtists[0]!.name).toBe("Linkin Park");
    expect(res.body.me.topGenres[0]!.name).toBe("nu metal");
    const match = res.body.items.find((x) => x.user.id === other.id)!;
    expect(match).toMatchObject({ friend: true, sharedFavorites: 1 });
    expect(match.match).toBeGreaterThan(50);
  });

  it("чарт за жанром: рух відносно минулого тижня і новинки за день", async () => {
    const c = await t.signUp("chart-c@test.dev");
    const d = await t.signUp("chart-d@test.dev");
    const ago = (days: number) => new Date(Date.now() - days * 86400_000);
    await t.db.insert(plays).values([
      // Минулий тиждень: Heart — 2 слухачі, Moses — 1.
      { userId: c.id, trackId: s.tracks.heart.id, msPlayed: 60_000, playedAt: ago(10) },
      { userId: d.id, trackId: s.tracks.heart.id, msPlayed: 60_000, playedAt: ago(10) },
      { userId: c.id, trackId: s.tracks.moses.id, msPlayed: 60_000, playedAt: ago(9) },
      // Цей тиждень: Moses — 2 слухачі (сьогодні), Heart — 1 (три дні тому).
      { userId: c.id, trackId: s.tracks.moses.id, msPlayed: 60_000 },
      { userId: d.id, trackId: s.tracks.moses.id, msPlayed: 60_000 },
      { userId: c.id, trackId: s.tracks.heart.id, msPlayed: 60_000, playedAt: ago(3) },
    ]);
    const week = await t.request<{ items: ChartEntry[] }>(
      "GET",
      "/v1/charts/top?period=week&genre=metalcore",
    );
    expect(week.body.items.map((x) => [x.title, x.rank, x.previousRank, x.isNew])).toEqual([
      ["Shadow Moses", 1, 2, false],
      ["Can You Feel My Heart", 2, 1, false],
    ]);
    const day = await t.request<{ items: ChartEntry[] }>("GET", "/v1/charts/top?period=day&genre=metalcore");
    expect(day.body.items[0]).toMatchObject({ title: "Shadow Moses", isNew: true, previousRank: null });
    // Добрана пісня без прослуховувань за день — не «новинка».
    expect(day.body.items[1]).toMatchObject({ title: "Can You Feel My Heart", isNew: false, plays: 0 });
    const all = await t.request<{ items: ChartEntry[] }>("GET", "/v1/charts/top?period=all&genre=metalcore");
    expect(all.body.items.every((x) => x.previousRank === null && !x.isNew)).toBe(true);
  });

  it("спільне з людиною: пісні, які подобаються або слухаються обом; приватний профіль — лише друзям", async () => {
    const me = await t.signUp("common-me@test.dev");
    const other = await t.signUp("common-other@test.dev");
    await t.db.insert(trackLikes).values([
      { userId: me.id, trackId: s.tracks.obiimy.id },
      { userId: other.id, trackId: s.tracks.obiimy.id },
      { userId: me.id, trackId: s.tracks.faint.id },
    ]);
    await t.db.insert(plays).values([
      { userId: other.id, trackId: s.tracks.faint.id, msPlayed: 60_000 },
      { userId: other.id, trackId: s.tracks.moses.id, msPlayed: 60_000 },
    ]);
    const res = await t.request<{ items: Track[] }>("GET", `/v1/users/${other.id}/common`, {
      cookie: me.cookie,
    });
    expect(res.status).toBe(200);
    // Обоє вподобали «Обійми» — вище, ніж «Faint» (вподобала я, слухала інша людина).
    expect(res.body.items.map((x) => x.title)).toEqual(["Обійми", "Faint"]);
    await t.request("PATCH", "/v1/me", { cookie: other.cookie, body: { isPrivate: true } });
    const hidden = await t.request<{ items: Track[] }>("GET", `/v1/users/${other.id}/common`, {
      cookie: me.cookie,
    });
    expect(hidden.body.items).toEqual([]);
    const guest = await t.request("GET", `/v1/users/${other.id}/common`);
    expect(guest.status).toBe(401);
  });

  it("моя статистика: підсумки, топи, години, дні тижня, активність і серія днів", async () => {
    const me = await t.signUp("stats@test.dev");
    const ago = (days: number, hour = 12) => {
      const d = new Date(Date.now() - days * 86400_000);
      d.setUTCHours(hour, 0, 0, 0);
      return d;
    };
    await t.db.insert(plays).values([
      { userId: me.id, trackId: s.tracks.numb.id, msPlayed: 180_000, playedAt: ago(0, 0) },
      { userId: me.id, trackId: s.tracks.numb.id, msPlayed: 180_000, playedAt: ago(1, 0) },
      { userId: me.id, trackId: s.tracks.faint.id, msPlayed: 120_000, playedAt: ago(2, 0) },
      { userId: me.id, trackId: s.tracks.moses.id, msPlayed: 240_000, playedAt: ago(40, 0) },
    ]);
    const month = await t.request<MyStats>("GET", "/v1/me/stats?period=month&tz=UTC", { cookie: me.cookie });
    expect(month.status).toBe(200);
    expect(month.body.totals).toEqual({ plays: 3, minutes: 8, tracks: 2, artists: 1 });
    expect(month.body.topTracks[0]).toMatchObject({ plays: 2 });
    expect(month.body.topTracks[0]!.track.title).toBe("Numb");
    expect(month.body.topArtists[0]!.artist.name).toBe("Linkin Park");
    expect(month.body.topGenres[0]).toMatchObject({ plays: 3 });
    expect(month.body.byHour[0]).toBe(3);
    expect(month.body.byHour).toHaveLength(24);
    expect(month.body.byWeekday.reduce((a, b) => a + b, 0)).toBe(3);
    expect(month.body.daily).toHaveLength(365);
    expect(month.body.daily.at(-1)!.plays).toBe(1);
    expect(month.body.streakDays).toBe(3);
    const all = await t.request<MyStats>("GET", "/v1/me/stats?period=all&tz=Not/AZone", {
      cookie: me.cookie,
    });
    expect(all.body.totals.plays).toBe(4);
    // Інший часовий пояс зсуває години.
    const kyiv = await t.request<MyStats>("GET", "/v1/me/stats?period=month&tz=Europe/Kyiv", {
      cookie: me.cookie,
    });
    expect(kyiv.body.byHour[0]).toBe(0);
    expect(kyiv.body.byHour.reduce((a, b) => a + b, 0)).toBe(3);
  });
});
