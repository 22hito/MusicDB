import {
  endpoints,
  type SearchResults,
  type SearchType,
  type Shelf,
  type TopResult,
} from "@musicdb/contracts";
import {
  artistFollows,
  artists,
  assets,
  type DbOrTx,
  genres,
  playlists,
  plays,
  releaseArtists,
  releases,
  trackGenres,
  tracks,
} from "@musicdb/db";
import { and, desc, eq, gte, inArray, isNotNull, type SQL, sql } from "drizzle-orm";
import type { Context } from "hono";
import type { AppEnv, Deps, SessionUser } from "../../context";
import { implement } from "../../http/endpoint";
import { memo } from "../../http/memo";
import {
  artistColumns,
  hydratePlaylists,
  hydrateReleases,
  hydrateTracks,
  loadTracks,
  loadUserRefs,
  publishedTracks,
  releaseColumns,
  rowsOf,
  selectTracks,
  toArtist,
} from "../catalog/hydrate";
import { catalogStats } from "./stats";
import { era, timeline } from "./time-machine";

// ─── Мова полиць ──────────────────────────────────────────────────────────

const titles = {
  uk: {
    recent: "Нещодавно прослухане",
    forYou: "Підібрано для вас",
    yourPlaylists: "Ваші плейлисти",
    followedReleases: "Нове від ваших виконавців",
    trending: "Популярне зараз",
    newReleases: "Нові релізи",
    artists: "Популярні виконавці",
    genres: "Жанри",
    community: "Свіже від ком'юніті",
    playlists: "Плейлисти слухачів",
  },
  en: {
    recent: "Recently played",
    forYou: "Made for you",
    yourPlaylists: "Your playlists",
    followedReleases: "New from artists you follow",
    trending: "Trending now",
    newReleases: "New releases",
    artists: "Popular artists",
    genres: "Genres",
    community: "Fresh from the community",
    playlists: "Listener playlists",
  },
} as const;

export function localeOf(c: Context<AppEnv>): "uk" | "en" {
  const header = c.req.header("accept-language") ?? "";
  return /^en\b/i.test(header) ? "en" : "uk";
}

/** Треки, які можна відтворити просто зараз (є файл, відео або налаштований пошук YouTube). */
export function playableFilter(deps: Deps) {
  return deps.env.youtubeKeys.length
    ? sql`true`
    : sql`(${tracks.youtubeVideoId} is not null or coalesce(${assets.status} = 'ready', false))`;
}

// ─── Чарт ─────────────────────────────────────────────────────────────────

/** Фільтр «трек належить жанру» (slug або id). */
export function inGenre(db: DbOrTx, genre: string) {
  return inArray(
    tracks.id,
    db
      .select({ id: trackGenres.trackId })
      .from(trackGenres)
      .innerJoin(genres, eq(genres.id, trackGenres.genreId))
      .where(sql`${genres.slug} = ${genre} or ${genres.id} = ${genre}`),
  );
}

export async function topTracks(
  deps: Deps,
  opts: {
    period: "day" | "week" | "month" | "all";
    source?: "catalog" | "community" | undefined;
    genre?: string | undefined;
    limit: number;
  },
) {
  const db = deps.db;
  const days = { day: 1, week: 7, month: 30, all: null }[opts.period];
  const scope = and(
    publishedTracks,
    opts.source ? eq(tracks.source, opts.source) : undefined,
    opts.genre ? inGenre(db, opts.genre) : undefined,
  );
  // Як у v1: місце — за кількістю різних людей, що слухали пісню; далі — за прослуховуваннями.
  const listeners = sql<number>`count(distinct ${plays.userId})::int`;
  const rankWindow = (from: Date | null, to: Date | null, limit: number) =>
    db
      .select({ id: plays.trackId, plays: sql<number>`count(*)::int`, listeners })
      .from(plays)
      .innerJoin(tracks, eq(tracks.id, plays.trackId))
      .where(
        and(
          from ? gte(plays.playedAt, from) : undefined,
          to ? sql`${plays.playedAt} < ${to.toISOString()}` : undefined,
          scope,
        ),
      )
      .groupBy(plays.trackId)
      .orderBy(desc(listeners), desc(sql`count(*)`), plays.trackId)
      .limit(limit);

  const now = Date.now();
  const since = days ? new Date(now - days * 86400_000) : null;
  let ranked: { id: string; plays: number; listeners: number }[] = await rankWindow(since, null, opts.limit);
  // Рух у чарті (як у Billboard/Last.fm): місце за попередній такий самий період.
  const previous = new Map<string, number>();
  if (days && ranked.length) {
    const prev = await rankWindow(new Date(now - 2 * days * 86400_000), since, 500);
    for (const [i, r] of prev.entries()) previous.set(r.id, i + 1);
  }
  const charted = new Set(ranked.map((r) => r.id));
  if (ranked.length < opts.limit) {
    // Добираємо за прослуховуваннями за весь час, далі — відтворювані й нові: чарт не буває порожнім.
    const taken = ranked.map((r) => r.id);
    const rest = await db
      .select({ id: tracks.id, plays: sql<number>`${tracks.playCount}::int` })
      .from(tracks)
      .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
      .leftJoin(releases, eq(releases.id, tracks.primaryReleaseId))
      .where(
        and(
          scope,
          taken.length
            ? sql`${tracks.id} not in (${sql.join(
                taken.map((t) => sql`${t}`),
                sql`, `,
              )})`
            : undefined,
        ),
      )
      .orderBy(
        desc(tracks.playCount),
        // Коли є ключі YouTube, фільтр — константа true, а константу Postgres у ORDER BY не приймає.
        ...(deps.env.youtubeKeys.length ? [] : [desc(sql`${playableFilter(deps)}`)]),
        desc(tracks.ratingCount),
        sql`${releases.coverUrl} is null`,
        sql`${tracks.releaseDate} desc nulls last`,
      )
      .limit(opts.limit - ranked.length);
    ranked = [...ranked, ...rest.map((r) => ({ ...r, plays: days ? 0 : r.plays, listeners: 0 }))];
  }
  const items = await loadTracks(
    db,
    ranked.map((r) => r.id),
  );
  const byId = new Map(ranked.map((r) => [r.id, r]));
  return items.map((t, i) => {
    const inChart = charted.has(t.id);
    return {
      ...t,
      rank: i + 1,
      plays: byId.get(t.id)?.plays ?? 0,
      listeners: byId.get(t.id)?.listeners ?? 0,
      previousRank: inChart ? (previous.get(t.id) ?? null) : null,
      isNew: !!days && inChart && !previous.has(t.id),
    };
  });
}

// ─── Смак користувача ─────────────────────────────────────────────────────

/** Ваги виконавців і жанрів зі вподобаного (1.0) і прослуханого за пів року (0.3). */
async function tasteProfile(db: DbOrTx, userId: string) {
  const res = await db.execute(sql`
    with signals as (
      select l.track_id, 1.0 as w from track_likes l where l.user_id = ${userId}
      union all
      select p.track_id, 0.3 from plays p where p.user_id = ${userId} and p.played_at > now() - interval '180 days'
    )
    select 'artist' as kind, ta.artist_id as id, sum(s.w)::float as w from signals s join track_artists ta on ta.track_id = s.track_id group by ta.artist_id
    union all
    select 'genre', tg.genre_id, sum(s.w)::float from signals s join track_genres tg on tg.track_id = s.track_id group by tg.genre_id
  `);
  const rows = rowsOf<{ kind: "artist" | "genre"; id: string; w: number }>(res);
  const artistsW = rows.filter((r) => r.kind === "artist").sort((a, b) => b.w - a.w);
  const genresW = rows.filter((r) => r.kind === "genre").sort((a, b) => b.w - a.w);
  return { artists: artistsW.slice(0, 30), genres: genresW.slice(0, 15) };
}

/** «Ваш смак»: скільки вподобаних, скільки пісень у смаку, топ виконавців і жанрів. */
async function myTaste(db: DbOrTx, userId: string) {
  const profile = await tasteProfile(db, userId);
  const [counts] = rowsOf<{ liked: number; tracks: number }>(
    await db.execute(sql`
      select (select count(*)::int from track_likes where user_id = ${userId}) liked,
        (select count(distinct track_id)::int from (
          select track_id from track_likes where user_id = ${userId}
          union select track_id from plays where user_id = ${userId} and played_at > now() - interval '180 days'
        ) x) tracks`),
  );
  const artistIds = profile.artists.slice(0, 8).map((a) => a.id);
  const genreIds = profile.genres.slice(0, 8).map((g) => g.id);
  const artistRows = artistIds.length
    ? await db.select(artistColumns).from(artists).where(inArray(artists.id, artistIds))
    : [];
  const genreRows = genreIds.length
    ? await db
        .select({ id: genres.id, name: genres.name, slug: genres.slug })
        .from(genres)
        .where(inArray(genres.id, genreIds))
    : [];
  const order = <T extends { id: string }>(ids: string[], list: T[]) =>
    ids.flatMap((id) => list.filter((x) => x.id === id));
  return {
    likedCount: counts?.liked ?? 0,
    trackCount: counts?.tracks ?? 0,
    topArtists: order(artistIds, artistRows).map(toArtist),
    topGenres: order(genreIds, genreRows),
  };
}

/** Сума ваг збігів (жанрів чи виконавців) треку з профілем смаку; без ваг — 0. */
function weightSum(
  weights: { id: string; w: number }[],
  alias: "tg" | "ta",
  column: "genre_id" | "artist_id",
  table: SQL,
) {
  if (weights.length === 0) return sql`0::float`;
  const a = sql.raw(alias);
  const c = sql.raw(column);
  const cases = sql.join(
    weights.map((x) => sql`when ${a}.${c} = ${x.id} then ${x.w}::float`),
    sql` `,
  );
  return sql`coalesce((select sum(case ${cases} else 0::float end) from ${table} ${a} where ${a}.track_id = tracks.id), 0)`;
}

export async function recommend(
  deps: Deps,
  user: SessionUser,
  limit: number,
  locale: "uk" | "en",
  opts: { fallback?: boolean } = {},
) {
  const db = deps.db;
  const profile = await tasteProfile(db, user.id);
  if (profile.artists.length === 0 && profile.genres.length === 0) {
    if (opts.fallback === false) return [];
    const fallback = await topTracks(deps, { period: "month", limit });
    return fallback.map(({ rank: _r, plays: _p, listeners: _l, previousRank: _pr, isNew: _n, ...t }) => ({
      ...t,
      reason: locale === "en" ? "Popular on N'Owl" : "Популярне на N'Owl",
    }));
  }
  const artistW = new Map(profile.artists.map((a) => [a.id, a.w]));
  const genreW = new Map(profile.genres.map((g) => [g.id, g.w]));
  const artistIds = [...artistW.keys()];
  const genreIds = [...genreW.keys()];
  const res = await db.execute(sql`
    with cand as (
      select tracks.id,
        ${weightSum(profile.genres, "tg", "genre_id", sql`track_genres`)} as gs,
        ${weightSum(profile.artists, "ta", "artist_id", sql`track_artists`)} as ars
      from tracks
      left join assets on assets.id = tracks.audio_asset_id
      where tracks.status = 'published'
        and ${playableFilter(deps)}
        and not exists (select 1 from track_likes l where l.user_id = ${user.id} and l.track_id = tracks.id)
        and not exists (select 1 from plays p where p.user_id = ${user.id} and p.track_id = tracks.id and p.played_at > now() - interval '30 days')
        and (
          exists (select 1 from track_genres tg where tg.track_id = tracks.id and tg.genre_id in (${sql.join(
            (genreIds.length ? genreIds : ["-"]).map((id) => sql`${id}`),
            sql`, `,
          )}))
          or exists (select 1 from track_artists ta where ta.track_id = tracks.id and ta.artist_id in (${sql.join(
            (artistIds.length ? artistIds : ["-"]).map((id) => sql`${id}`),
            sql`, `,
          )}))
        )
    )
    select id, gs, ars from cand
    order by (gs * 1.0 + ars * 0.6 + random() * 0.8) desc
    limit ${limit * 3}
  `);
  const scored = rowsOf<{ id: string; gs: number; ars: number }>(res);
  const items = await loadTracks(
    db,
    scored.map((s) => s.id),
  );
  // Різноманіття: не більше двох треків одного виконавця.
  const perArtist = new Map<string, number>();
  const out = [];
  for (const t of items) {
    const main = t.artists[0]?.id ?? "";
    if ((perArtist.get(main) ?? 0) >= 2) continue;
    perArtist.set(main, (perArtist.get(main) ?? 0) + 1);
    const knownArtist = t.artists.find((a) => artistW.has(a.id));
    const knownGenre = t.genres.find((g) => genreW.has(g.id));
    const reason = knownArtist
      ? locale === "en"
        ? `Because you listen to ${knownArtist.name}`
        : `Бо ви слухаєте ${knownArtist.name}`
      : knownGenre
        ? locale === "en"
          ? `More ${knownGenre.name}`
          : `Більше ${knownGenre.name}`
        : locale === "en"
          ? "Picked for you"
          : "Підібрано для вас";
    out.push({ ...t, reason });
    if (out.length >= limit) break;
  }
  return out;
}

// ─── Пошук ────────────────────────────────────────────────────────────────

const allTypes: SearchType[] = ["track", "artist", "release", "playlist", "user", "genre"];

export async function search(
  deps: Deps,
  q: string,
  types: SearchType[] | undefined,
  limit: number,
): Promise<SearchResults> {
  const db = deps.db;
  const wanted = types?.length ? types : allTypes;
  const res = await db.execute(sql`
    with q as (select lower(immutable_unaccent(${q})) as n),
    words as (select w from regexp_split_to_table((select n from q), '[^[:alnum:]]+') w where w <> ''),
    tsq as (select case when count(*) = 0 then null else to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & ')) end as ts from words),
    hits as (
      select entity_type, entity_id, title,
        coalesce(ts_rank(document, (select ts from tsq)), 0) * 2
        + similarity(normalized, (select n from q))
        + case when lower(immutable_unaccent(title)) = (select n from q) then 1.5 else 0 end
        + popularity * 0.4 as score
      from search_documents
      where entity_type in (${sql.join(
        wanted.map((t) => sql`${t}`),
        sql`, `,
      )})
        and ((select ts from tsq) is not null and document @@ (select ts from tsq) or normalized % (select n from q))
    ),
    ranked as (select *, row_number() over (partition by entity_type order by score desc) rn from hits)
    select entity_type, entity_id, score from ranked where rn <= ${limit} order by score desc
  `);
  const hits = rowsOf<{ entity_type: SearchType; entity_id: string; score: number }>(res);
  const idsOf = (t: SearchType) => hits.filter((h) => h.entity_type === t).map((h) => h.entity_id);

  const [trackList, artistRows, releaseRows, playlistRows, userMap, genreRows] = await Promise.all([
    loadTracks(db, idsOf("track")),
    idsOf("artist").length
      ? db
          .select(artistColumns)
          .from(artists)
          .where(inArray(artists.id, idsOf("artist")))
      : [],
    idsOf("release").length
      ? db
          .select(releaseColumns)
          .from(releases)
          .where(inArray(releases.id, idsOf("release")))
      : [],
    idsOf("playlist").length
      ? db
          .select()
          .from(playlists)
          .where(and(inArray(playlists.id, idsOf("playlist")), eq(playlists.visibility, "public")))
      : [],
    loadUserRefs(db, idsOf("user")),
    idsOf("genre").length
      ? db
          .select({ id: genres.id, name: genres.name, slug: genres.slug, trackCount: genres.trackCount })
          .from(genres)
          .where(inArray(genres.id, idsOf("genre")))
      : [],
  ]);
  const order = <T extends { id: string }>(items: T[], type: SearchType) => {
    const pos = new Map(idsOf(type).map((id, i) => [id, i]));
    return [...items].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
  };
  const result: SearchResults = {
    query: q,
    top: null,
    tracks: order(trackList, "track"),
    artists: order(artistRows.map(toArtist), "artist"),
    releases: order(await hydrateReleases(db, releaseRows), "release"),
    playlists: order(await hydratePlaylists(db, playlistRows), "playlist"),
    users: order([...userMap.values()], "user"),
    genres: order(genreRows, "genre"),
  };
  for (const h of hits) {
    const pick = (): TopResult | null => {
      switch (h.entity_type) {
        case "track": {
          const item = result.tracks.find((x) => x.id === h.entity_id);
          return item ? { type: "track", item } : null;
        }
        case "artist": {
          const item = result.artists.find((x) => x.id === h.entity_id);
          return item ? { type: "artist", item } : null;
        }
        case "release": {
          const item = result.releases.find((x) => x.id === h.entity_id);
          return item ? { type: "release", item } : null;
        }
        case "playlist": {
          const item = result.playlists.find((x) => x.id === h.entity_id);
          return item ? { type: "playlist", item } : null;
        }
        case "user": {
          const item = result.users.find((x) => x.id === h.entity_id);
          return item ? { type: "user", item } : null;
        }
        case "genre": {
          const item = result.genres.find((x) => x.id === h.entity_id);
          return item ? { type: "genre", item } : null;
        }
      }
    };
    result.top = pick();
    if (result.top) break;
  }
  return result;
}

// ─── Маршрути ─────────────────────────────────────────────────────────────

export const discoverRoutes = [
  implement(endpoints.discover.home, async ({ c, deps, user }) => {
    const db = deps.db;
    const t = titles[localeOf(c)];
    const shelves: Shelf[] = [];

    if (user) {
      const recentRes = await db.execute(sql`
        select track_id from (
          select track_id, max(played_at) last from plays where user_id = ${user.id} group by track_id
        ) x order by last desc limit 12`);
      const recent = await loadTracks(
        db,
        rowsOf<{ track_id: string }>(recentRes).map((r) => r.track_id),
      );
      if (recent.length) shelves.push({ id: "recent", kind: "tracks", title: t.recent, items: recent });

      const forYou = await recommend(deps, user, 12, localeOf(c), { fallback: false });
      if (forYou.length) {
        shelves.push({
          id: "for-you",
          kind: "tracks",
          title: t.forYou,
          items: forYou.map(({ reason: _r, ...x }) => x),
        });
      }

      const followed = await db
        .select(releaseColumns)
        .from(releases)
        .innerJoin(releaseArtists, eq(releaseArtists.releaseId, releases.id))
        .innerJoin(
          artistFollows,
          and(eq(artistFollows.artistId, releaseArtists.artistId), eq(artistFollows.userId, user.id)),
        )
        .where(and(isNotNull(releases.releaseDate), sql`${releases.trackCount} > 0`))
        .orderBy(desc(releases.releaseDate))
        .limit(12);
      if (followed.length) {
        shelves.push({
          id: "followed-releases",
          kind: "releases",
          title: t.followedReleases,
          items: await hydrateReleases(db, followed),
        });
      }

      const own = await db
        .select()
        .from(playlists)
        .where(eq(playlists.ownerId, user.id))
        .orderBy(desc(playlists.updatedAt))
        .limit(12);
      if (own.length)
        shelves.push({
          id: "your-playlists",
          kind: "playlists",
          title: t.yourPlaylists,
          items: await hydratePlaylists(db, own),
        });
    }

    const [trending, newRel, topArtists, topGenres, community, publicPlaylists] = await Promise.all([
      topTracks(deps, { period: "week", limit: 12 }),
      db
        .select(releaseColumns)
        .from(releases)
        .where(
          and(
            isNotNull(releases.releaseDate),
            sql`${releases.trackCount} > 0`,
            sql`${releases.releaseDate} <= current_date`,
          ),
        )
        .orderBy(desc(releases.releaseDate))
        .limit(12),
      db
        .select(artistColumns)
        .from(artists)
        .where(and(isNotNull(artists.imageUrl), sql`${artists.trackCount} >= 5`))
        .orderBy(desc(artists.followerCount), desc(artists.trackCount))
        .limit(12),
      db
        .select({ id: genres.id, name: genres.name, slug: genres.slug, trackCount: genres.trackCount })
        .from(genres)
        .orderBy(desc(genres.trackCount))
        .limit(16),
      selectTracks(db)
        .where(and(publishedTracks, eq(tracks.source, "community")))
        .orderBy(desc(tracks.createdAt))
        .limit(12),
      db
        .select()
        .from(playlists)
        .where(and(eq(playlists.visibility, "public"), sql`${playlists.trackCount} > 0`))
        .orderBy(desc(playlists.followerCount), desc(playlists.updatedAt))
        .limit(12),
    ]);

    shelves.push({
      id: "trending",
      kind: "tracks",
      title: t.trending,
      items: trending.map(({ rank: _r, plays: _p, listeners: _l, previousRank: _pr, isNew: _n, ...x }) => x),
    });
    shelves.push({
      id: "new-releases",
      kind: "releases",
      title: t.newReleases,
      items: await hydrateReleases(db, newRel),
    });
    shelves.push({ id: "artists", kind: "artists", title: t.artists, items: topArtists.map(toArtist) });
    const communityTracks = await hydrateTracks(db, community);
    if (communityTracks.length)
      shelves.push({ id: "community", kind: "tracks", title: t.community, items: communityTracks });
    if (publicPlaylists.length) {
      shelves.push({
        id: "playlists",
        kind: "playlists",
        title: t.playlists,
        items: await hydratePlaylists(db, publicPlaylists),
      });
    }
    shelves.push({ id: "genres", kind: "genres", title: t.genres, items: topGenres });
    return { shelves };
  }),

  implement(endpoints.discover.charts, async ({ deps, query }) => ({
    items: await topTracks(deps, query),
  })),

  implement(endpoints.discover.stats, async ({ deps, query }) =>
    memo(`stats:${JSON.stringify(query)}`, 60_000, () => catalogStats(deps.db, query)),
  ),

  implement(endpoints.discover.timeline, async ({ deps }) =>
    memo("timeline", 5 * 60_000, () => timeline(deps.db)),
  ),

  implement(endpoints.discover.era, async ({ deps, params }) =>
    memo(`era:${params.from}:${params.to}`, 5 * 60_000, () => era(deps.db, params.from, params.to)),
  ),

  implement(endpoints.discover.search, async ({ deps, query }) =>
    search(deps, query.q, query.types, query.limit),
  ),

  implement(endpoints.discover.recommendations, async ({ c, deps, user, query }) => ({
    items: await recommend(deps, user, query.limit, localeOf(c)),
  })),

  implement(endpoints.discover.taste, async ({ deps, user }) => {
    const db = deps.db;
    const res = await db.execute(sql`
      with w as (
        select user_id, artist_id, sum(weight)::float w from (
          select l.user_id, ta.artist_id, 1.0 weight from track_likes l join track_artists ta on ta.track_id = l.track_id
          union all
          select p.user_id, ta.artist_id, 0.3 from plays p join track_artists ta on ta.track_id = p.track_id
            where p.user_id is not null and p.played_at > now() - interval '180 days'
        ) x group by user_id, artist_id
      ),
      me as (select artist_id, w from w where user_id = ${user.id}),
      norms as (select user_id, sqrt(sum(w * w)) n from w group by user_id),
      dots as (select w.user_id, sum(w.w * me.w) dot from w join me using (artist_id) where w.user_id <> ${user.id} group by w.user_id)
      select d.user_id, (d.dot / nullif(n1.n * nm.n, 0))::float sim,
        (select array_agg(artist_id order by least(w.w, me.w) desc) from w join me using (artist_id) where w.user_id = d.user_id) shared
      from dots d join norms n1 on n1.user_id = d.user_id cross join (select n from norms where user_id = ${user.id}) nm
      join users u on u.id = d.user_id and u.deleted_at is null and not u.is_private
      order by sim desc limit 30`);
    const rows = rowsOf<{ user_id: string; sim: number; shared: string[] | null }>(res);
    const otherIds = rows.map((r) => r.user_id);
    const extra = otherIds.length
      ? rowsOf<{ id: string; friend: boolean; shared_likes: number }>(
          await db.execute(sql`
            select u.id,
              exists (select 1 from user_follows a join user_follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id
                where a.follower_id = ${user.id} and a.followee_id = u.id) friend,
              (select count(*)::int from track_likes l1 join track_likes l2 on l2.track_id = l1.track_id
                where l1.user_id = ${user.id} and l2.user_id = u.id) shared_likes
            from users u where u.id in (${sql.join(
              otherIds.map((id) => sql`${id}`),
              sql`, `,
            )})`),
        )
      : [];
    const extraById = new Map(extra.map((e) => [e.id, e]));
    const people = await loadUserRefs(
      db,
      rows.map((r) => r.user_id),
    );
    const sharedIds = [...new Set(rows.flatMap((r) => (r.shared ?? []).slice(0, 3)))];
    const names = sharedIds.length
      ? new Map(
          (
            await db
              .select({ id: artists.id, name: artists.name })
              .from(artists)
              .where(inArray(artists.id, sharedIds))
          ).map((a) => [a.id, a.name]),
        )
      : new Map<string, string>();
    return {
      items: rows.flatMap((r) => {
        const person = people.get(r.user_id);
        if (!person) return [];
        return [
          {
            user: person,
            match: Math.round(Math.min(1, r.sim) * 100),
            friend: extraById.get(r.user_id)?.friend ?? false,
            sharedArtists: (r.shared ?? []).slice(0, 3).map((id) => ({ id, name: names.get(id) ?? "" })),
            sharedFavorites: extraById.get(r.user_id)?.shared_likes ?? 0,
          },
        ];
      }),
      me: await myTaste(db, user.id),
    };
  }),
];
