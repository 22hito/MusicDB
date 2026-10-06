import {
  type ArtistDetail,
  endpoints,
  type Page,
  type ReleaseDetail,
  type SearchResults,
  type Track,
  type TrackDetail,
} from "@musicdb/contracts";
import { artists } from "@musicdb/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseLrc } from "../src/modules/catalog/routes";
import { allRoutes } from "../src/modules/index";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
});
afterAll(() => t.close());

describe("контракт", () => {
  it("кожен ендпоінт з таблиці контрактів реалізовано рівно один раз", () => {
    const defined = Object.values(endpoints).flatMap((group) => Object.values(group));
    const implemented = allRoutes.map((r) => r.endpoint);
    const missing = defined.filter((e) => !implemented.includes(e)).map((e) => `${e.method} ${e.path}`);
    expect(missing).toEqual([]);
    const keys = implemented.map((e) => `${e.method} ${e.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("OpenAPI-документ будується й містить усі шляхи", async () => {
    const res = await t.request<{ paths: Record<string, unknown> }>("GET", "/v1/openapi.json");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toContain("/v1/tracks/{id}");
  });

  it("невідомий маршрут — 404 у форматі problem+json", async () => {
    const res = await t.request<{ code: string }>("GET", "/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("route_not_found");
  });

  it("невалідний запит — 422 з переліком полів", async () => {
    const res = await t.request<{ code: string; errors: { path: string }[] }>("GET", "/v1/tracks?limit=1000");
    expect(res.status).toBe(422);
    expect(res.body.errors[0]!.path).toBe("query.limit");
  });
});

describe("каталог", () => {
  it("перегляд з фільтром за жанром і пагінацією", async () => {
    const page1 = await t.request<Page<Track>>("GET", "/v1/tracks?genre=nu-metal&limit=2&sort=title");
    expect(page1.status).toBe(200);
    expect(page1.body.items.map((x) => x.title)).toEqual(["Faint", "Numb"]);
    expect(page1.body.nextCursor).not.toBeNull();
    const page2 = await t.request<Page<Track>>(
      "GET",
      `/v1/tracks?genre=nu-metal&limit=2&sort=title&cursor=${page1.body.nextCursor}`,
    );
    expect(page2.body.items.map((x) => x.title)).toEqual(["Somewhere I Belong"]);
    expect(page2.body.nextCursor).toBeNull();
  });

  it("трек з виконавцями, релізом, жанрами й джерелом відтворення", async () => {
    const res = await t.request<TrackDetail>("GET", `/v1/tracks/${s.tracks.numb.id}`);
    expect(res.status).toBe(200);
    expect(res.body.artists[0]!.name).toBe("Linkin Park");
    expect(res.body.release!.title).toBe("Meteora");
    expect(res.body.genres.map((g) => g.slug)).toEqual(["nu-metal", "rock"]);
    expect(res.body.playback.youtubeVideoId).toBe("kXYiU_JCYtU");
    expect(res.body.viewer).toBeNull();
  });

  it("виконавець за slug: популярні треки, релізи, схожі", async () => {
    const res = await t.request<ArtistDetail>("GET", "/v1/artists/linkin-park");
    expect(res.status).toBe(200);
    expect(res.body.trackCount).toBe(3);
    expect(res.body.topTracks).toHaveLength(3);
    expect(res.body.releases.map((r) => r.title)).toEqual(["Meteora"]);
    expect(res.body.genres[0]!.slug).toBe("nu-metal");
  });

  it("реліз із треками в порядку треклісту", async () => {
    const res = await t.request<ReleaseDetail>("GET", `/v1/releases/${s.releases.meteora.id}`);
    expect(res.body.tracks.map((x) => x.title)).toEqual(["Somewhere I Belong", "Faint", "Numb"]);
    expect(res.body.durationMs).toBe(185_000 + 162_000 + 213_000);
    expect(res.body.artists[0]!.name).toBe("Linkin Park");
  });

  it("текст пісні з синхронізацією (LRC)", async () => {
    const res = await t.request<{ synced: { timeMs: number; text: string }[]; plain: string }>(
      "GET",
      `/v1/tracks/${s.tracks.obiimy.id}/lyrics`,
    );
    expect(res.body.synced).toEqual([
      { timeMs: 1000, text: "Обійми" },
      { timeMs: 3500, text: "мене" },
    ]);
    expect(res.body.plain).toBe("Обійми мене");
  });

  it("parseLrc: кілька міток на рядок і дробові частини", () => {
    expect(parseLrc("[00:10.5][01:00]Ла\n[00:05.123]До")).toEqual([
      { timeMs: 5123, text: "До" },
      { timeMs: 10_500, text: "Ла" },
      { timeMs: 60_000, text: "Ла" },
    ]);
    expect(parseLrc("без міток")).toBeNull();
  });

  it("джерело відтворення: YouTube або 404 not_playable", async () => {
    const ok = await t.request<{ type: string; videoId: string }>(
      "GET",
      `/v1/tracks/${s.tracks.moses.id}/playback`,
    );
    expect(ok.body).toEqual({ type: "youtube", videoId: "-0rYxkUhcSQ" });
    const none = await t.request<{ code: string }>("GET", `/v1/tracks/${s.tracks.heart.id}/playback`);
    expect(none.status).toBe(404);
    expect(none.body.code).toBe("not_playable");
  });

  it("радіо: схожі за жанром, без вихідного треку, лише відтворювані", async () => {
    const res = await t.request<{ items: Track[] }>("GET", `/v1/tracks/${s.tracks.numb.id}/radio`);
    const ids = res.body.items.map((x) => x.id);
    expect(ids).not.toContain(s.tracks.numb.id);
    expect(ids).toContain(s.tracks.faint.id);
    expect(res.body.items.every((x) => x.playback.youtubeVideoId || x.playback.audio)).toBe(true);
  });

  it("жанр з популярними виконавцями", async () => {
    const res = await t.request<{ name: string; topArtists: { name: string }[] }>(
      "GET",
      "/v1/genres/metalcore",
    );
    expect(res.body.topArtists.map((a) => a.name)).toEqual(["Bring Me The Horizon"]);
  });
});

describe("старі посилання v1", () => {
  it("числовий id виконавця → новий id і slug; невідомий — 404", async () => {
    await t.db.update(artists).set({ legacyId: 5 }).where(eq(artists.id, s.artists.lp.id));
    const ok = await t.request<{ id: string; slug: string }>("GET", "/v1/legacy/artist/5");
    expect(ok.body).toEqual({ id: s.artists.lp.id, slug: "linkin-park" });
    const missing = await t.request("GET", "/v1/legacy/artist/999");
    expect(missing.status).toBe(404);
  });
});

describe("пошук", () => {
  it("знаходить з одруківками й визначає головний результат", async () => {
    const res = await t.request<SearchResults>("GET", `/v1/search?q=${encodeURIComponent("linkn prk")}`);
    expect(res.body.top).toMatchObject({ type: "artist", item: { name: "Linkin Park" } });
  });

  it("префіксний пошук по треках і кирилиця", async () => {
    const numb = await t.request<SearchResults>("GET", "/v1/search?q=num&types=track");
    expect(numb.body.tracks[0]!.title).toBe("Numb");
    expect(numb.body.artists).toEqual([]);
    const uk = await t.request<SearchResults>("GET", `/v1/search?q=${encodeURIComponent("океан")}`);
    expect(uk.body.artists[0]!.name).toBe("Океан Ельзи");
  });
});

describe("головна й чарт", () => {
  it("без входу: публічні полиці", async () => {
    const res = await t.request<{ shelves: { id: string }[] }>("GET", "/v1/home");
    const ids = res.body.shelves.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(["trending", "new-releases", "genres"]));
    expect(ids).not.toContain("recent");
  });

  it("англійські заголовки за Accept-Language", async () => {
    const res = await t.request<{ shelves: { id: string; title: string }[] }>("GET", "/v1/home", {
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    expect(res.body.shelves.find((x) => x.id === "trending")!.title).toBe("Trending now");
  });

  it("чарт ніколи не порожній і пронумерований", async () => {
    const res = await t.request<{ items: { rank: number }[] }>("GET", "/v1/charts/top?period=week&limit=5");
    expect(res.body.items.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
