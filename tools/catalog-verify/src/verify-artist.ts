/**
 * Звірка виконавця. Особа вже підтверджена піснями (Deezer-id і MusicBrainz-id узято зі звірених записів);
 * якщо MusicBrainz посилається на інший Deezer-id — це розбіжність, нічого не пишемо.
 * Заповнюємо лише порожнє: посилання (офіційний сайт, стрімінги, соцмережі, Genius), країну, рік,
 * фото з Deezer, біографію з Вікіпедії (через Вікідані, із зазначенням сторінки-джерела).
 */
import type { ArtistLink, Database, ExternalIds } from "@musicdb/db";
import { sql } from "drizzle-orm";
import { rows } from "./db";
import { linkKind } from "./rules";
import { deezer, isRealDeezerPicture, musicbrainz, wiki } from "./sources";

type ArtistRow = {
  id: string;
  name: string;
  image_url: string | null;
  bio: { uk?: string; en?: string } | null;
  bio_source: { uk?: string; en?: string } | null;
  external_ids: ExternalIds | null;
  links: ArtistLink[] | null;
  country: string | null;
  begin_year: number | null;
  artist_type: string | null;
};

export async function loadArtists(db: Database, opts: { limit: number; recheckDays: number }) {
  return rows<ArtistRow>(
    await db.execute(sql`
      select a.id, a.name, a.image_url, a.bio, a.bio_source, a.external_ids, a.links, a.country, a.begin_year, a.artist_type
      from artists a
      where (a.external_ids ? 'musicbrainz' or a.external_ids ? 'deezer')
        and not exists (select 1 from catalog_checks c where c.entity_type = 'artist' and c.entity_id = a.id
          and c.checked_at > now() - make_interval(days => ${opts.recheckDays}))
      order by a.track_count desc, a.id
      limit ${opts.limit}`),
  );
}

export async function verifyArtist(db: Database, a: ArtistRow, dry: boolean) {
  const ids: ExternalIds = { ...(a.external_ids ?? {}) };
  const applied: Record<string, { from: unknown; to: unknown; sources: string[] }> = {};
  const conflicts: Record<string, Record<string, unknown>> = {};
  const sources: Record<string, unknown> = {};
  const set: Record<string, unknown> = {};

  const mb = ids.musicbrainz ? await musicbrainz.artist(ids.musicbrainz) : null;
  if (mb) {
    const rels = (mb.relations ?? []).filter((r) => r.url?.resource);
    const mbDeezer = rels
      .map((r) => r.url!.resource.match(/deezer\.com\/(?:\w+\/)?artist\/(\d+)/)?.[1])
      .find(Boolean);
    sources.musicbrainz = { id: mb.id, name: mb.name, deezer: mbDeezer ?? null };
    if (mbDeezer && ids.deezer && mbDeezer !== ids.deezer) {
      conflicts.identity = { deezer: ids.deezer, musicbrainzSaysDeezer: mbDeezer };
    } else {
      if (mbDeezer && !ids.deezer) ids.deezer = mbDeezer;
      const wikidata = rels
        .map((r) => r.url!.resource.match(/wikidata\.org\/wiki\/(Q\d+)/)?.[1])
        .find(Boolean);
      if (wikidata) ids.wikidata = wikidata;
      const spotify = rels
        .map((r) => r.url!.resource.match(/open\.spotify\.com\/artist\/(\w+)/)?.[1])
        .find(Boolean);
      if (spotify) ids.spotify = spotify;

      const links: ArtistLink[] = [];
      for (const r of rels) {
        const kind = linkKind(r.type, r.url!.resource);
        if (kind && !links.some((l) => l.kind === kind)) links.push({ kind, url: r.url!.resource });
      }
      if (links.length && !a.links?.length) {
        set.links = links;
        applied.links = { from: null, to: links.map((l) => l.kind), sources: ["musicbrainz"] };
      }
      if (mb.country && !a.country) {
        set.country = mb.country;
        applied.country = { from: null, to: mb.country, sources: ["musicbrainz"] };
      }
      if (mb.type && !a.artist_type) {
        set.artist_type = mb.type;
        applied.type = { from: null, to: mb.type, sources: ["musicbrainz"] };
      }
      const year = Number(mb["life-span"]?.begin?.slice(0, 4));
      if (year > 1000 && !a.begin_year) {
        set.begin_year = year;
        applied.beginYear = { from: null, to: year, sources: ["musicbrainz"] };
      }

      // Біографія з Вікіпедії — лише мови, яких бракує
      if (wikidata && (!a.bio?.uk || !a.bio?.en)) {
        const titles = await wiki.sitelinks(wikidata);
        const bio = { ...(a.bio ?? {}) };
        const bioSource = { ...(a.bio_source ?? {}) };
        for (const lang of ["uk", "en"] as const) {
          const title = titles[lang];
          if (bio[lang] || !title) continue;
          const s = await wiki.summary(lang, title);
          if (s && s.text.length > 40) {
            bio[lang] = s.text;
            bioSource[lang] = s.url;
            applied[`bio.${lang}`] = { from: null, to: s.url, sources: ["wikidata", "wikipedia"] };
          }
        }
        if (applied["bio.uk"] || applied["bio.en"]) {
          set.bio = bio;
          set.bio_source = bioSource;
        }
      }
    }
  }

  // Фото — з Deezer (офіційне фото виконавця), якщо його немає
  if (ids.deezer && !a.image_url && !conflicts.identity) {
    const d = await deezer.artist(ids.deezer);
    sources.deezer = { id: ids.deezer, name: d?.name ?? null };
    if (d?.picture_xl && isRealDeezerPicture(d.picture_xl)) {
      set.image_url = d.picture_xl;
      applied.image = { from: null, to: d.picture_xl, sources: ["deezer"] };
    }
  }

  const status = Object.keys(conflicts).length
    ? "conflict"
    : mb
      ? "verified"
      : ids.deezer
        ? "partial"
        : "unmatched";
  if (!dry) {
    const parts = [sql`external_ids = ${JSON.stringify(ids)}::jsonb`];
    if (set.links) parts.push(sql`links = ${JSON.stringify(set.links)}::jsonb`);
    if (set.country) parts.push(sql`country = ${set.country as string}`);
    if (set.begin_year) parts.push(sql`begin_year = ${set.begin_year as number}`);
    if (set.artist_type) parts.push(sql`artist_type = ${set.artist_type as string}`);
    if (set.bio)
      parts.push(
        sql`bio = ${JSON.stringify(set.bio)}::jsonb, bio_source = ${JSON.stringify(set.bio_source)}::jsonb`,
      );
    if (set.image_url) parts.push(sql`image_url = ${set.image_url as string}`);
    await db.execute(
      sql`update artists set ${sql.join(parts, sql`, `)}, updated_at = now() where id = ${a.id}`,
    );
  }
  return { status, sources, applied, conflicts };
}
