import { endpoints, type Lyrics, type PlaybackSource } from "@musicdb/contracts";
import {
  artistFollows,
  artists,
  assets,
  genres,
  plays,
  releaseArtists,
  releaseSaves,
  releases,
  releaseTracks,
  trackArtists,
  trackGenres,
  tracks,
} from "@musicdb/db";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  ne,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Deps } from "../../context";
import { offsetPage, readOffset } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { ApiError, notFound } from "../../http/errors";
import { loadTrackDetail } from "./detail";
import {
  artistColumns,
  hydrateReleases,
  hydrateTracks,
  loadTracks,
  publishedTracks,
  releaseColumns,
  selectTracks,
  toArtist,
} from "./hydrate";

const byIdOrSlug = (idCol: AnyPgColumn, slugCol: AnyPgColumn, value: string) =>
  or(eq(idCol, value), eq(slugCol, value));

export function parseLrc(text: string | null): Lyrics["synced"] {
  if (!text) return null;
  const lines: { timeMs: number; text: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (stamps.length === 0) continue;
    const content = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
      lines.push({ timeMs: Number(m[1]) * 60_000 + Number(m[2]) * 1000 + frac, text: content });
    }
  }
  return lines.length ? lines.sort((a, b) => a.timeMs - b.timeMs) : null;
}

const SIGNED_URL_TTL = 6 * 3600;

export async function resolvePlayback(
  deps: Deps,
  trackId: string,
  prefer: "audio" | "youtube",
): Promise<PlaybackSource> {
  const [row] = await deps.db
    .select({
      id: tracks.id,
      title: tracks.title,
      durationMs: tracks.durationMs,
      source: tracks.source,
      status: tracks.status,
      youtubeVideoId: tracks.youtubeVideoId,
      streamKey: assets.streamKey,
      streamFormat: assets.streamFormat,
      assetStatus: assets.status,
      mimeType: assets.mimeType,
      loudness: assets.loudnessLufs,
    })
    .from(tracks)
    .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
    .where(eq(tracks.id, trackId));
  if (row?.status !== "published") throw notFound("track");

  const audio = row.assetStatus === "ready" && row.streamKey ? row : null;
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString();
  const audioSource = async (): Promise<PlaybackSource> => ({
    type: "file",
    url: await deps.storage.presignGet(audio!.streamKey!, {
      expiresIn: SIGNED_URL_TTL,
      contentType: audio!.mimeType ?? "audio/mpeg",
    }),
    mimeType: audio!.mimeType ?? "audio/mpeg",
    expiresAt,
    loudnessLufs: audio!.loudness,
  });

  if (audio && (prefer === "audio" || !row.youtubeVideoId)) return audioSource();
  if (row.youtubeVideoId) return { type: "youtube", videoId: row.youtubeVideoId };

  if (row.source === "catalog") {
    const credits = await deps.db
      .select({ name: artists.name })
      .from(trackArtists)
      .innerJoin(artists, eq(artists.id, trackArtists.artistId))
      .where(eq(trackArtists.trackId, trackId))
      .orderBy(asc(trackArtists.position));
    const query = `${credits.map((c) => c.name).join(" ")} ${row.title}`;
    const videoId = await deps.youtube.search(query, row.durationMs);
    if (videoId) {
      await deps.db.update(tracks).set({ youtubeVideoId: videoId }).where(eq(tracks.id, trackId));
      return { type: "youtube", videoId };
    }
  }
  throw new ApiError(404, "not_playable", "Цей трек поки неможливо відтворити");
}

const sortOrder = {
  popular: [desc(tracks.playCount), desc(tracks.ratingCount), asc(tracks.id)],
  newest: [sql`${tracks.releaseDate} desc nulls last`, desc(tracks.createdAt), asc(tracks.id)],
  oldest: [sql`${tracks.releaseDate} asc nulls last`, asc(tracks.id)],
  title: [asc(sql`lower(${tracks.title})`), asc(tracks.id)],
  rating: [
    sql`case when ${tracks.ratingCount} > 0 then ${tracks.ratingSum}::float / ${tracks.ratingCount} end desc nulls last`,
    asc(tracks.id),
  ],
  added: [desc(tracks.createdAt), asc(tracks.id)],
} as const;

/** Вирази колонок таблиці каталогу для сортування в обидва боки. */
const columnExpr = {
  title: sql`lower(${tracks.title})`,
  artist: sql`(select lower(a.name) from track_artists ta join artists a on a.id = ta.artist_id
    where ta.track_id = ${tracks.id} order by ta.position limit 1)`,
  release: sql`${tracks.releaseDate}`,
  duration: sql`${tracks.durationMs}`,
  album: sql`lower(${releases.title})`,
  plays: sql`${tracks.playCount}`,
  rating: sql`case when ${tracks.ratingCount} > 0 then ${tracks.ratingSum}::float / ${tracks.ratingCount} end`,
  added: sql`${tracks.createdAt}`,
} as const;

/** Екранування % і _ для LIKE. */
export const likePattern = (word: string) => `%${word.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

/** Текстовий фільтр таблиці: кожне слово має бути в назві, виконавцях або альбомі (без регістру й діакритики). */
export function trackTextFilter(q: string): SQL[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  return words.map((w) => {
    const pattern = likePattern(w);
    return sql`(exists (select 1 from search_documents sd where sd.entity_type = 'track' and sd.entity_id = ${tracks.id}
        and sd.normalized like lower(immutable_unaccent(${pattern})))
      or lower(immutable_unaccent(coalesce(${releases.title}, ''))) like lower(immutable_unaccent(${pattern})))`;
  });
}

export const catalogRoutes = [
  implement(endpoints.tracks.browse, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const filters: SQL[] = [publishedTracks];
    if (query.source) filters.push(eq(tracks.source, query.source));
    if (query.playable === "audio") filters.push(eq(assets.status, "ready"));
    if (query.ids?.length) filters.push(inArray(tracks.id, query.ids));
    if (query.q) filters.push(...trackTextFilter(query.q));
    if (query.decade !== undefined) {
      filters.push(
        sql`coalesce(${tracks.releaseDate}, ${releases.releaseDate}) >= ${`${query.decade}-01-01`}
          and coalesce(${tracks.releaseDate}, ${releases.releaseDate}) < ${`${query.decade + 10}-01-01`}`,
      );
    }
    if (query.genre) {
      filters.push(
        inArray(
          tracks.id,
          deps.db
            .select({ id: trackGenres.trackId })
            .from(trackGenres)
            .innerJoin(genres, eq(genres.id, trackGenres.genreId))
            .where(or(eq(genres.slug, query.genre), eq(genres.id, query.genre))),
        ),
      );
    }
    const order = query.column
      ? [sql`${columnExpr[query.column]} ${sql.raw(query.dir)} nulls last`, asc(tracks.id)]
      : query.sort === "random"
        ? [sql`md5(${tracks.id} || ${query.seed ?? "0"})`]
        : sortOrder[query.sort];
    const rows = await selectTracks(deps.db)
      .where(and(...filters))
      .orderBy(...order)
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateTracks(deps.db, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.tracks.get, async ({ deps, params, user }) => loadTrackDetail(deps, params.id, user)),

  implement(endpoints.tracks.lyrics, async ({ deps, params }) => {
    const [row] = await deps.db
      .select({ lyrics: tracks.lyrics, synced: tracks.lyricsSynced })
      .from(tracks)
      .where(and(eq(tracks.id, params.id), publishedTracks));
    if (!row) throw notFound("track");
    const synced = parseLrc(row.synced);
    const plain = row.lyrics ?? (synced ? synced.map((l) => l.text).join("\n") : null);
    return { trackId: params.id, plain, synced };
  }),

  implement(endpoints.tracks.playback, async ({ deps, params, query }) =>
    resolvePlayback(deps, params.id, query.prefer),
  ),

  implement(endpoints.tracks.radio, async ({ deps, params, query }) => {
    const exclude = [params.id, ...(query.exclude ?? [])];
    const seedArtists = deps.db
      .select({ id: trackArtists.artistId })
      .from(trackArtists)
      .where(eq(trackArtists.trackId, params.id));
    const seedGenres = deps.db
      .select({ id: trackGenres.genreId })
      .from(trackGenres)
      .where(eq(trackGenres.trackId, params.id));
    const playable = deps.env.youtubeKeys.length
      ? sql`true`
      : sql`(${tracks.youtubeVideoId} is not null or coalesce(${assets.status} = 'ready', false))`;

    // Кандидати: спільні жанри (вага за кількістю збігів) + той самий виконавець; трохи випадковості.
    const scored = await deps.db
      .select({
        id: tracks.id,
        score: sql<number>`(
          (select count(*) from ${trackGenres} g where g.track_id = ${tracks.id} and g.genre_id in (${seedGenres})) * 2
          + case when exists (select 1 from ${trackArtists} a where a.track_id = ${tracks.id} and a.artist_id in (${seedArtists})) then 2 else 0 end
          + ln(1 + ${tracks.playCount}) * 0.2
          + random() * 1.5
        )`.as("score"),
      })
      .from(tracks)
      .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
      .where(
        and(
          publishedTracks,
          notInArray(tracks.id, exclude),
          playable,
          or(
            inArray(
              tracks.id,
              deps.db
                .select({ id: trackGenres.trackId })
                .from(trackGenres)
                .where(inArray(trackGenres.genreId, seedGenres)),
            ),
            inArray(
              tracks.id,
              deps.db
                .select({ id: trackArtists.trackId })
                .from(trackArtists)
                .where(inArray(trackArtists.artistId, seedArtists)),
            ),
          ),
        ),
      )
      .orderBy(desc(sql`score`))
      .limit(query.limit * 3);

    // Не більше двох поспіль від одного виконавця — щоб радіо не перетворювалось на дискографію.
    const items = await loadTracks(
      deps.db,
      scored.map((s) => s.id),
    );
    const result: typeof items = [];
    const perArtist = new Map<string, number>();
    for (const t of items) {
      const main = t.artists[0]?.id ?? "";
      const n = perArtist.get(main) ?? 0;
      if (n >= 3) continue;
      perArtist.set(main, n + 1);
      result.push(t);
      if (result.length >= query.limit) break;
    }
    return { items: result };
  }),

  // ─── Виконавці ──────────────────────────────────────────────────────────

  implement(endpoints.artists.list, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const artistPlays = sql`(select coalesce(sum(t.play_count), 0) from track_artists ta
      join tracks t on t.id = ta.track_id where ta.artist_id = ${artists.id})`;
    const order = {
      popular: [desc(artistPlays), desc(artists.followerCount), desc(artists.trackCount)],
      tracks: [desc(artists.trackCount), desc(artists.followerCount)],
      followers: [desc(artists.followerCount), desc(artists.trackCount)],
      name: [asc(sql`lower(${artists.name})`)],
      name_desc: [desc(sql`lower(${artists.name})`)],
      newest: [desc(artists.createdAt)],
    }[query.sort];
    const rows = await deps.db
      .select(artistColumns)
      .from(artists)
      .where(
        and(
          sql`${artists.trackCount} > 0`,
          query.q
            ? sql`lower(immutable_unaccent(${artists.name})) like lower(immutable_unaccent(${likePattern(query.q)}))`
            : undefined,
        ),
      )
      .orderBy(...order, asc(artists.id))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: page.items.map(toArtist), nextCursor: page.nextCursor };
  }),

  implement(endpoints.artists.get, async ({ deps, params, user }) => {
    const [artist] = await deps.db
      .select({
        ...artistColumns,
        bio: artists.bio,
        bioSource: artists.bioSource,
        links: artists.links,
        country: artists.country,
        beginYear: artists.beginYear,
        artistType: artists.artistType,
      })
      .from(artists)
      .where(byIdOrSlug(artists.id, artists.slug, params.id));
    if (!artist) throw notFound("artist");
    const id = artist.id;
    const db = deps.db;
    const since = new Date(Date.now() - 28 * 86400_000);

    const [topRows, ownReleases, appears, genreRows, listeners, following] = await Promise.all([
      selectTracks(db)
        .where(
          and(
            publishedTracks,
            inArray(
              tracks.id,
              db.select({ id: trackArtists.trackId }).from(trackArtists).where(eq(trackArtists.artistId, id)),
            ),
          ),
        )
        .orderBy(
          desc(tracks.playCount),
          desc(tracks.ratingCount),
          sql`${tracks.youtubeVideoId} is null`,
          desc(tracks.releaseDate),
        )
        .limit(10),
      db
        .select(releaseColumns)
        .from(releaseArtists)
        .innerJoin(releases, eq(releases.id, releaseArtists.releaseId))
        .where(and(eq(releaseArtists.artistId, id), sql`${releases.trackCount} > 0`))
        .orderBy(sql`${releases.releaseDate} desc nulls last`),
      db
        .selectDistinct(releaseColumns)
        .from(trackArtists)
        .innerJoin(releaseTracks, eq(releaseTracks.trackId, trackArtists.trackId))
        .innerJoin(releases, eq(releases.id, releaseTracks.releaseId))
        .where(
          and(
            eq(trackArtists.artistId, id),
            notInArray(
              releases.id,
              db
                .select({ id: releaseArtists.releaseId })
                .from(releaseArtists)
                .where(eq(releaseArtists.artistId, id)),
            ),
          ),
        )
        .limit(20),
      db
        .select({ id: genres.id, name: genres.name, slug: genres.slug, n: count() })
        .from(trackArtists)
        .innerJoin(trackGenres, eq(trackGenres.trackId, trackArtists.trackId))
        .innerJoin(genres, eq(genres.id, trackGenres.genreId))
        .where(eq(trackArtists.artistId, id))
        .groupBy(genres.id)
        .orderBy(desc(count()))
        .limit(6),
      db
        .select({ n: countDistinct(plays.userId) })
        .from(plays)
        .innerJoin(trackArtists, eq(trackArtists.trackId, plays.trackId))
        .where(and(eq(trackArtists.artistId, id), gte(plays.playedAt, since))),
      user
        ? db
            .select({ one: sql<number>`1` })
            .from(artistFollows)
            .where(and(eq(artistFollows.userId, user.id), eq(artistFollows.artistId, id)))
        : Promise.resolve([]),
    ]);

    // Схожі виконавці — за кількістю спільних жанрів, з урахуванням популярності.
    const genreIds = genreRows.map((g) => g.id);
    const related = genreIds.length
      ? await db
          .select({ ...artistColumns, shared: countDistinct(trackGenres.genreId) })
          .from(trackGenres)
          .innerJoin(trackArtists, eq(trackArtists.trackId, trackGenres.trackId))
          .innerJoin(artists, eq(artists.id, trackArtists.artistId))
          .where(
            and(inArray(trackGenres.genreId, genreIds), ne(artists.id, id), sql`${artists.trackCount} >= 3`),
          )
          .groupBy(artists.id)
          .orderBy(desc(countDistinct(trackGenres.genreId)), desc(artists.trackCount))
          .limit(12)
      : [];

    const [topTracks, releaseList, appearsOn] = await Promise.all([
      hydrateTracks(db, topRows),
      hydrateReleases(db, ownReleases),
      hydrateReleases(db, appears),
    ]);
    return {
      ...toArtist(artist),
      bio: artist.bio ?? null,
      bioSource: artist.bioSource ?? null,
      links: artist.links ?? [],
      country: artist.country ?? null,
      beginYear: artist.beginYear ?? null,
      artistType: artist.artistType ?? null,
      genres: genreRows.map(({ id: gid, name, slug }) => ({ id: gid, name, slug })),
      topTracks,
      releases: releaseList,
      appearsOn,
      related: related.map(toArtist),
      monthlyListeners: listeners[0]?.n ?? 0,
      viewer: user ? { following: following.length > 0 } : null,
    };
  }),

  implement(endpoints.artists.tracks, async ({ deps, params, query }) => {
    const [artist] = await deps.db
      .select({ id: artists.id })
      .from(artists)
      .where(byIdOrSlug(artists.id, artists.slug, params.id));
    if (!artist) throw notFound("artist");
    const offset = readOffset(query.cursor);
    const rows = await selectTracks(deps.db)
      .where(
        and(
          publishedTracks,
          inArray(
            tracks.id,
            deps.db
              .select({ id: trackArtists.trackId })
              .from(trackArtists)
              .where(eq(trackArtists.artistId, artist.id)),
          ),
        ),
      )
      .orderBy(...sortOrder[query.sort])
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateTracks(deps.db, page.items), nextCursor: page.nextCursor };
  }),

  // ─── Релізи ─────────────────────────────────────────────────────────────

  implement(endpoints.releases.get, async ({ deps, params, user }) => {
    const db = deps.db;
    const [row] = await db
      .select({ ...releaseColumns, label: releases.label })
      .from(releases)
      .where(eq(releases.id, params.id));
    if (!row) throw notFound("release");
    const [[release], trackRows, saved] = await Promise.all([
      hydrateReleases(db, [row]),
      selectTracks(db)
        .innerJoin(
          releaseTracks,
          and(eq(releaseTracks.trackId, tracks.id), eq(releaseTracks.releaseId, params.id)),
        )
        .where(publishedTracks)
        .orderBy(asc(releaseTracks.disc), asc(releaseTracks.position), asc(tracks.title)),
      user
        ? db
            .select({ one: sql<number>`1` })
            .from(releaseSaves)
            .where(and(eq(releaseSaves.userId, user.id), eq(releaseSaves.releaseId, params.id)))
        : Promise.resolve([]),
    ]);
    const mainArtist = release!.artists[0]?.id;
    const more = mainArtist
      ? await db
          .select(releaseColumns)
          .from(releaseArtists)
          .innerJoin(releases, eq(releases.id, releaseArtists.releaseId))
          .where(
            and(
              eq(releaseArtists.artistId, mainArtist),
              ne(releases.id, params.id),
              sql`${releases.trackCount} > 0`,
            ),
          )
          .orderBy(sql`${releases.releaseDate} desc nulls last`)
          .limit(12)
      : [];
    return {
      ...release!,
      label: row.label,
      tracks: await hydrateTracks(db, trackRows),
      moreByArtist: await hydrateReleases(db, more),
      viewer: user ? { saved: saved.length > 0 } : null,
    };
  }),

  implement(endpoints.releases.newReleases, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select(releaseColumns)
      .from(releases)
      .where(
        and(
          isNotNull(releases.releaseDate),
          sql`${releases.trackCount} > 0`,
          sql`${releases.releaseDate} <= current_date`,
        ),
      )
      .orderBy(desc(releases.releaseDate), asc(releases.id))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateReleases(deps.db, page.items), nextCursor: page.nextCursor };
  }),

  // ─── Жанри ──────────────────────────────────────────────────────────────

  implement(endpoints.genres.list, async ({ deps }) => {
    const rows = await deps.db
      .select({ id: genres.id, name: genres.name, slug: genres.slug, trackCount: genres.trackCount })
      .from(genres)
      .where(sql`${genres.trackCount} > 0`)
      .orderBy(desc(genres.trackCount), asc(genres.name));
    return { items: rows };
  }),

  implement(endpoints.genres.get, async ({ deps, params }) => {
    const db = deps.db;
    const [genre] = await db
      .select({ id: genres.id, name: genres.name, slug: genres.slug, trackCount: genres.trackCount })
      .from(genres)
      .where(byIdOrSlug(genres.id, genres.slug, params.id));
    if (!genre) throw notFound("genre");
    const genreTracks = db
      .select({ id: trackGenres.trackId })
      .from(trackGenres)
      .where(eq(trackGenres.genreId, genre.id));
    const [topArtists, related] = await Promise.all([
      db
        .select({ ...artistColumns, n: count() })
        .from(trackArtists)
        .innerJoin(artists, eq(artists.id, trackArtists.artistId))
        .where(inArray(trackArtists.trackId, genreTracks))
        .groupBy(artists.id)
        .orderBy(desc(count()), desc(artists.followerCount))
        .limit(12),
      db
        .select({
          id: genres.id,
          name: genres.name,
          slug: genres.slug,
          trackCount: genres.trackCount,
          n: count(),
        })
        .from(trackGenres)
        .innerJoin(genres, eq(genres.id, trackGenres.genreId))
        .where(and(inArray(trackGenres.trackId, genreTracks), ne(genres.id, genre.id)))
        .groupBy(genres.id)
        .orderBy(desc(count()))
        .limit(10),
    ]);
    return {
      ...genre,
      topArtists: topArtists.map(toArtist),
      related: related.map(({ id, name, slug, trackCount }) => ({ id, name, slug, trackCount })),
    };
  }),
];
