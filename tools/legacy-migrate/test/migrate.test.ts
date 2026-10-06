import { createTestDb } from "@musicdb/db/testing";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateLegacy } from "../src/migrate";
import { LEGACY_DDL, LEGACY_FIXTURES } from "./legacy-schema";

let t: Awaited<ReturnType<typeof createTestDb>>;
let report: Record<string, number>;

const one = async <T = Record<string, unknown>>(query: ReturnType<typeof sql>) => {
  const res = (await t.db.execute(query)) as unknown as { rows: T[] };
  return res.rows;
};

beforeAll(async () => {
  t = await createTestDb();
  await t.client.exec(LEGACY_DDL);
  await t.client.exec(LEGACY_FIXTURES);
  // Та сама база, інша схема — як можливий сценарій на Neon.
  report = await migrateLegacy(t.db, t.db);
});
afterAll(() => t.close());

describe("перенесення v1 → v2", () => {
  it("звіт по сутностях", () => {
    expect(report).toMatchObject({
      users: 3,
      artists: 2,
      genres: 2,
      releases: 1,
      tracks: 3,
      audioFiles: 1,
      likes: 2,
      playlists: 1,
      playlistItems: 2,
    });
  });

  it("користувачі: email у нижньому регістрі, адмін за таблицею admins, data:-аватар не переноситься", async () => {
    const rows = await one<{
      email: string;
      role: string;
      name: string;
      image: string | null;
      email_verified: boolean;
    }>(sql`select email, role, name, image, email_verified from users order by legacy_id`);
    expect(rows.map((r) => r.role)).toEqual(["admin", "user", "user"]);
    expect(rows[1]).toMatchObject({
      name: "Оля",
      image: "https://lh3.googleusercontent.com/a/olya=s96-c",
      email_verified: true,
    });
    expect(rows[2]!.image).toBe("https://example.com/max.jpg");
  });

  it("жанри-дублікати злиті, трек має обидва жанри без повторів", async () => {
    const rows = await one<{ name: string }>(
      sql`select g.name from track_genres tg join genres g on g.id = tg.genre_id join tracks t on t.id = tg.track_id where t.legacy_id = 1 order by tg.position`,
    );
    expect(rows.map((r) => r.name)).toEqual(["nu metal", "rock"]);
  });

  it("трек: тривалість, реліз, номер, відео, текст, виконавець альбому", async () => {
    const [numb] = await one<Record<string, unknown>>(
      sql`select t.duration_ms, t.track_number, t.youtube_video_id, t.lyrics, r.title as release, (select a.name from release_artists ra join artists a on a.id = ra.artist_id where ra.release_id = r.id) as release_artist
          from tracks t join releases r on r.id = t.primary_release_id where t.legacy_id = 1`,
    );
    expect(numb).toMatchObject({
      duration_ms: 185_000,
      track_number: 13,
      youtube_video_id: "kXYiU_JCYtU",
      release: "Meteora",
      release_artist: "Linkin Park",
    });
    expect(numb!.lyrics).toContain("tired");
  });

  it("пісня ком'юніті: автор і аудіофайл зі старим ключем, одразу відтворюється", async () => {
    const [row] = await one<Record<string, unknown>>(
      sql`select t.source, u.email, a.storage_key, a.stream_key, a.status, a.mime_type from tracks t
          join users u on u.id = t.uploader_id join assets a on a.id = t.audio_asset_id where t.legacy_id = 3`,
    );
    expect(row).toMatchObject({
      source: "community",
      email: "olya@example.com",
      storage_key: "b1c2.mp3",
      stream_key: "b1c2.mp3",
      status: "ready",
      mime_type: "audio/mpeg",
    });
  });

  it("фото виконавця зі сховища v1 — через /v1/media, зовнішнє — як є; біографія двома мовами", async () => {
    const rows = await one<{ image_url: string; bio: { uk?: string; en?: string } | null }>(
      sql`select image_url, bio from artists order by legacy_id`,
    );
    expect(rows[0]!.image_url).toMatch(/^\/v1\/media\/[A-Za-z0-9]{16}$/);
    expect(rows[0]!.bio).toEqual({ uk: "Американський гурт", en: "American band" });
    expect(rows[1]!.image_url).toContain("dzcdn.net");
  });

  it("плейлист: порядок за часом додавання, публічність, лічильники", async () => {
    const items = await one<{ title: string }>(
      sql`select t.title from playlist_items i join tracks t on t.id = i.track_id order by i.position`,
    );
    expect(items.map((i) => i.title)).toEqual(["Numb", "Faint"]);
    const [p] = await one<Record<string, unknown>>(sql`select visibility, track_count from playlists`);
    expect(p).toMatchObject({ visibility: "public", track_count: 2 });
  });

  it("прослуховування й лічильник; оцінки з середнім", async () => {
    const [numb] = await one<Record<string, unknown>>(
      sql`select play_count, rating_count, rating_sum, like_count from tracks where legacy_id = 1`,
    );
    expect(numb).toMatchObject({ play_count: 2, rating_count: 2, rating_sum: 165, like_count: 1 });
  });

  it("дружба → взаємна підписка, запит → одностороння", async () => {
    const rows = await one<{ f: number; t: number }>(
      sql`select uf.legacy_id as f, ut.legacy_id as t from user_follows x join users uf on uf.id = x.follower_id join users ut on ut.id = x.followee_id order by 1, 2`,
    );
    expect(rows).toEqual([
      { f: 1, t: 2 },
      { f: 2, t: 3 },
      { f: 3, t: 2 },
    ]);
  });

  it("повідомлення: розмова на пару, трек і вкладення, запит від не-друга, «видалено в себе»", async () => {
    const convs = await one<{ n: number }>(sql`select count(*)::int as n from conversations`);
    expect(convs[0]!.n).toBe(2);
    const msgs = await one<Record<string, unknown>>(
      sql`select body, track_id is not null as has_track, attachment from messages order by created_at, legacy_id`,
    );
    expect(msgs.some((m) => m.has_track)).toBe(true);
    expect(msgs.find((m) => m.attachment)?.attachment).toMatchObject({
      key: "aa11.pdf",
      name: "Ноти.pdf",
      size: 1234,
      mime: "application/pdf",
    });
    const states = await one<{ legacy_id: number; state: string; cleared: boolean }>(sql`
      select u.legacy_id, m.state, m.cleared_at is not null as cleared from conversation_members m join users u on u.id = m.user_id
      join conversations c on c.id = m.conversation_id order by c.dm_key, u.legacy_id`);
    // Адмін (1) написав Максиму (3) без дружби — у Максима це запит.
    expect(states).toContainEqual({ legacy_id: 3, state: "request", cleared: false });
    expect(states).toContainEqual({ legacy_id: 3, state: "active", cleared: true });
  });

  it("обговорення: відповідь на допис, учасники, кількість дописів", async () => {
    const [th] = await one<Record<string, unknown>>(
      sql`select post_count, (select count(*)::int from thread_subscriptions) as subs from threads`,
    );
    expect(th).toMatchObject({ post_count: 2, subs: 2 });
    const [reply] = await one<Record<string, unknown>>(
      sql`select p.body, r.body as parent from posts p join posts r on r.id = p.reply_to_id`,
    );
    expect(reply).toMatchObject({ body: "Згодна", parent: "Так!" });
  });

  it("заявки, правки й баг-репорти", async () => {
    const subs = await one<Record<string, unknown>>(
      sql`select kind, status, target_label, payload from submissions order by kind`,
    );
    expect(subs.map((s) => s.kind).sort()).toEqual(["community_track", "correction"]);
    const community = subs.find((s) => s.kind === "community_track")!;
    expect(community.payload).toMatchObject({
      artists: ["Нова Група", "Гість"],
      releaseTitle: "Демо",
      durationMs: 210_000,
      genres: ["indie", "rock"],
    });
    const [bug] = await one<Record<string, unknown>>(sql`select context, screenshots from bug_reports`);
    expect(bug).toMatchObject({ context: { ua: "x" }, screenshots: ["s1.png"] });
  });

  it("пошуковий індекс побудовано", async () => {
    const rows = await one<{ n: number }>(
      sql`select count(*)::int as n from search_documents where entity_type = 'track'`,
    );
    expect(rows[0]!.n).toBe(3);
  });
});
