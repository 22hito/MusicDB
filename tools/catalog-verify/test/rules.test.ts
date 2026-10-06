import { describe, expect, it } from "vitest";
import {
  agreeExact,
  agreeGenres,
  agreeNumber,
  albumKey,
  canonGenre,
  fullDate,
  linkKind,
  sameArtist,
  sameTitle,
  titleKey,
} from "../src/rules";

describe("назви", () => {
  it("однакові без feat., ремастерів і пунктуації", () => {
    expect(sameTitle("Numb", "Numb (Remastered 2023)")).toBe(true);
    expect(sameTitle("Bad Habit (feat. Bring Me The Horizon)", "Bad Habit")).toBe(true);
    expect(sameTitle("Don't Stop Me Now", "Dont Stop Me Now")).toBe(true);
    expect(sameTitle("Realize - 2020 Remaster", "Realize")).toBe(true);
  });
  it("версії — не та сама пісня", () => {
    expect(sameTitle("Numb (Live)", "Numb")).toBe(false);
    expect(sameTitle("Numb - Acoustic", "Numb")).toBe(false);
    expect(sameTitle("Numb (Remix)", "Numb")).toBe(false);
    expect(titleKey("In The End (Live at Milton Keynes)")).toContain("live");
  });
  it("виконавці й альбоми", () => {
    expect(sameArtist("The Beatles", "Beatles")).toBe(true);
    expect(sameArtist("Simon & Garfunkel", "Simon and Garfunkel")).toBe(true);
    expect(sameArtist("Beyoncé", "Beyonce")).toBe(true);
    expect(albumKey("Meteora (Deluxe Edition)")).toBe(albumKey("Meteora"));
    expect(albumKey("Realize - Single")).toBe("realize");
  });
});

describe("згода джерел", () => {
  it("числа — щонайменше два в межах допуску", () => {
    expect(
      agreeNumber(
        [
          { source: "deezer", value: 217_000 },
          { source: "musicbrainz", value: 217_466 },
          { source: "itunes", value: 230_000 },
        ],
        2000,
      ),
    ).toEqual({ value: 217_000, sources: ["deezer", "musicbrainz"] });
    expect(agreeNumber([{ source: "deezer", value: 217_000 }], 2000)).toBeNull();
  });
  it("дати — лише повні й однакові у двох джерел", () => {
    expect(fullDate("2020-11-13T12:00:00Z")).toBe("2020-11-13");
    expect(fullDate("2020")).toBeNull();
    expect(
      agreeExact([
        { source: "deezer", value: "2020-11-13" },
        { source: "musicbrainz", value: "2020-11-11" },
        { source: "itunes", value: "2020-11-13" },
      ]),
    ).toEqual({ value: "2020-11-13", sources: ["deezer", "itunes"] });
    expect(
      agreeExact([
        { source: "deezer", value: true },
        { source: "itunes", value: false },
      ]),
    ).toBeNull();
  });
});

describe("жанри", () => {
  it("точний збіг перемагає родину", () => {
    expect(
      agreeGenres([
        { source: "deezer", genres: ["Rock"] },
        { source: "itunes", genres: ["Hard Rock"] },
        { source: "musicbrainz", genres: ["hard rock", "blues rock"] },
      ]),
    ).toEqual({ value: ["hard rock"], sources: ["itunes", "musicbrainz"] });
  });
  it("лише родина, якщо точних збігів немає", () => {
    expect(
      agreeGenres([
        { source: "deezer", genres: ["Rap/Hip Hop"] },
        { source: "itunes", genres: ["Hip-Hop/Rap"] },
      ])?.value,
    ).toEqual(["hip-hop"]);
    expect(
      agreeGenres([
        { source: "deezer", genres: ["Rock"] },
        { source: "itunes", genres: ["Hard Rock"] },
      ])?.value,
    ).toEqual(["rock"]);
  });
  it("одне джерело чи нерелевантні жанри — нічого", () => {
    expect(agreeGenres([{ source: "deezer", genres: ["Metal"] }])).toBeNull();
    expect(
      agreeGenres([
        { source: "deezer", genres: ["Films/Games"] },
        { source: "itunes", genres: ["Soundtrack"] },
      ]),
    ).toBeNull();
    expect(canonGenre("Singer/Songwriter")).toBeNull();
  });
});

describe("посилання", () => {
  it("лише корисні типи", () => {
    expect(linkKind("free streaming", "https://open.spotify.com/artist/711")).toBe("spotify");
    expect(linkKind("official homepage", "https://www.acdc.com/")).toBe("website");
    expect(linkKind("lyrics", "https://genius.com/artists/Ac-dc")).toBe("genius");
    expect(linkKind("fanpage", "https://brutig.wordpress.com/")).toBeNull();
  });
});

describe("рік ISRC", () => {
  it("розбирає рік реєстрації", async () => {
    const { isrcYearOf } = await import("../src/verify-track");
    expect(isrcYearOf("GBARL2001273")).toBe(2020);
    expect(isrcYearOf("QM4TX2372332")).toBe(2023);
    expect(isrcYearOf("USSM19912345")).toBe(1999);
    expect(isrcYearOf(undefined)).toBeNull();
  });
});
