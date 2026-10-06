/**
 * Звірка пісні: Deezer (за збереженим id або пошуком) → ISRC → MusicBrainz; Apple — коли щось
 * довелося б змінити або бракує жанрів (третій голос). Записується лише те, з чим згодні ≥2 джерела.
 */
import type { ExternalIds } from "@musicdb/db";
import type { TrackChange, TrackRow } from "./db";
import {
  type Agreed,
  agreeExact,
  agreeGenres,
  agreeNumber,
  albumKey,
  artistKey,
  fullDate,
  sameArtist,
  sameTitle,
} from "./rules";
import {
  type DeezerTrack,
  deezer,
  type ItunesSong,
  itunes,
  type MbRecording,
  mbFirstDate,
  musicbrainz,
} from "./sources";

export type TrackResult = {
  status: "verified" | "partial" | "unmatched" | "conflict";
  sources: Record<string, unknown>;
  applied: Record<string, { from: unknown; to: unknown; sources: string[] }>;
  conflicts: Record<string, Record<string, unknown>>;
  change: TrackChange | null;
};

const TOL_MS = 2000;

export async function verifyTrack(row: TrackRow): Promise<TrackResult> {
  const primary = row.artists?.[0]?.name;
  const empty: TrackResult = { status: "unmatched", sources: {}, applied: {}, conflicts: {}, change: null };
  if (!primary) return empty;

  // 1. Deezer
  let dz: DeezerTrack | null = null;
  if (row.external_ids?.deezer) {
    dz = await deezer.track(row.external_ids.deezer);
    if (dz && !(sameTitle(dz.title, row.title) && sameArtist(dz.artist.name, primary))) dz = null;
  }
  dz ??= await deezer.find(primary, row.title, row.duration_ms);
  if (!dz) return empty;
  const album = await deezer.album(dz.album.id);

  // 2. MusicBrainz за ISRC
  const mb: MbRecording | null = dz.isrc ? await musicbrainz.byIsrc(dz.isrc, row.title, primary) : null;

  const dzDate = fullDate(album?.release_date ?? dz.release_date);
  const mbDate = mb ? mbFirstDate(mb) : null;
  const dzMs = dz.duration * 1000;
  const mbMs = mb?.length ?? null;
  const dzArtists = (dz.contributors ?? [])
    .filter((c) => c.role === "Main" || c.role === "Featured")
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "Main" ? -1 : 1))
    .map((c) => c.name);
  // Deezer іноді дає того самого виконавця двічі (як основного й запрошеного) — прибираємо дублі.
  dedupeByKey(dzArtists);
  const mbArtists = dedupeByKey((mb?.["artist-credit"] ?? []).map((c) => c.name));
  const dbArtistKeys = new Set((row.artists ?? []).map((a) => artistKey(a.name)));
  const noGenres = !row.genres?.length;

  // 3. Apple — лише коли потрібен третій голос
  const wouldChange =
    (dzDate && dzDate !== row.release_date) ||
    (mbDate && mbDate !== row.release_date) ||
    Math.abs(dzMs - row.duration_ms) > TOL_MS ||
    (mbMs && Math.abs(mbMs - row.duration_ms) > TOL_MS) ||
    (dz.explicit_lyrics !== undefined && dz.explicit_lyrics !== row.explicit) ||
    (dzArtists.length > 0 && !setEq(dzArtists.map(artistKey), dbArtistKeys));
  const ap: ItunesSong | null =
    wouldChange || noGenres ? await itunes.find(primary, row.title, row.duration_ms) : null;

  const sources: Record<string, unknown> = {
    deezer: { id: dz.id, isrc: dz.isrc ?? null, album: dz.album.title, date: dzDate, duration: dzMs },
    ...(mb ? { musicbrainz: { id: mb.id, date: mbDate, duration: mbMs, artists: mbArtists } } : {}),
    ...(ap
      ? {
          itunes: {
            id: ap.trackId,
            album: ap.collectionName ?? null,
            date: fullDate(ap.releaseDate),
            duration: ap.trackTimeMillis ?? null,
            genre: ap.primaryGenreName ?? null,
            explicit: ap.trackExplicitness ?? null,
          },
        }
      : {}),
  };

  const applied: TrackResult["applied"] = {};
  const conflicts: TrackResult["conflicts"] = {};
  const change: TrackChange = {
    set: {},
    externalIds: {
      deezer: String(dz.id),
      ...(mb ? { musicbrainz: mb.id } : {}),
      ...(ap ? { itunes: String(ap.trackId) } : {}),
    },
    artistIds: [],
  };
  const note = <T>(field: string, from: unknown, a: Agreed<T>) => {
    applied[field] = { from, to: a.value, sources: a.sources };
  };

  // ISRC: Deezer, підтверджений тим, що MusicBrainz знайшов за ним цю саму пісню
  if (dz.isrc && mb && row.isrc !== dz.isrc) {
    change.set.isrc = dz.isrc;
    note("isrc", row.isrc, { value: dz.isrc, sources: ["deezer", "musicbrainz"] });
  }

  // Тривалість
  const dur = agreeNumber(
    [
      { source: "deezer", value: dzMs },
      { source: "musicbrainz", value: mbMs },
      { source: "itunes", value: ap?.trackTimeMillis },
    ],
    TOL_MS,
  );
  if (dur && Math.abs(dur.value - row.duration_ms) > TOL_MS) {
    change.set.duration_ms = dur.value;
    note("durationMs", row.duration_ms, dur);
  } else if (
    !dur &&
    Math.abs(dzMs - row.duration_ms) > TOL_MS &&
    // наше значення збігається хоча б з одним джерелом — не розбіжність
    ![mbMs, ap?.trackTimeMillis].some((v) => v && Math.abs(v - row.duration_ms) <= TOL_MS)
  ) {
    conflicts.durationMs = {
      db: row.duration_ms,
      deezer: dzMs,
      musicbrainz: mbMs,
      itunes: ap?.trackTimeMillis ?? null,
    };
  }

  // Дата релізу
  const apDate = fullDate(ap?.releaseDate);
  const date = agreeExact([
    { source: "deezer", value: dzDate },
    { source: "musicbrainz", value: mbDate },
    { source: "itunes", value: apDate },
  ]);
  // Рік реєстрації ISRC (CC-XXX-YY-NNNNN): запис існував уже тоді — пізніша дата означає перевидання.
  const isrcYear = isrcYearOf(dz.isrc);
  const laterReissue =
    !!date &&
    !!row.release_date &&
    date.value > row.release_date &&
    isrcYear !== null &&
    Number(date.value.slice(0, 4)) > isrcYear + 1;
  if (date && date.value !== row.release_date && !laterReissue) {
    change.set.release_date = date.value;
    note("releaseDate", row.release_date, date);
  } else if (
    laterReissue ||
    (!date && dzDate && dzDate !== row.release_date && ![mbDate, apDate].includes(row.release_date))
  ) {
    conflicts.releaseDate = {
      db: row.release_date,
      deezer: dzDate,
      musicbrainz: mbDate,
      itunes: apDate,
      ...(laterReissue ? { reason: "reissue", isrcYear } : {}),
    };
  }

  // Ненормативна лексика: Deezer + Apple («cleaned» — це чиста версія, не голос)
  const apExplicit =
    ap?.trackExplicitness === "explicit" ? true : ap?.trackExplicitness === "notExplicit" ? false : null;
  const explicit = agreeExact([
    { source: "deezer", value: dz.explicit_lyrics ?? null },
    { source: "itunes", value: apExplicit },
  ]);
  if (explicit && explicit.value !== row.explicit) {
    change.set.explicit = explicit.value;
    note("explicit", row.explicit, explicit);
  }

  // Виконавці: склад Deezer = склад MusicBrainz, основний — той самий, що в нас
  if (
    dzArtists.length &&
    mbArtists.length &&
    setEq(dzArtists.map(artistKey), new Set(mbArtists.map(artistKey)))
  ) {
    if (!setEq(dzArtists.map(artistKey), dbArtistKeys) && sameArtist(dzArtists[0]!, primary)) {
      change.artists = dzArtists;
      note(
        "artists",
        (row.artists ?? []).map((a) => a.name),
        { value: dzArtists, sources: ["deezer", "musicbrainz"] },
      );
    }
  } else if (dzArtists.length && !setEq(dzArtists.map(artistKey), dbArtistKeys)) {
    conflicts.artists = {
      db: (row.artists ?? []).map((a) => a.name),
      deezer: dzArtists,
      musicbrainz: mbArtists,
    };
  }

  // id виконавців на платформах (особа підтверджена збігом пісні)
  for (const a of row.artists ?? []) {
    const ids: ExternalIds = {};
    const dc = (dz.contributors ?? []).find((c) => sameArtist(c.name, a.name));
    if (dc) ids.deezer = String(dc.id);
    const mc = (mb?.["artist-credit"] ?? []).find((c) => sameArtist(c.name, a.name));
    if (mc) ids.musicbrainz = mc.artist.id;
    if (ids.deezer || ids.musicbrainz) change.artistIds.push({ name: a.name, ids });
  }

  // Жанри — лише для пісень без жанрів; джерела саме цієї пісні/релізу
  if (noGenres) {
    const mbGenres = mb ? await musicbrainz.genres(mb.id) : [];
    const g = agreeGenres([
      { source: "deezer", genres: (album?.genres?.data ?? []).map((x) => x.name) },
      { source: "itunes", genres: ap?.primaryGenreName ? [ap.primaryGenreName] : [] },
      { source: "musicbrainz", genres: mbGenres.slice(0, 5) },
    ]);
    if (g) {
      change.genres = g.value;
      note("genres", [], g);
    }
  }

  // Альбом: назву лише звіряємо (зміна прив'язки до релізу — вручну в адмінці)
  if (row.release_id && album) {
    const albumAgreed = ap?.collectionName && albumKey(ap.collectionName) === albumKey(album.title);
    if (albumAgreed && row.release_title && albumKey(row.release_title) !== albumKey(album.title)) {
      conflicts.release = { db: row.release_title, deezer: album.title, itunes: ap?.collectionName ?? null };
    }
    if (albumAgreed && albumKey(row.release_title ?? "") === albumKey(album.title)) {
      change.releaseExternal = { releaseId: row.release_id, ids: { deezer: String(album.id) } };
      if (!row.cover_url && album.cover_xl) {
        change.cover = { releaseId: row.release_id, url: album.cover_xl };
        applied.cover = { from: null, to: album.cover_xl, sources: ["deezer", "itunes"] };
      }
    }
  }

  const matched = 1 + (mb ? 1 : 0) + (ap ? 1 : 0);
  const status: TrackResult["status"] = Object.keys(conflicts).length
    ? "conflict"
    : matched >= 2
      ? "verified"
      : "partial";
  return { status, sources, applied, conflicts, change };
}

/** Прибирає повтори імен (за ключем порівняння) на місці, зберігаючи порядок. */
function dedupeByKey(names: string[]) {
  const seen = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const k = artistKey(names[i]!);
    if (seen.has(k)) names.splice(i--, 1);
    else seen.add(k);
  }
  return names;
}

function setEq(a: string[], b: Set<string>) {
  return a.length === b.size && a.every((x) => b.has(x));
}

/** Рік із ISRC (5–6 символи після коду країни й реєстранта): «GBARL2001273» → 2020. */
export function isrcYearOf(isrc: string | undefined | null): number | null {
  const yy = isrc?.match(/^[A-Z]{2}[A-Z0-9]{3}(\d{2})/)?.[1];
  if (!yy) return null;
  const n = Number(yy);
  const now = new Date().getFullYear() % 100;
  return n <= now + 1 ? 2000 + n : 1900 + n;
}
