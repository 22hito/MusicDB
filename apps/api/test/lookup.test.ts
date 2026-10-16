import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { splitArtists } from "../src/modules/moderation/lookup";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let user: { cookie: string; id: string };
const realFetch = globalThis.fetch;

beforeAll(async () => {
  t = await createTestApp();
  await seedCatalog(t);
  user = await t.signUp("lookup@test.dev");
});
afterAll(() => t.close());
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Підміняє лише зовнішні запити (iTunes/Deezer); решта — як є. */
function mockExternal(itunes: unknown, deezer: unknown = { data: [] }) {
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("https://itunes.apple.com/")) return Response.json(itunes);
    if (url.startsWith("https://api.deezer.com/")) return Response.json(deezer);
    return realFetch(input);
  }) as typeof fetch;
}

describe("підказки у формі заявки", () => {
  it("розбиває виконавців", () => {
    expect(splitArtists("Imagine Dragons & JID")).toEqual(["Imagine Dragons", "JID"]);
    expect(splitArtists("Calvin Harris feat. Dua Lipa")).toEqual(["Calvin Harris", "Dua Lipa"]);
    expect(splitArtists("Океан Ельзи")).toEqual(["Океан Ельзи"]);
  });

  it("iTunes: назва, виконавці, альбом без « - Single», дата, жанр, обкладинка 600 px", async () => {
    mockExternal({
      results: [
        {
          trackName: "Enemy",
          artistName: "Imagine Dragons & JID",
          collectionName: "Enemy - Single",
          releaseDate: "2021-10-28T07:00:00Z",
          primaryGenreName: "Alternative",
          artworkUrl100: "https://is1.example/x/100x100bb.jpg",
          trackTimeMillis: 173_381,
          trackExplicitness: "notExplicit",
        },
      ],
    });
    const res = await t.request<{ items: Record<string, unknown>[] }>("GET", "/v1/lookup/tracks?q=enemy", {
      cookie: user.cookie,
    });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toEqual({
      title: "Enemy",
      artists: ["Imagine Dragons", "JID"],
      album: "Enemy",
      releaseDate: "2021-10-28",
      genres: ["Alternative"],
      coverUrl: "https://is1.example/x/600x600bb.jpg",
      durationMs: 173_381,
      explicit: false,
      source: "itunes",
    });
  });

  it("iTunes порожній — береться Deezer", async () => {
    mockExternal(
      { results: [] },
      {
        data: [
          {
            title: "Stefania",
            duration: 180,
            artist: { name: "Kalush Orchestra" },
            album: { title: "Stefania" },
          },
        ],
      },
    );
    const res = await t.request<{ items: { source: string; title: string }[] }>(
      "GET",
      "/v1/lookup/tracks?q=stefania",
      { cookie: user.cookie },
    );
    expect(res.body.items).toMatchObject([{ source: "deezer", title: "Stefania" }]);
  });

  it("без входу — 401", async () => {
    const res = await t.request("GET", "/v1/lookup/tracks?q=enemy");
    expect(res.status).toBe(401);
  });
});
