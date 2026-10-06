/**
 * Пошуковий індекс search_documents і денормалізовані лічильники — прямо в SQL, одним проходом.
 * Вага полів: назва (A) важливіша за підзаголовок (B). Популярність — логарифм прослуховувань/підписників.
 */
import { type SQL, sql } from "drizzle-orm";
import type { DbOrTx } from "./client";

const norm = (expr: SQL) => sql`lower(immutable_unaccent(${expr}))`;
const doc = (title: SQL, subtitle: SQL) =>
  sql`setweight(to_tsvector('simple', ${norm(title)}), 'A') || setweight(to_tsvector('simple', ${norm(subtitle)}), 'B')`;

export type SearchEntity = "track" | "artist" | "release" | "playlist" | "user" | "genre";

const trackArtistNames = sql`coalesce((select string_agg(a.name, ', ' order by ta.position) from track_artists ta join artists a on a.id = ta.artist_id where ta.track_id = t.id), '')`;
const releaseArtistNames = sql`coalesce((select string_agg(a.name, ', ' order by ra.position) from release_artists ra join artists a on a.id = ra.artist_id where ra.release_id = r.id), '')`;

const onConflict = sql`on conflict (entity_type, entity_id) do update set title = excluded.title, subtitle = excluded.subtitle,
  image_url = excluded.image_url, normalized = excluded.normalized, document = excluded.document, popularity = excluded.popularity`;

const columns = sql`insert into search_documents (entity_type, entity_id, title, subtitle, image_url, normalized, document, popularity)`;

function idFilter(column: SQL, ids?: string[]) {
  if (!ids) return sql``;
  return sql`and ${column} in (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}

function upsertSql(entity: SearchEntity, ids?: string[]): SQL {
  switch (entity) {
    case "track":
      return sql`${columns}
        select 'track', t.id, t.title, ${trackArtistNames}, r.cover_url,
          ${norm(sql`t.title || ' ' || ${trackArtistNames}`)},
          ${doc(sql`t.title`, trackArtistNames)},
          least(1, ln(1 + t.play_count) / 12)
        from tracks t left join releases r on r.id = t.primary_release_id
        where t.status = 'published' ${idFilter(sql`t.id`, ids)}
        ${onConflict}`;
    case "artist":
      return sql`${columns}
        select 'artist', a.id, a.name, null, a.image_url, ${norm(sql`a.name`)}, ${doc(sql`a.name`, sql`''`)},
          least(1, ln(1 + a.follower_count * 5 + a.track_count) / 10)
        from artists a where true ${idFilter(sql`a.id`, ids)}
        ${onConflict}`;
    case "release":
      return sql`${columns}
        select 'release', r.id, r.title, ${releaseArtistNames}, r.cover_url,
          ${norm(sql`r.title || ' ' || ${releaseArtistNames}`)}, ${doc(sql`r.title`, releaseArtistNames)},
          least(1, ln(1 + r.track_count) / 8)
        from releases r where true ${idFilter(sql`r.id`, ids)}
        ${onConflict}`;
    case "playlist":
      return sql`${columns}
        select 'playlist', p.id, p.title, u.name, p.cover_url, ${norm(sql`p.title`)},
          ${doc(sql`p.title`, sql`coalesce(p.description, '')`)},
          least(1, ln(1 + p.follower_count * 3 + p.track_count) / 10)
        from playlists p join users u on u.id = p.owner_id
        where p.visibility = 'public' ${idFilter(sql`p.id`, ids)}
        ${onConflict}`;
    case "user":
      return sql`${columns}
        select 'user', u.id, u.name, u.username, u.image, ${norm(sql`u.name || ' ' || coalesce(u.username, '')`)},
          ${doc(sql`u.name`, sql`coalesce(u.username, '')`)}, least(1, ln(1 + u.follower_count) / 8)
        from users u where u.deleted_at is null and coalesce(u.banned, false) = false ${idFilter(sql`u.id`, ids)}
        ${onConflict}`;
    case "genre":
      return sql`${columns}
        select 'genre', g.id, g.name, null, null, ${norm(sql`g.name`)}, ${doc(sql`g.name`, sql`''`)},
          least(1, ln(1 + g.track_count) / 9)
        from genres g where true ${idFilter(sql`g.id`, ids)}
        ${onConflict}`;
  }
}

export async function indexEntities(db: DbOrTx, entity: SearchEntity, ids: string[]) {
  if (ids.length === 0) return;
  await db.execute(upsertSql(entity, ids));
}

export async function removeFromIndex(db: DbOrTx, entity: SearchEntity, ids: string[]) {
  if (ids.length === 0) return;
  await db.execute(
    sql`delete from search_documents where entity_type = ${entity} ${idFilter(sql`entity_id`, ids)}`,
  );
}

export async function rebuildSearchIndex(db: DbOrTx) {
  await db.execute(sql`truncate search_documents`);
  for (const entity of ["artist", "release", "track", "genre", "playlist", "user"] as const) {
    await db.execute(upsertSql(entity));
  }
}

/** Перераховує денормалізовані лічильники (кількість треків, тривалість, вподобання…). */
export async function recomputeCounters(db: DbOrTx) {
  await db.execute(sql`update artists a set track_count = c.n
    from (select a2.id, count(distinct t.id) n from artists a2
      left join track_artists ta on ta.artist_id = a2.id
      left join tracks t on t.id = ta.track_id and t.status = 'published' group by a2.id) c where c.id = a.id`);
  await db.execute(sql`update releases r set track_count = c.n, duration_ms = c.d
    from (select r2.id, count(t.id) n, coalesce(sum(t.duration_ms), 0) d from releases r2
      left join release_tracks rt on rt.release_id = r2.id
      left join tracks t on t.id = rt.track_id and t.status = 'published' group by r2.id) c where c.id = r.id`);
  await db.execute(sql`update genres g set track_count = c.n
    from (select g2.id, count(tg.track_id) n from genres g2 left join track_genres tg on tg.genre_id = g2.id group by g2.id) c
    where c.id = g.id`);
  await db.execute(sql`update artists a set follower_count = c.n
    from (select a2.id, count(f.user_id) n from artists a2 left join artist_follows f on f.artist_id = a2.id group by a2.id) c
    where c.id = a.id`);
  await db.execute(sql`update tracks t set like_count = c.n
    from (select t2.id, count(l.user_id) n from tracks t2 left join track_likes l on l.track_id = t2.id group by t2.id) c
    where c.id = t.id`);
  await db.execute(sql`update tracks t set rating_count = c.n, rating_sum = c.s
    from (select t2.id, count(r.user_id) n, coalesce(sum(r.score), 0) s from tracks t2
      left join track_ratings r on r.track_id = t2.id group by t2.id) c where c.id = t.id`);
  await db.execute(sql`update playlists p set track_count = c.n, duration_ms = c.d
    from (select p2.id, count(i.id) n, coalesce(sum(t.duration_ms), 0) d from playlists p2
      left join playlist_items i on i.playlist_id = p2.id
      left join tracks t on t.id = i.track_id group by p2.id) c where c.id = p.id`);
  await db.execute(sql`update users u set
      follower_count = (select count(*) from user_follows f where f.followee_id = u.id),
      following_count = (select count(*) from user_follows f where f.follower_id = u.id)`);
}
