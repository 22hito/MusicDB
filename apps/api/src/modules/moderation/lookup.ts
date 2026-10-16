/**
 * Підказки у формі заявки: поки людина вводить назву чи виконавця, показуємо офіційні записи з iTunes (дата
 * релізу, жанр, обкладинка), а якщо iTunes недоступний — з Deezer. Вибір заповнює форму. Окремо — пісні, що вже
 * є в каталозі, щоб не надсилати дублікат.
 */
import { endpoints, type TrackLookupItem } from "@musicdb/contracts";
import { implement } from "../../http/endpoint";
import { search } from "../discover/routes";

const TIMEOUT_MS = 4000;

/** «A & B», «A, B», «A feat. B» → окремі виконавці (як їх зберігає каталог). */
export function splitArtists(name: string): string[] {
  return name
    .split(/\s*(?:,|&| x | feat\.? | ft\.? | featuring )\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ItunesTrack = {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  trackExplicitness?: string;
};

type DeezerTrack = {
  title?: string;
  duration?: number;
  explicit_lyrics?: boolean;
  artist?: { name?: string };
  album?: { title?: string; cover_xl?: string; cover_big?: string };
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function lookupItunes(q: string): Promise<TrackLookupItem[]> {
  const data = await getJson<{ results?: ItunesTrack[] }>(
    `https://itunes.apple.com/search?entity=song&limit=8&country=UA&term=${encodeURIComponent(q)}`,
  );
  return (data?.results ?? [])
    .filter((r) => r.trackName && r.artistName)
    .map((r) => ({
      title: r.trackName!,
      artists: splitArtists(r.artistName!),
      album: r.collectionName?.replace(/ - (Single|EP)$/i, "") ?? null,
      releaseDate: r.releaseDate?.slice(0, 10) ?? null,
      genres: r.primaryGenreName && r.primaryGenreName !== "Music" ? [r.primaryGenreName] : [],
      coverUrl: r.artworkUrl100?.replace("100x100bb", "600x600bb") ?? null,
      durationMs: r.trackTimeMillis ?? null,
      explicit: r.trackExplicitness === "explicit",
      source: "itunes" as const,
    }));
}

export async function lookupDeezer(q: string): Promise<TrackLookupItem[]> {
  const data = await getJson<{ data?: DeezerTrack[] }>(
    `https://api.deezer.com/search?limit=8&q=${encodeURIComponent(q)}`,
  );
  return (data?.data ?? [])
    .filter((r) => r.title && r.artist?.name)
    .map((r) => ({
      title: r.title!,
      artists: splitArtists(r.artist!.name!),
      album: r.album?.title ?? null,
      releaseDate: null,
      genres: [],
      coverUrl: r.album?.cover_xl ?? r.album?.cover_big ?? null,
      durationMs: r.duration ? r.duration * 1000 : null,
      explicit: !!r.explicit_lyrics,
      source: "deezer" as const,
    }));
}

export const lookupRoutes = [
  implement(endpoints.submissions.lookup, async ({ deps, query }) => {
    const [external, local] = await Promise.all([
      lookupItunes(query.q).then((items) => (items.length ? items : lookupDeezer(query.q))),
      search(deps, query.q, ["track"], 4),
    ]);
    // Однакові записи (сингл і альбомна версія з тією ж назвою) — лише один раз.
    const seen = new Set<string>();
    const items = external.filter((i) => {
      const key = `${i.title.toLowerCase()}|${i.artists.join(",").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { items: items.slice(0, 6), existing: local.tracks };
  }),
];
