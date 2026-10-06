import "server-only";
import { ApiError } from "@musicdb/sdk";
import { cache } from "react";
import { serverApi } from "./server";

/** Серверні запити для SSR публічних сторінок (SEO, прев'ю посилань). 404 → null. */
async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) return null;
    throw err;
  }
}

export const getRelease = cache(async (id: string) =>
  orNull(async () => (await serverApi()).releases.get({ params: { id } })),
);
export const getArtist = cache(async (id: string) =>
  orNull(async () => (await serverApi()).artists.get({ params: { id } })),
);
export const getTrack = cache(async (id: string) =>
  orNull(async () => (await serverApi()).tracks.get({ params: { id } })),
);
export const getPlaylist = cache(async (id: string) =>
  orNull(async () => (await serverApi()).playlists.get({ params: { id } })),
);
export const getGenre = cache(async (id: string) =>
  orNull(async () => (await serverApi()).genres.get({ params: { id } })),
);
export const getProfile = cache(async (id: string) =>
  orNull(async () => (await serverApi()).users.get({ params: { id } })),
);

/**
 * Старі адреси v1 мали числові id (/artist/5). Якщо в адресі лише цифри — шукаємо нову сутність за legacy_id.
 * Повертає новий id/slug або null.
 */
export const resolveLegacy = cache(
  async (kind: "artist" | "playlist" | "user" | "track" | "release", id: string) => {
    if (!/^\d{1,9}$/.test(id)) return null;
    return orNull(async () => (await serverApi()).legacy.resolve({ params: { kind, id: Number(id) } }));
  },
);
