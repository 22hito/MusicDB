/**
 * Офіційні джерела без ключів: Deezer (каталог лейблів), MusicBrainz (відкрита база з ISRC і зв'язками),
 * Apple Music / iTunes (каталог Apple), Вікідані й Вікіпедія (біографії, з посиланням на джерело).
 */
import { getJson } from "./http";
import { fullDate, sameArtist, sameTitle } from "./rules";

// ─── Deezer ───────────────────────────────────────────────────────────────

export type DeezerTrack = {
  id: number;
  title: string;
  isrc?: string;
  duration: number;
  explicit_lyrics?: boolean;
  release_date?: string;
  contributors?: { id: number; name: string; role: string }[];
  artist: { id: number; name: string };
  album: { id: number; title: string };
  track_position?: number;
  disk_number?: number;
};
type DeezerAlbum = {
  id: number;
  title: string;
  release_date?: string;
  cover_xl?: string;
  upc?: string;
  label?: string;
  record_type?: string;
  genres?: { data: { name: string }[] };
};
type DeezerArtist = { id: number; name: string; picture_xl?: string };
type DeezerAlbumHit = { id: number; title: string; cover_xl?: string; artist: { name: string } };

export const deezer = {
  track: (id: string | number) => getJson<DeezerTrack>("deezer", `https://api.deezer.com/track/${id}`),
  album: (id: string | number) => getJson<DeezerAlbum>("deezer", `https://api.deezer.com/album/${id}`),
  artist: (id: string | number) => getJson<DeezerArtist>("deezer", `https://api.deezer.com/artist/${id}`),
  async searchAlbums(q: string): Promise<DeezerAlbumHit[]> {
    const res = await getJson<{ data?: DeezerAlbumHit[] }>(
      "deezer",
      `https://api.deezer.com/search/album?q=${encodeURIComponent(q.slice(0, 200))}&limit=25`,
    );
    return res?.data ?? [];
  },
  /** Пошук пісні: збіг назви (без версій), основного виконавця й тривалості ±3 с. */
  async find(artist: string, title: string, durationMs: number): Promise<DeezerTrack | null> {
    // Розширений синтаксис працює лише на /search (на /search/track повертає порожньо); далі — звичайний запит.
    const queries = [`artist:"${artist}" track:"${title}"`, `${artist} ${title}`];
    for (const q of queries) {
      const res = await getJson<{ data?: DeezerTrack[] }>(
        "deezer",
        `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`,
      );
      const hit = (res?.data ?? []).find(
        (t) =>
          sameTitle(t.title, title) &&
          sameArtist(t.artist.name, artist) &&
          (!durationMs || Math.abs(t.duration * 1000 - durationMs) <= 3000),
      );
      if (hit) return deezer.track(hit.id);
    }
    return null;
  },
};

/** Заглушка Deezer для виконавців без фото — не вважаємо її фото. */
export const isRealDeezerPicture = (url: string | undefined) =>
  !!url && !/\/images\/artist\/\/|d41d8cd98f00b204e9800998ecf8427e/.test(url);

// ─── MusicBrainz ──────────────────────────────────────────────────────────

type MbCredit = { name: string; joinphrase?: string; artist: { id: string; name: string } };
export type MbRecording = {
  id: string;
  title: string;
  length?: number | null;
  "first-release-date"?: string;
  "artist-credit"?: MbCredit[];
  genres?: { name: string; count: number }[];
};
type MbRelation = { type: string; url?: { resource: string } };
export type MbArtist = {
  id: string;
  name: string;
  type?: string;
  country?: string | null;
  "life-span"?: { begin?: string | null };
  relations?: MbRelation[];
};

const MB = "https://musicbrainz.org/ws/2";

export const musicbrainz = {
  /** Запис за ISRC, що збігається назвою й основним виконавцем (ISRC іноді прив'язаний до кількох записів). */
  async byIsrc(isrc: string, title: string, artist: string): Promise<MbRecording | null> {
    const res = await getJson<{ recordings?: MbRecording[] }>(
      "musicbrainz",
      `${MB}/isrc/${encodeURIComponent(isrc)}?inc=artist-credits&fmt=json`,
    );
    return (
      (res?.recordings ?? []).find(
        (r) =>
          sameTitle(r.title, title) && (r["artist-credit"] ?? []).some((c) => sameArtist(c.name, artist)),
      ) ?? null
    );
  },
  /** Жанри запису (голосування спільноти MusicBrainz саме за цей запис). */
  async genres(recordingId: string): Promise<string[]> {
    const r = await getJson<MbRecording>("musicbrainz", `${MB}/recording/${recordingId}?inc=genres&fmt=json`);
    return (r?.genres ?? [])
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((g) => g.name);
  },
  artist: (mbid: string) => getJson<MbArtist>("musicbrainz", `${MB}/artist/${mbid}?inc=url-rels&fmt=json`),
  /** Назви релізів, у яких є цей запис. */
  async releaseTitles(recordingId: string): Promise<string[]> {
    const r = await getJson<{ releases?: { title: string }[] }>(
      "musicbrainz",
      `${MB}/recording/${recordingId}?inc=releases&fmt=json`,
    );
    return [...new Set((r?.releases ?? []).map((x) => x.title))];
  },
};

export const mbFirstDate = (r: MbRecording) => fullDate(r["first-release-date"]);

// ─── Apple (iTunes Search API) ───────────────────────────────────────────

export type ItunesSong = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  collectionId?: number;
  artworkUrl100?: string;
  trackNumber?: number;
  discNumber?: number;
  releaseDate?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  trackExplicitness?: "explicit" | "notExplicit" | "cleaned";
};

type ItunesAlbum = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100?: string;
};

export const itunes = {
  async searchAlbums(q: string): Promise<ItunesAlbum[]> {
    const res = await getJson<{ results?: ItunesAlbum[] }>(
      "itunes",
      `https://itunes.apple.com/search?term=${encodeURIComponent(q.slice(0, 200))}&entity=album&limit=15&country=US`,
    );
    return res?.results ?? [];
  },
  async find(artist: string, title: string, durationMs: number): Promise<ItunesSong | null> {
    const term = encodeURIComponent(`${artist} ${title}`.slice(0, 200));
    const res = await getJson<{ results?: ItunesSong[] }>(
      "itunes",
      `https://itunes.apple.com/search?term=${term}&entity=song&limit=15&country=US`,
    );
    return (
      (res?.results ?? []).find(
        (s) =>
          sameTitle(s.trackName, title) &&
          sameArtist(s.artistName.split(/,|&| feat\.? /i)[0] ?? s.artistName, artist) &&
          (!durationMs || !s.trackTimeMillis || Math.abs(s.trackTimeMillis - durationMs) <= 3000),
      ) ?? null
    );
  },
};

// ─── Вікідані / Вікіпедія ─────────────────────────────────────────────────

type WdEntity = { sitelinks?: Record<string, { title: string }> };

export const wiki = {
  async sitelinks(qid: string): Promise<{ uk?: string; en?: string }> {
    const res = await getJson<{ entities?: Record<string, WdEntity> }>(
      "wikidata",
      `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
    );
    const e = res?.entities ? Object.values(res.entities)[0] : undefined;
    return {
      ...(e?.sitelinks?.ukwiki ? { uk: e.sitelinks.ukwiki.title } : {}),
      ...(e?.sitelinks?.enwiki ? { en: e.sitelinks.enwiki.title } : {}),
    };
  },
  /** Вступ статті (коротко) і адреса сторінки — для біографії з зазначенням джерела. */
  async summary(lang: "uk" | "en", title: string): Promise<{ text: string; url: string } | null> {
    const res = await getJson<{
      type?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    }>(
      "wikipedia",
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    );
    if (!res?.extract || res.type === "disambiguation") return null;
    return {
      text: res.extract.trim(),
      url:
        res.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  },
};
