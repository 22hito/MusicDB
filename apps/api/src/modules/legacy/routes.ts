import { endpoints } from "@musicdb/contracts";
import { artists, playlists, releases, threads, tracks, users } from "@musicdb/db";
import { eq } from "drizzle-orm";
import { implement } from "../../http/endpoint";
import { notFound } from "../../http/errors";

/** Старі посилання v1 (/artist/5, /playlist/12…) → нові id. Лише публічні сутності. */
export const legacyRoutes = [
  implement(endpoints.legacy.resolve, async ({ deps, params }) => {
    const db = deps.db;
    const id = params.id;
    switch (params.kind) {
      case "artist": {
        const [r] = await db
          .select({ id: artists.id, slug: artists.slug })
          .from(artists)
          .where(eq(artists.legacyId, id));
        if (r) return r;
        break;
      }
      case "track": {
        const [r] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.legacyId, id));
        if (r) return { id: r.id, slug: null };
        break;
      }
      case "release": {
        const [r] = await db.select({ id: releases.id }).from(releases).where(eq(releases.legacyId, id));
        if (r) return { id: r.id, slug: null };
        break;
      }
      case "playlist": {
        const [r] = await db
          .select({ id: playlists.id, visibility: playlists.visibility })
          .from(playlists)
          .where(eq(playlists.legacyId, id));
        if (r && r.visibility !== "private") return { id: r.id, slug: null };
        break;
      }
      case "user": {
        const [r] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.legacyId, id));
        if (r) return { id: r.id, slug: r.username };
        break;
      }
      case "thread": {
        const [r] = await db.select({ id: threads.id }).from(threads).where(eq(threads.legacyId, id));
        if (r) return { id: r.id, slug: null };
        break;
      }
    }
    throw notFound(params.kind);
  }),
];
