/**
 * Запис у каталог: створення й зміна треків з чернетки (заявка, адмінка) — виконавці й жанри
 * знаходяться за нормалізованою назвою або створюються, реліз — за назвою й головним виконавцем.
 */
import type { TrackDraft, TrackDraftPatch } from "@musicdb/contracts";
import {
  artists,
  assets,
  type DbOrTx,
  genres,
  indexEntities,
  newId,
  normalizeName,
  releaseArtists,
  releases,
  releaseTracks,
  slugify,
  trackArtists,
  trackGenres,
  tracks,
} from "@musicdb/db";
import { and, eq, sql } from "drizzle-orm";
import { badRequest } from "../../http/errors";

/** youtu.be/ID, watch?v=ID, /shorts/ID, /embed/ID, music.youtube.com або голий 11-символьний ID. */
export function parseYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/(?:youtu\.be\/|\/shorts\/|\/embed\/|\/live\/|[?&]v=)([A-Za-z0-9_-]{11})/) ??
    s.match(/^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/.*?([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

async function uniqueArtistSlug(db: DbOrTx, name: string) {
  const base = slugify(name);
  const taken = await db
    .select({ slug: artists.slug })
    .from(artists)
    .where(sql`${artists.slug} = ${base} or ${artists.slug} like ${`${base}-%`}`);
  const set = new Set(taken.map((t) => t.slug));
  let slug = base;
  for (let i = 2; set.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export async function findOrCreateArtists(db: DbOrTx, names: string[]) {
  const result: { id: string; name: string }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const normalized = normalizeName(name);
    const [found] = await db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(eq(artists.normalizedName, normalized))
      .limit(1);
    if (found) {
      if (!result.some((r) => r.id === found.id)) result.push(found);
      continue;
    }
    const [created] = await db
      .insert(artists)
      .values({ id: newId(), name, normalizedName: normalized, slug: await uniqueArtistSlug(db, name) })
      .returning({ id: artists.id, name: artists.name });
    result.push(created!);
  }
  return result;
}

export async function findOrCreateGenres(db: DbOrTx, names: string[]) {
  const result: string[] = [];
  for (const raw of names) {
    const name = normalizeName(raw);
    if (!name) continue;
    const [found] = await db
      .select({ id: genres.id })
      .from(genres)
      .where(sql`lower(${genres.name}) = ${name}`)
      .limit(1);
    if (found) {
      result.push(found.id);
      continue;
    }
    let slug = slugify(name);
    const [clash] = await db.select({ id: genres.id }).from(genres).where(eq(genres.slug, slug));
    if (clash) slug = `${slug}-${newId().slice(0, 4).toLowerCase()}`;
    const [created] = await db.insert(genres).values({ name, slug }).returning({ id: genres.id });
    result.push(created!.id);
  }
  return [...new Set(result)];
}

async function findOrCreateRelease(
  db: DbOrTx,
  title: string,
  mainArtistId: string,
  releaseDate: string | null,
) {
  const [found] = await db
    .select({ id: releases.id })
    .from(releases)
    .innerJoin(releaseArtists, eq(releaseArtists.releaseId, releases.id))
    .where(
      and(
        eq(releaseArtists.artistId, mainArtistId),
        sql`lower(${releases.title}) = ${title.trim().toLowerCase()}`,
      ),
    )
    .limit(1);
  if (found) return found.id;
  const [created] = await db
    .insert(releases)
    .values({ title: title.trim(), type: "album", releaseDate })
    .returning({ id: releases.id });
  await db.insert(releaseArtists).values({ releaseId: created!.id, artistId: mainArtistId, position: 0 });
  return created!.id;
}

async function audioAssetFor(db: DbOrTx, uploadId: string | undefined) {
  if (!uploadId) return null;
  const [asset] = await db.select().from(assets).where(eq(assets.id, uploadId));
  if (asset?.kind !== "audio" || asset.status === "pending" || asset.status === "failed") {
    throw badRequest("audio_not_ready", "Аудіофайл не завантажено або він ще обробляється з помилкою");
  }
  return asset;
}

async function refreshCounts(db: DbOrTx, artistIds: string[], genreIds: string[], releaseIds: string[]) {
  if (artistIds.length) {
    await db.execute(sql`update ${artists} a set track_count = (
      select count(distinct t.id) from ${trackArtists} ta join ${tracks} t on t.id = ta.track_id and t.status = 'published'
      where ta.artist_id = a.id) where a.id in (${sql.join(
        artistIds.map((id) => sql`${id}`),
        sql`, `,
      )})`);
  }
  if (genreIds.length) {
    await db.execute(sql`update ${genres} g set track_count = (select count(*) from ${trackGenres} tg where tg.genre_id = g.id)
      where g.id in (${sql.join(
        genreIds.map((id) => sql`${id}`),
        sql`, `,
      )})`);
  }
  if (releaseIds.length) {
    await db.execute(sql`update ${releases} r set
      track_count = (select count(*) from ${releaseTracks} rt join ${tracks} t on t.id = rt.track_id and t.status = 'published' where rt.release_id = r.id),
      duration_ms = coalesce((select sum(t.duration_ms) from ${releaseTracks} rt join ${tracks} t on t.id = rt.track_id and t.status = 'published' where rt.release_id = r.id), 0)
      where r.id in (${sql.join(
        releaseIds.map((id) => sql`${id}`),
        sql`, `,
      )})`);
  }
}

export async function createTrack(
  db: DbOrTx,
  draft: TrackDraft,
  opts: { source: "catalog" | "community"; uploaderId: string | null },
) {
  const credited = await findOrCreateArtists(db, draft.artists);
  if (credited.length === 0) throw badRequest("artists_required", "Вкажіть виконавця");
  const genreIds = await findOrCreateGenres(db, draft.genres ?? []);
  const audio = await audioAssetFor(db, draft.audioUploadId);
  const releaseId = draft.releaseTitle
    ? await findOrCreateRelease(db, draft.releaseTitle, credited[0]!.id, draft.releaseDate ?? null)
    : null;
  const [track] = await db
    .insert(tracks)
    .values({
      title: draft.title.trim(),
      durationMs: draft.durationMs ?? audio?.durationMs ?? 0,
      explicit: draft.explicit ?? false,
      releaseDate: draft.releaseDate ?? null,
      primaryReleaseId: releaseId,
      source: opts.source,
      status: "published",
      uploaderId: opts.uploaderId,
      youtubeVideoId: parseYoutubeId(draft.youtubeUrl),
      audioAssetId: audio?.id ?? null,
      lyrics: draft.lyrics?.trim() || null,
    })
    .returning({ id: tracks.id });
  const id = track!.id;
  await db.insert(trackArtists).values(
    credited.map((a, i) => ({
      trackId: id,
      artistId: a.id,
      position: i,
      role: i === 0 ? ("main" as const) : ("featured" as const),
    })),
  );
  if (genreIds.length)
    await db.insert(trackGenres).values(genreIds.map((g, i) => ({ trackId: id, genreId: g, position: i })));
  if (releaseId) {
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(releaseTracks)
      .where(eq(releaseTracks.releaseId, releaseId));
    await db.insert(releaseTracks).values({ releaseId, trackId: id, position: n + 1 });
  }
  await refreshCounts(
    db,
    credited.map((a) => a.id),
    genreIds,
    releaseId ? [releaseId] : [],
  );
  await indexEntities(db, "track", [id]);
  await indexEntities(
    db,
    "artist",
    credited.map((a) => a.id),
  );
  if (releaseId) await indexEntities(db, "release", [releaseId]);
  return { id, artistIds: credited.map((a) => a.id) };
}

export async function updateTrack(
  db: DbOrTx,
  id: string,
  patch: TrackDraftPatch & {
    source?: "catalog" | "community";
    status?: "published" | "hidden";
    lyricsSynced?: string | null;
  },
) {
  const [current] = await db.select().from(tracks).where(eq(tracks.id, id));
  if (!current) throw badRequest("track_not_found", "Трек не знайдено");
  const set: Partial<typeof tracks.$inferInsert> = {};
  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.durationMs !== undefined) set.durationMs = patch.durationMs;
  if (patch.explicit !== undefined) set.explicit = patch.explicit;
  if (patch.releaseDate !== undefined) set.releaseDate = patch.releaseDate;
  if (patch.youtubeUrl !== undefined) set.youtubeVideoId = parseYoutubeId(patch.youtubeUrl);
  if (patch.lyrics !== undefined) set.lyrics = patch.lyrics?.trim() || null;
  if (patch.lyricsSynced !== undefined) set.lyricsSynced = patch.lyricsSynced;
  if (patch.source !== undefined) set.source = patch.source;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.audioUploadId !== undefined) {
    const audio = await audioAssetFor(db, patch.audioUploadId);
    set.audioAssetId = audio?.id ?? null;
    if (audio?.durationMs && !current.durationMs) set.durationMs = audio.durationMs;
  }

  const touchedArtists: string[] = [];
  const touchedGenres: string[] = [];
  const touchedReleases: string[] = [];
  if (patch.artists) {
    const old = await db
      .select({ id: trackArtists.artistId })
      .from(trackArtists)
      .where(eq(trackArtists.trackId, id));
    const credited = await findOrCreateArtists(db, patch.artists);
    await db.delete(trackArtists).where(eq(trackArtists.trackId, id));
    await db.insert(trackArtists).values(
      credited.map((a, i) => ({
        trackId: id,
        artistId: a.id,
        position: i,
        role: i === 0 ? ("main" as const) : ("featured" as const),
      })),
    );
    touchedArtists.push(...old.map((o) => o.id), ...credited.map((a) => a.id));
  }
  if (patch.genres) {
    const old = await db
      .select({ id: trackGenres.genreId })
      .from(trackGenres)
      .where(eq(trackGenres.trackId, id));
    const genreIds = await findOrCreateGenres(db, patch.genres);
    await db.delete(trackGenres).where(eq(trackGenres.trackId, id));
    if (genreIds.length)
      await db.insert(trackGenres).values(genreIds.map((g, i) => ({ trackId: id, genreId: g, position: i })));
    touchedGenres.push(...old.map((o) => o.id), ...genreIds);
  }
  if (patch.releaseTitle !== undefined) {
    const [main] = await db
      .select({ id: trackArtists.artistId })
      .from(trackArtists)
      .where(eq(trackArtists.trackId, id))
      .orderBy(trackArtists.position)
      .limit(1);
    if (current.primaryReleaseId) touchedReleases.push(current.primaryReleaseId);
    if (patch.releaseTitle && main) {
      const releaseId = await findOrCreateRelease(
        db,
        patch.releaseTitle,
        main.id,
        patch.releaseDate ?? current.releaseDate,
      );
      set.primaryReleaseId = releaseId;
      await db
        .insert(releaseTracks)
        .values({ releaseId, trackId: id, position: current.trackNumber ?? 0 })
        .onConflictDoNothing();
      touchedReleases.push(releaseId);
    } else {
      set.primaryReleaseId = null;
    }
  }
  if (Object.keys(set).length) await db.update(tracks).set(set).where(eq(tracks.id, id));
  if (patch.status !== undefined && !patch.artists) {
    const credited = await db
      .select({ id: trackArtists.artistId })
      .from(trackArtists)
      .where(eq(trackArtists.trackId, id));
    touchedArtists.push(...credited.map((c) => c.id));
  }
  await refreshCounts(
    db,
    [...new Set(touchedArtists)],
    [...new Set(touchedGenres)],
    [...new Set(touchedReleases)],
  );
  const [after] = await db.select({ status: tracks.status }).from(tracks).where(eq(tracks.id, id));
  if (after?.status === "published") await indexEntities(db, "track", [id]);
  else await db.execute(sql`delete from search_documents where entity_type = 'track' and entity_id = ${id}`);
  if (touchedArtists.length) await indexEntities(db, "artist", [...new Set(touchedArtists)]);
}

export async function removeTrack(db: DbOrTx, id: string) {
  const credited = await db
    .select({ id: trackArtists.artistId })
    .from(trackArtists)
    .where(eq(trackArtists.trackId, id));
  const rel = await db
    .select({ id: releaseTracks.releaseId })
    .from(releaseTracks)
    .where(eq(releaseTracks.trackId, id));
  await db.update(tracks).set({ status: "removed" }).where(eq(tracks.id, id));
  await db.execute(sql`delete from search_documents where entity_type = 'track' and entity_id = ${id}`);
  await refreshCounts(
    db,
    credited.map((c) => c.id),
    [],
    rel.map((r) => r.id),
  );
}
