/**
 * Звірка каталогу з офіційними платформами.
 *
 *   pnpm --filter @musicdb/catalog-verify verify [фази…] [--limit=N] [--recheck=ДНІВ] [--concurrency=N] [--dry]
 *
 * Фази (за замовчуванням — усі по черзі):
 *   genres-fix — злиплі й дубльовані за регістром жанри («alternative rock alternative metal», «Alternative Rock»)
 *   backfill   — id треків Deezer зі знімка імпорту (db/jobs/out/import.json), щоб не шукати заново
 *   tracks     — пісні: Deezer → ISRC → MusicBrainz (+ Apple як третій голос)
 *   artists    — виконавці: MusicBrainz (посилання, країна, рік), фото Deezer, біографія з Вікіпедії
 *
 * Можна переривати й запускати знову: звірені позиції пропускаються (поки не мине --recheck днів),
 * відповіді джерел кешуються в .cache/. Звіт — reports/run-<час>.jsonl.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDb, type Database, indexEntities, recomputeCounters } from "@musicdb/db";
import { sql } from "drizzle-orm";
import { applyTrack, countPending, loadTracks, rows, saveCheck } from "./db";
import { stats } from "./http";
import { artistKey, titleKey } from "./rules";
import { loadArtists, verifyArtist } from "./verify-artist";
import { verifyTrack } from "./verify-track";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const dry = args.includes("--dry");
const limit = Number(flag("limit") ?? 1_000_000);
const recheckDays = Number(flag("recheck") ?? 90);
const concurrency = Math.max(1, Number(flag("concurrency") ?? 4));
const onlyIds = flag("ids")?.split(",").filter(Boolean);
/** --recheck-status=conflict,error — перевірити знову позиції з цими статусами. */
const recheckStatus = flag("recheck-status")?.split(",").filter(Boolean);
const phases = args.filter((a) => !a.startsWith("--"));
const run = (p: string) => phases.length === 0 || phases.includes(p);

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/musicdb";
const { db, close } = createDb(url, { max: concurrency + 2 });
const reportDir = join(import.meta.dirname, "..", "reports");
await mkdir(reportDir, { recursive: true });
const reportFile = join(reportDir, `run-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
const report = (entry: unknown) => appendFile(reportFile, `${JSON.stringify(entry)}\n`);
const log = (...m: unknown[]) => console.log(new Date().toLocaleTimeString("uk-UA"), ...m);

// ─── genres-fix ───────────────────────────────────────────────────────────

/** Повна назва жанру з кількох слів, що закінчується «головним» словом («alternative rock», «death metal»). */
const isFullGenre = (s: string) =>
  s.split(" ").length >= 2 &&
  /(rock|metal|pop|punk|hip-hop|hop|core|wave|jazz|blues|house|techno|rap|soul|folk|country)$/.test(s);

async function genresFix(db: Database) {
  // Злиплі при імпорті назви: дві повні назви жанрів поспіль без коми («alternative rock alternative metal»).
  // «pop rock» чи «hardcore hip-hop» не чіпаємо: половинки з одного слова — це один жанр.
  const all = rows<{ id: string; name: string }>(await db.execute(sql`select id, name from genres`));
  let split = 0;
  for (const g of all) {
    const words = g.name.toLowerCase().split(" ");
    for (let i = 2; i <= words.length - 2; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      if (!isFullGenre(a) || !isFullGenre(b)) continue;
      log(`жанр «${g.name}» → «${a}» + «${b}»`);
      if (!dry) {
        for (const name of [a, b]) {
          await db.execute(sql`insert into genres (id, name, slug)
            select substr(md5(random()::text), 1, 16), ${name}, ${name.replace(/[^a-z0-9]+/g, "-")}
            where not exists (select 1 from genres where lower(name) = ${name})`);
          await db.execute(sql`insert into track_genres (track_id, genre_id, position)
            select tg.track_id, (select id from genres where lower(name) = ${name} limit 1), tg.position
            from track_genres tg where tg.genre_id = ${g.id} on conflict do nothing`);
        }
        await db.execute(sql`delete from track_genres where genre_id = ${g.id}`);
        await db.execute(
          sql`delete from search_documents where entity_type = 'genre' and entity_id = ${g.id}`,
        );
        await db.execute(sql`delete from genres where id = ${g.id}`);
      }
      split++;
      break;
    }
  }
  // Дублікати за регістром: лишаємо назву в нижньому регістрі (як створює API).
  const dups = rows<{ lname: string; ids: string[]; names: string[] }>(
    await db.execute(sql`select lower(name) as lname, array_agg(id order by (name = lower(name)) desc, track_count desc) as ids,
      array_agg(name order by (name = lower(name)) desc, track_count desc) as names
      from genres group by lower(name) having count(*) > 1`),
  );
  for (const d of dups) {
    const [keep, ...drop] = d.ids;
    log(`дублікати жанру: ${d.names.join(" / ")} → «${d.lname}»`);
    if (dry) continue;
    for (const id of drop) {
      await db.execute(sql`insert into track_genres (track_id, genre_id, position)
        select track_id, ${keep!}, position from track_genres where genre_id = ${id} on conflict do nothing`);
      await db.execute(sql`delete from track_genres where genre_id = ${id}`);
      await db.execute(sql`delete from search_documents where entity_type = 'genre' and entity_id = ${id}`);
      await db.execute(sql`delete from genres where id = ${id}`);
    }
    await db.execute(sql`update genres set name = ${d.lname} where id = ${keep!}`);
  }
  // Решта назв — у нижній регістр («Alternative Rock» → «alternative rock»), як їх створює API.
  const upper = rows<{ name: string }>(
    await db.execute(sql`select name from genres where name <> lower(name)`),
  ).map((r) => r.name);
  if (upper.length) log(`жанри в нижній регістр: ${upper.join(", ")}`);
  if (!dry && upper.length)
    await db.execute(sql`update genres set name = lower(name) where name <> lower(name)`);
  log(
    `жанри: розділено ${split}, об'єднано дублікатів ${dups.length}, назв у нижній регістр ${upper.length}`,
  );
}

// ─── backfill ─────────────────────────────────────────────────────────────

async function backfill(db: Database) {
  const file = "E:/MusicDB/db/jobs/out/import.json";
  let data: { newSongs?: { artist: string; title: string; album?: string; deezerTrack?: number }[] };
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch {
    log("знімок імпорту не знайдено — пропускаю backfill");
    return;
  }
  const byKey = new Map<string, number[]>();
  for (const s of data.newSongs ?? []) {
    if (!s.deezerTrack) continue;
    const k = `${artistKey(s.artist)}|${titleKey(s.title)}`;
    byKey.set(k, [...(byKey.get(k) ?? []), s.deezerTrack]);
  }
  const tracks = rows<{ id: string; title: string; artist: string }>(
    await db.execute(sql`select t.id, t.title, (select a.name from track_artists ta join artists a on a.id = ta.artist_id
      where ta.track_id = t.id order by ta.position limit 1) as artist
      from tracks t where not (coalesce(t.external_ids, '{}'::jsonb) ? 'deezer')`),
  );
  let n = 0;
  for (const t of tracks) {
    const ids = byKey.get(`${artistKey(t.artist ?? "")}|${titleKey(t.title)}`);
    if (ids?.length !== 1) continue; // неоднозначно — знайде пошук із тривалістю
    if (!dry)
      await db.execute(
        sql`update tracks set external_ids = coalesce(external_ids, '{}'::jsonb) || ${JSON.stringify({
          deezer: String(ids[0]),
        })}::jsonb where id = ${t.id}`,
      );
    n++;
  }
  log(`backfill: id Deezer для ${n} із ${tracks.length} пісень`);
}

// ─── tracks ───────────────────────────────────────────────────────────────

async function tracksPhase(db: Database) {
  const total = onlyIds
    ? onlyIds.length
    : Math.min(limit, await countPending(db, recheckDays, recheckStatus));
  log(`пісні: до звірки ${total}${dry ? " (пробний запуск, без запису)" : ""}`);
  const counts: Record<string, number> = {};
  const appliedCounts: Record<string, number> = {};
  const touchedTracks: string[] = [];
  const touchedArtists = new Set<string>();
  let done = 0;
  let offsetGuard = 0;
  // Кожну пісню — не більше одного разу за запуск (захист від повторної вибірки тих самих рядків).
  const processed = new Set<string>();
  while (done < total) {
    const batch = (
      await loadTracks(db, {
        limit: Math.min(200, total - done),
        recheckDays,
        ...(onlyIds ? { ids: onlyIds } : {}),
        ...(recheckStatus ? { statuses: recheckStatus } : {}),
      })
    ).filter((r) => !processed.has(r.id));
    if (!batch.length) break;
    for (const r of batch) processed.add(r.id);
    let i = 0;
    const worker = async () => {
      while (i < batch.length) {
        const row = batch[i++]!;
        try {
          const res = await verifyTrack(row);
          counts[res.status] = (counts[res.status] ?? 0) + 1;
          for (const f of Object.keys(res.applied)) appliedCounts[f] = (appliedCounts[f] ?? 0) + 1;
          if (!dry) {
            if (res.change) {
              const artists = await applyTrack(db, row.id, res.change);
              for (const a of artists) touchedArtists.add(a);
              if (Object.keys(res.applied).length) touchedTracks.push(row.id);
            }
            await saveCheck(db, "track", row.id, res);
          }
          await report({ type: "track", id: row.id, title: row.title, ...res, change: undefined });
        } catch (err) {
          counts.error = (counts.error ?? 0) + 1;
          await report({ type: "track", id: row.id, error: String(err) });
          if (!dry)
            await saveCheck(db, "track", row.id, {
              status: "error",
              sources: {},
              applied: {},
              conflicts: {},
            });
        }
        done++;
        if (done % 25 === 0 || done === total) {
          log(`пісні ${done}/${total}`, JSON.stringify(counts), "змінено:", JSON.stringify(appliedCounts));
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    if (onlyIds || dry) {
      // у пробному запуску нічого не позначається звіреним — не крутимося по колу
      if (++offsetGuard > 0) break;
    }
  }
  if (!dry && (touchedTracks.length || touchedArtists.size)) {
    log("оновлюю лічильники й пошук…");
    await recomputeCounters(db);
    for (let k = 0; k < touchedTracks.length; k += 500)
      await indexEntities(db, "track", touchedTracks.slice(k, k + 500));
    if (touchedArtists.size) await indexEntities(db, "artist", [...touchedArtists]);
    await db.execute(sql`delete from search_documents where entity_type = 'genre'`);
    await indexEntities(
      db,
      "genre",
      rows<{ id: string }>(await db.execute(sql`select id from genres`)).map((r) => r.id),
    );
  }
  log("пісні готово:", JSON.stringify(counts), "змінено:", JSON.stringify(appliedCounts));
}

// ─── artists ──────────────────────────────────────────────────────────────

async function artistsPhase(db: Database) {
  const list = await loadArtists(db, { limit, recheckDays });
  log(`виконавці: до звірки ${list.length}`);
  const counts: Record<string, number> = {};
  const appliedCounts: Record<string, number> = {};
  let done = 0;
  let i = 0;
  const changed: string[] = [];
  const worker = async () => {
    while (i < list.length) {
      const a = list[i++]!;
      try {
        const res = await verifyArtist(db, a, dry);
        counts[res.status] = (counts[res.status] ?? 0) + 1;
        for (const f of Object.keys(res.applied)) appliedCounts[f] = (appliedCounts[f] ?? 0) + 1;
        if (Object.keys(res.applied).length) changed.push(a.id);
        if (!dry) await saveCheck(db, "artist", a.id, res);
        await report({ type: "artist", id: a.id, name: a.name, ...res });
      } catch (err) {
        counts.error = (counts.error ?? 0) + 1;
        await report({ type: "artist", id: a.id, error: String(err) });
      }
      done++;
      if (done % 25 === 0 || done === list.length)
        log(
          `виконавці ${done}/${list.length}`,
          JSON.stringify(counts),
          "змінено:",
          JSON.stringify(appliedCounts),
        );
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, 2) }, worker));
  if (!dry && changed.length) await indexEntities(db, "artist", changed);
  log("виконавці готово:", JSON.stringify(counts), "змінено:", JSON.stringify(appliedCounts));
}

try {
  if (run("genres-fix")) await genresFix(db);
  if (run("backfill")) await backfill(db);
  if (run("tracks")) await tracksPhase(db);
  if (run("artists")) await artistsPhase(db);
  log("запити до джерел:", JSON.stringify(stats));
  log("звіт:", reportFile);
} finally {
  await close();
}
