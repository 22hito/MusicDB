/**
 * Читання й запис для звірки. Виконавці й жанри знаходяться за нормалізованою назвою (як в API) або
 * створюються; кожна звірка зберігається в catalog_checks (джерела, застосовані зміни, розбіжності).
 */
import { type Database, type ExternalIds, newId, normalizeName, slugify } from "@musicdb/db";
import { type SQL, sql } from "drizzle-orm";

export const rows = <T>(res: unknown): T[] => res as T[];

export type TrackRow = {
  id: string;
  title: string;
  duration_ms: number;
  explicit: boolean;
  release_date: string | null;
  isrc: string | null;
  external_ids: ExternalIds | null;
  release_id: string | null;
  release_title: string | null;
  cover_url: string | null;
  artists: { id: string; name: string }[] | null;
  genres: string[] | null;
};

/** Пісні каталогу, які ще не звіряли (або звіряли давніше за `recheckDays`), спершу популярні. */
export async function loadTracks(
  db: Database,
  opts: { limit: number; recheckDays: number; ids?: string[]; statuses?: string[] },
) {
  const filter: SQL = opts.ids?.length
    ? sql`t.id in (${sql.join(
        opts.ids.map((i) => sql`${i}`),
        sql`, `,
      )})`
    : sql`t.status = 'published' and t.source = 'catalog' and not exists (
        select 1 from catalog_checks c where c.entity_type = 'track' and c.entity_id = t.id
          and c.checked_at > now() - make_interval(days => ${opts.recheckDays})
          ${recheckStatuses(opts.statuses)})`;
  return rows<TrackRow>(
    await db.execute(sql`
      select t.id, t.title, t.duration_ms, t.explicit, t.release_date::text as release_date, t.isrc, t.external_ids,
        r.id as release_id, r.title as release_title, r.cover_url,
        (select json_agg(json_build_object('id', a.id, 'name', a.name) order by ta.position)
          from track_artists ta join artists a on a.id = ta.artist_id where ta.track_id = t.id) as artists,
        (select json_agg(g.name order by tg.position)
          from track_genres tg join genres g on g.id = tg.genre_id where tg.track_id = t.id) as genres
      from tracks t left join releases r on r.id = t.primary_release_id
      where ${filter}
      order by t.play_count desc, t.id
      limit ${opts.limit}`),
  );
}

/** Перевірити знову й ті, що мають ці статуси (наприклад, після виправлення правил). */
/** Час старту цього запуску: повторно перевіряємо лише записи, зроблені ДО нього (інакше — по колу). */
const runStartedAt = new Date().toISOString();

function recheckStatuses(statuses: string[] | undefined): SQL {
  return statuses?.length
    ? sql`and not (c.status in (${sql.join(
        statuses.map((x) => sql`${x}`),
        sql`, `,
      )}) and c.checked_at < ${runStartedAt}::timestamptz)`
    : sql``;
}

export async function countPending(db: Database, recheckDays: number, statuses?: string[]) {
  const [r] = rows<{ n: number }>(
    await db.execute(sql`select count(*)::int as n from tracks t where t.status = 'published' and t.source = 'catalog'
      and not exists (select 1 from catalog_checks c where c.entity_type = 'track' and c.entity_id = t.id
        and c.checked_at > now() - make_interval(days => ${recheckDays}) ${recheckStatuses(statuses)})`),
  );
  return r?.n ?? 0;
}

async function artistId(db: Database, name: string): Promise<string> {
  const normalized = normalizeName(name);
  const [found] = rows<{ id: string }>(
    await db.execute(sql`select id from artists where normalized_name = ${normalized} limit 1`),
  );
  if (found) return found.id;
  const base = slugify(name);
  const taken = new Set(
    rows<{ slug: string }>(
      await db.execute(sql`select slug from artists where slug = ${base} or slug like ${`${base}-%`}`),
    ).map((r) => r.slug),
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  const id = newId();
  await db.execute(
    sql`insert into artists (id, name, normalized_name, slug) values (${id}, ${name.trim()}, ${normalized}, ${slug})`,
  );
  return id;
}

async function genreId(db: Database, raw: string): Promise<string> {
  const name = normalizeName(raw);
  const [found] = rows<{ id: string }>(
    await db.execute(sql`select id from genres where lower(name) = ${name} limit 1`),
  );
  if (found) return found.id;
  let slug = slugify(name);
  const [clash] = rows<{ id: string }>(await db.execute(sql`select id from genres where slug = ${slug}`));
  if (clash) slug = `${slug}-${newId().slice(0, 4).toLowerCase()}`;
  const id = newId();
  await db.execute(sql`insert into genres (id, name, slug) values (${id}, ${name}, ${slug})`);
  return id;
}

export type TrackChange = {
  set: { duration_ms?: number; release_date?: string; explicit?: boolean; isrc?: string };
  externalIds: ExternalIds;
  artists?: string[];
  genres?: string[];
  cover?: { releaseId: string; url: string };
  releaseExternal?: { releaseId: string; ids: ExternalIds };
  artistIds: { name: string; ids: ExternalIds }[];
};

/** Застосовує підтверджені зміни пісні; повертає id виконавців, яких торкнулися (для лічильників/пошуку). */
export async function applyTrack(db: Database, trackId: string, ch: TrackChange): Promise<string[]> {
  const touched: string[] = [];
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const sets: SQL[] = [
      sql`external_ids = coalesce(external_ids, '{}'::jsonb) || ${JSON.stringify(ch.externalIds)}::jsonb`,
    ];
    if (ch.set.duration_ms !== undefined) sets.push(sql`duration_ms = ${ch.set.duration_ms}`);
    if (ch.set.release_date !== undefined) sets.push(sql`release_date = ${ch.set.release_date}`);
    if (ch.set.explicit !== undefined) sets.push(sql`explicit = ${ch.set.explicit}`);
    if (ch.set.isrc !== undefined) sets.push(sql`isrc = ${ch.set.isrc}`);
    await t.execute(
      sql`update tracks set ${sql.join(sets, sql`, `)}, updated_at = now() where id = ${trackId}`,
    );

    if (ch.artists?.length) {
      const old = rows<{ artist_id: string }>(
        await t.execute(sql`select artist_id from track_artists where track_id = ${trackId}`),
      );
      const ids: string[] = [];
      for (const name of ch.artists) {
        const id = await artistId(t, name);
        if (!ids.includes(id)) ids.push(id);
      }
      await t.execute(sql`delete from track_artists where track_id = ${trackId}`);
      for (const [i, id] of ids.entries()) {
        await t.execute(sql`insert into track_artists (track_id, artist_id, position, role)
          values (${trackId}, ${id}, ${i}, ${i === 0 ? "main" : "featured"})`);
      }
      touched.push(...old.map((o) => o.artist_id), ...ids);
    }
    if (ch.genres?.length) {
      for (const [i, g] of ch.genres.entries()) {
        const id = await genreId(t, g);
        await t.execute(sql`insert into track_genres (track_id, genre_id, position) values (${trackId}, ${id}, ${i})
          on conflict do nothing`);
      }
    }
    if (ch.cover) {
      await t.execute(
        sql`update releases set cover_url = ${ch.cover.url} where id = ${ch.cover.releaseId} and cover_url is null`,
      );
    }
    if (ch.releaseExternal) {
      await t.execute(
        sql`update releases set external_ids = coalesce(external_ids, '{}'::jsonb) || ${JSON.stringify(
          ch.releaseExternal.ids,
        )}::jsonb where id = ${ch.releaseExternal.releaseId}`,
      );
    }
    for (const a of ch.artistIds) {
      const [row] = rows<{ id: string; external_ids: ExternalIds | null }>(
        await t.execute(sql`select a.id, a.external_ids from artists a join track_artists ta on ta.artist_id = a.id
          where ta.track_id = ${trackId} and a.normalized_name = ${normalizeName(a.name)} limit 1`),
      );
      if (!row) continue;
      // Не перезаписуємо вже відомий інший id — це розбіжність, її покаже звірка виконавця.
      const merged: ExternalIds = { ...a.ids, ...(row.external_ids ?? {}) };
      await t.execute(
        sql`update artists set external_ids = ${JSON.stringify(merged)}::jsonb where id = ${row.id}`,
      );
      touched.push(row.id);
    }
  });
  return [...new Set(touched)];
}

export async function saveCheck(
  db: Database,
  entityType: "track" | "artist",
  entityId: string,
  check: {
    status: string;
    sources: Record<string, unknown>;
    applied: Record<string, { from: unknown; to: unknown; sources: string[] }>;
    conflicts: Record<string, Record<string, unknown>>;
  },
) {
  await db.execute(sql`
    insert into catalog_checks (entity_type, entity_id, status, sources, applied, conflicts, checked_at)
    values (${entityType}, ${entityId}, ${check.status}, ${JSON.stringify(check.sources)}::jsonb,
      ${JSON.stringify(check.applied)}::jsonb, ${JSON.stringify(check.conflicts)}::jsonb, now())
    on conflict (entity_type, entity_id) do update set status = excluded.status, sources = excluded.sources,
      applied = excluded.applied, conflicts = excluded.conflicts, checked_at = now()`);
}
