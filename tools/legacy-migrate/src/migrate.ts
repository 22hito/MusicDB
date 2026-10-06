/**
 * Перенесення даних з v1 (схема `lab`, ASP.NET + EF Core) у v2.
 *
 * Читає старі таблиці через `legacy`, пише в нову схему через `target` (може бути та сама база — інша схема).
 * Розрахована на порожню нову базу; кожна сутність отримує `legacy_id`, щоб старі посилання
 * (/song/123, /artist/5) можна було перенаправити. Порядок — за зовнішніми ключами.
 *
 * Файли у сховищі не копіюються: v1 і v2 використовують той самий бакет, старі ключі — імена в корені бакета.
 */
import {
  artistFollows,
  artists,
  assets,
  bugReports,
  conversationMembers,
  conversations,
  type Database,
  genres,
  jobs,
  messages,
  newId,
  normalizeName,
  parseDurationMs,
  playlistItems,
  playlists,
  plays,
  posts,
  rebuildSearchIndex,
  recomputeCounters,
  releaseArtists,
  releases,
  releaseTracks,
  submissions,
  threadSubscriptions,
  threads,
  trackArtists,
  trackGenres,
  trackLikes,
  trackRatings,
  tracks,
  uniqueSlug,
  userFollows,
  users,
} from "@musicdb/db";
import { type SQL, sql } from "drizzle-orm";
import { generateNKeysBetween } from "fractional-indexing";

export type MigrateOptions = {
  /** Схема старих таблиць. */
  schema?: string;
  log?: (message: string) => void;
  /** Поставити в чергу перерахунок гучності/хвилі для перенесених аудіофайлів. */
  reprocessAudio?: boolean;
};

export type MigrateReport = Record<string, number>;

type Row = Record<string, unknown>;

const audioMime: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  webm: "audio/webm",
};
const anyMime: Record<string, string> = {
  ...audioMime,
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  zip: "application/zip",
};
const ext = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  return ((result as { rows?: Row[] }).rows ?? []) as Row[];
}

const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));
const date = (v: unknown) => (v == null ? null : v instanceof Date ? v : new Date(String(v)));

async function insertChunks(db: Database, table: Parameters<Database["insert"]>[0], rows: Row[], size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size) as Parameters<ReturnType<Database["insert"]>["values"]>[0];
    await db.insert(table).values(chunk).onConflictDoNothing();
  }
}

export async function migrateLegacy(
  legacy: Database,
  target: Database,
  opts: MigrateOptions = {},
): Promise<MigrateReport> {
  const s = opts.schema ?? "lab";
  const log = opts.log ?? (() => {});
  const report: MigrateReport = {};
  const T = (name: string) => sql.raw(`"${s}"."${name}"`);
  const q = async (query: SQL) => rowsOf(await legacy.execute(query));
  /** Час з timestamp without time zone, де v1 зберігала UTC. */
  const utc = (col: string) => sql.raw(`(${col} at time zone 'UTC')`);
  const has = async (table: string) =>
    (
      await q(
        sql`select 1 from information_schema.tables where table_schema = ${s} and table_name = ${table}`,
      )
    ).length > 0;

  // ─── Жанри ──────────────────────────────────────────────────────────────
  const genreIds = new Map<number, string>();
  {
    const rows = await q(sql`select id, genre from ${T("genre")} order by id`);
    const byName = new Map<string, string>();
    const slugs = new Set<string>();
    const insert: Row[] = [];
    for (const r of rows) {
      const name = normalizeName(String(r.genre));
      if (!name) continue;
      let id = byName.get(name);
      if (!id) {
        id = newId();
        byName.set(name, id);
        insert.push({ id, name, slug: uniqueSlug(name, slugs), legacyId: num(r.id) });
      }
      genreIds.set(Number(r.id), id);
    }
    await insertChunks(target, genres, insert);
    report.genres = insert.length;
    log(`жанри: ${insert.length}`);
  }

  // ─── Виконавці ──────────────────────────────────────────────────────────
  const artistIds = new Map<number, string>();
  {
    const rows = await q(
      sql`select id, name, normalized_name, bio, bio_en, image_url, ${utc("created_at")} as created_at from ${T("artists")} order by id`,
    );
    const slugs = new Set<string>();
    const artistRows: Row[] = [];
    const imageAssets: Row[] = [];
    for (const r of rows) {
      const id = newId();
      artistIds.set(Number(r.id), id);
      const image = str(r.image_url);
      let imageUrl: string | null = null;
      if (image?.startsWith("http")) imageUrl = image;
      else if (image) {
        // Фото у сховищі v1 — ім'я файлу в корені бакета; у v2 — публічна картинка через /v1/media/{assetId}.
        const assetId = newId();
        imageAssets.push({
          id: assetId,
          kind: "image",
          status: "uploaded",
          storageKey: image,
          originalName: image,
          mimeType: anyMime[ext(image)] ?? "image/jpeg",
        });
        imageUrl = `/v1/media/${assetId}`;
      }
      const bio = { ...(r.bio ? { uk: String(r.bio) } : {}), ...(r.bio_en ? { en: String(r.bio_en) } : {}) };
      artistRows.push({
        id,
        name: String(r.name),
        slug: uniqueSlug(String(r.name), slugs),
        normalizedName: normalizeName(String(r.normalized_name ?? r.name)),
        bio: Object.keys(bio).length ? bio : null,
        imageUrl,
        legacyId: Number(r.id),
        createdAt: date(r.created_at) ?? new Date(),
      });
    }
    await insertChunks(target, assets, imageAssets);
    await insertChunks(target, artists, artistRows);
    report.artists = artistRows.length;
    log(`виконавці: ${artistRows.length}`);
  }

  // ─── Користувачі ────────────────────────────────────────────────────────
  const userIds = new Map<number, string>();
  const userByEmail = new Map<string, string>();
  {
    const admins = new Set(
      (await q(sql`select lower(email) as email from ${T("admins")}`)).map((r) => String(r.email)),
    );
    const profiles = new Map(
      (
        await q(sql`select lower(user_email) as email, display_name, avatar_url from ${T("user_profiles")}`)
      ).map((r) => [String(r.email), r]),
    );
    const rows = await q(
      sql`select id, email, google_name, google_picture, ${utc("created_at")} as created_at from ${T("users")} order by id`,
    );
    const insert: Row[] = [];
    for (const r of rows) {
      const email = String(r.email).toLowerCase();
      const id = newId();
      userIds.set(Number(r.id), id);
      userByEmail.set(email, id);
      const p = profiles.get(email);
      const avatar = str(p?.avatar_url);
      insert.push({
        id,
        email,
        // Вхід через Google вже підтвердив email — без цього перший вхід у v2 не зв'яже акаунт.
        emailVerified: true,
        name: str(p?.display_name) || str(r.google_name) || email.split("@")[0],
        // data:-URI з v1 не переносимо (великі рядки в БД); лишається фото Google, людина може завантажити нове.
        image: avatar && !avatar.startsWith("data:") ? avatar : str(r.google_picture),
        role: admins.has(email) ? "admin" : "user",
        legacyId: Number(r.id),
        createdAt: date(r.created_at) ?? new Date(),
      });
    }
    await insertChunks(target, users, insert);
    report.users = insert.length;
    log(`користувачі: ${insert.length}`);
  }
  const byEmail = (e: unknown) => (e ? userByEmail.get(String(e).toLowerCase()) : undefined);
  const byUser = (id: unknown) => (id == null ? undefined : userIds.get(Number(id)));

  // ─── Альбоми й треки ────────────────────────────────────────────────────
  const releaseIds = new Map<number, string>();
  const trackIds = new Map<number, string>();
  {
    const albums = await q(
      sql`select id, name, release::text as release, cover_url from ${T("album")} order by id`,
    );
    const releaseRows: Row[] = albums.map((a) => {
      const id = newId();
      releaseIds.set(Number(a.id), id);
      return {
        id,
        title: String(a.name),
        type: "album",
        releaseDate: str(a.release),
        coverUrl: str(a.cover_url),
        legacyId: Number(a.id),
      };
    });
    await insertChunks(target, releases, releaseRows);
    report.releases = releaseRows.length;

    const songs = await q(sql`
      select id, title, release::text as release, duration::text as duration, album_ids, track_number, youtube_video_id,
        lyrics, source, submitted_by_user_id, audio_file
      from ${T("music")} order by id`);
    const trackRows: Row[] = [];
    const audioAssets: Row[] = [];
    const releaseTrackRows: Row[] = [];
    for (const m of songs) {
      const id = newId();
      trackIds.set(Number(m.id), id);
      const albumIds = ((m.album_ids as number[] | null) ?? []).map(Number).filter((a) => releaseIds.has(a));
      const file = str(m.audio_file);
      let audioAssetId: string | null = null;
      if (file) {
        audioAssetId = newId();
        const mime = audioMime[ext(file)] ?? "audio/mpeg";
        // Оригінал одразу грає як є; перерахунок гучності й хвилі — фоновою задачею.
        audioAssets.push({
          id: audioAssetId,
          kind: "audio",
          ownerId: byUser(m.submitted_by_user_id) ?? null,
          status: "ready",
          storageKey: file,
          originalName: file,
          mimeType: mime,
          streamKey: file,
          streamFormat: ext(file) || "mp3",
        });
      }
      trackRows.push({
        id,
        title: String(m.title),
        durationMs: parseDurationMs(str(m.duration)),
        releaseDate: str(m.release),
        primaryReleaseId: albumIds.length ? releaseIds.get(albumIds[0]!) : null,
        trackNumber: num(m.track_number),
        source: m.source === "community" ? "community" : "catalog",
        uploaderId: byUser(m.submitted_by_user_id) ?? null,
        youtubeVideoId: str(m.youtube_video_id),
        audioAssetId,
        lyrics: str(m.lyrics),
        legacyId: Number(m.id),
      });
      for (const a of albumIds) {
        releaseTrackRows.push({
          releaseId: releaseIds.get(a),
          trackId: id,
          position: num(m.track_number) ?? 0,
        });
      }
    }
    await insertChunks(target, assets, audioAssets);
    await insertChunks(target, tracks, trackRows);
    await insertChunks(target, releaseTracks, releaseTrackRows);
    report.tracks = trackRows.length;
    report.audioFiles = audioAssets.length;
    if (opts.reprocessAudio && audioAssets.length) {
      await insertChunks(
        target,
        jobs,
        audioAssets.map((a) => ({ queue: "audio.process", payload: { assetId: a.id, reprocess: true } })),
      );
    }
    log(`треки: ${trackRows.length} (з файлом ${audioAssets.length}), релізи: ${releaseRows.length}`);

    const credits = await q(sql`select music_id, artist_id, position from ${T("music_artists")}`);
    const creditRows = credits.flatMap((c) => {
      const trackId = trackIds.get(Number(c.music_id));
      const artistId = artistIds.get(Number(c.artist_id));
      if (!trackId || !artistId) return [];
      const position = Number(c.position ?? 0);
      return [{ trackId, artistId, position, role: position === 0 ? "main" : "featured" }];
    });
    await insertChunks(target, trackArtists, creditRows);

    const tg = await q(sql`select music_id, genre_id from ${T("music_genre")}`);
    const perTrack = new Map<string, number>();
    const genreRows = tg.flatMap((g) => {
      const trackId = trackIds.get(Number(g.music_id));
      const genreId = genreIds.get(Number(g.genre_id));
      if (!trackId || !genreId) return [];
      const position = perTrack.get(trackId) ?? 0;
      perTrack.set(trackId, position + 1);
      return [{ trackId, genreId, position }];
    });
    await insertChunks(target, trackGenres, genreRows);

    // Виконавець альбому — найчастіший головний виконавець його треків.
    const mainByTrack = new Map(
      creditRows.filter((c) => c.position === 0).map((c) => [c.trackId, c.artistId]),
    );
    const votes = new Map<string, Map<string, number>>();
    for (const rt of releaseTrackRows) {
      const artistId = mainByTrack.get(String(rt.trackId));
      if (!artistId) continue;
      const v = votes.get(String(rt.releaseId)) ?? new Map<string, number>();
      v.set(artistId, (v.get(artistId) ?? 0) + 1);
      votes.set(String(rt.releaseId), v);
    }
    const releaseArtistRows = [...votes].map(([releaseId, v]) => ({
      releaseId,
      artistId: [...v].sort((a, b) => b[1] - a[1])[0]![0],
      position: 0,
    }));
    await insertChunks(target, releaseArtists, releaseArtistRows);
  }

  // ─── Бібліотека ─────────────────────────────────────────────────────────
  {
    const favs = await q(
      sql`select user_email, music_id, ${utc("added_at")} as added_at from ${T("favorites")}`,
    );
    const likeRows = favs.flatMap((f) => {
      const userId = byEmail(f.user_email);
      const trackId = trackIds.get(Number(f.music_id));
      return userId && trackId ? [{ userId, trackId, createdAt: date(f.added_at) ?? new Date() }] : [];
    });
    await insertChunks(target, trackLikes, likeRows);
    report.likes = likeRows.length;

    const pls = await q(
      sql`select id, user_email, name, is_public, ${utc("created_at")} as created_at from ${T("playlists")} order by id`,
    );
    const playlistIds = new Map<number, string>();
    const playlistRows = pls.flatMap((p) => {
      const ownerId = byEmail(p.user_email);
      if (!ownerId) return [];
      const id = newId();
      playlistIds.set(Number(p.id), id);
      const created = date(p.created_at) ?? new Date();
      return [
        {
          id,
          ownerId,
          title: String(p.name),
          visibility: p.is_public ? "public" : "private",
          legacyId: Number(p.id),
          createdAt: created,
          updatedAt: created,
        },
      ];
    });
    await insertChunks(target, playlists, playlistRows);
    const items = await q(
      sql`select playlist_id, music_id, ${utc("added_at")} as added_at from ${T("playlist_songs")} order by playlist_id, added_at`,
    );
    const byPlaylist = new Map<string, Row[]>();
    for (const it of items) {
      const playlistId = playlistIds.get(Number(it.playlist_id));
      const trackId = trackIds.get(Number(it.music_id));
      if (!playlistId || !trackId) continue;
      const list = byPlaylist.get(playlistId) ?? [];
      list.push({ playlistId, trackId, addedAt: date(it.added_at) ?? new Date() });
      byPlaylist.set(playlistId, list);
    }
    const itemRows: Row[] = [];
    for (const [playlistId, list] of byPlaylist) {
      const owner = playlistRows.find((p) => p.id === playlistId)?.ownerId;
      const keys = generateNKeysBetween(null, null, list.length);
      for (const [i, it] of list.entries())
        itemRows.push({ ...it, id: newId(), position: keys[i], addedBy: owner });
    }
    await insertChunks(target, playlistItems, itemRows);
    report.playlists = playlistRows.length;
    report.playlistItems = itemRows.length;

    const history = await q(
      sql`select user_email, music_id, ${utc("listened_at")} as listened_at from ${T("listening_history")}`,
    );
    const durations = new Map(
      rowsOf(await target.execute(sql`select id, duration_ms from tracks`)).map((r) => [
        String(r.id),
        Number(r.duration_ms),
      ]),
    );
    const playRows = history.flatMap((h) => {
      const userId = byEmail(h.user_email);
      const trackId = trackIds.get(Number(h.music_id));
      return userId && trackId
        ? [
            {
              userId,
              trackId,
              msPlayed: durations.get(trackId) ?? 0,
              platform: "web",
              playedAt: date(h.listened_at) ?? new Date(),
            },
          ]
        : [];
    });
    await insertChunks(target, plays, playRows, 1000);
    report.plays = playRows.length;

    const af = await q(
      sql`select user_id, artist_id, ${utc("followed_at")} as followed_at from ${T("artist_follows")}`,
    );
    const followRows = af.flatMap((f) => {
      const userId = byUser(f.user_id);
      const artistId = artistIds.get(Number(f.artist_id));
      return userId && artistId ? [{ userId, artistId, createdAt: date(f.followed_at) ?? new Date() }] : [];
    });
    await insertChunks(target, artistFollows, followRows);
    report.artistFollows = followRows.length;

    // Дружба v1 → взаємна підписка; запит, що чекає, → підписка того, хто запросив.
    const fr = await q(
      sql`select requester_id, addressee_id, status, ${utc("created_at")} as created_at from ${T("friend_requests")}`,
    );
    const userFollowRows: Row[] = [];
    for (const f of fr) {
      const a = byUser(f.requester_id);
      const b = byUser(f.addressee_id);
      if (!a || !b || a === b) continue;
      const createdAt = date(f.created_at) ?? new Date();
      if (f.status === "accepted")
        userFollowRows.push(
          { followerId: a, followeeId: b, createdAt },
          { followerId: b, followeeId: a, createdAt },
        );
      else if (f.status === "pending") userFollowRows.push({ followerId: a, followeeId: b, createdAt });
    }
    await insertChunks(target, userFollows, userFollowRows);
    report.userFollows = userFollowRows.length;

    const ratings = await q(
      sql`select user_id, music_id, score, review, ${utc("created_at")} as created_at, ${utc("updated_at")} as updated_at from ${T("song_ratings")}`,
    );
    const ratingRows = ratings.flatMap((r) => {
      const userId = byUser(r.user_id);
      const trackId = trackIds.get(Number(r.music_id));
      return userId && trackId
        ? [
            {
              userId,
              trackId,
              score: Math.max(0, Math.min(100, Number(r.score))),
              review: str(r.review),
              createdAt: date(r.created_at) ?? new Date(),
              updatedAt: date(r.updated_at) ?? new Date(),
            },
          ]
        : [];
    });
    await insertChunks(target, trackRatings, ratingRows);
    report.ratings = ratingRows.length;
  }

  // ─── Особисті повідомлення ──────────────────────────────────────────────
  {
    const dms = await q(sql`
      select id, sender_id, recipient_id, body, ${utc("created_at")} as created_at, ${utc("read_at")} as read_at,
        attachment_file, attachment_name, attachment_size, music_id
      from ${T("direct_messages")} order by id`);
    const accepted = new Set(
      (
        await q(sql`select requester_id, addressee_id from ${T("dm_requests")} where status = 'accepted'`)
      ).map((r) => [Number(r.requester_id), Number(r.addressee_id)].sort().join(":")),
    );
    const friends = new Set(
      (
        await q(sql`select requester_id, addressee_id from ${T("friend_requests")} where status = 'accepted'`)
      ).map((r) => [Number(r.requester_id), Number(r.addressee_id)].sort().join(":")),
    );
    const cleared = (await has("dm_cleared"))
      ? await q(sql`select user_id, other_user_id, cleared_up_to_id from ${T("dm_cleared")}`)
      : [];

    type Conv = { id: string; legacyPair: [number, number]; last: Date; lastRead: Map<number, Date> };
    const convs = new Map<string, Conv>();
    const messageRows: Row[] = [];
    const messageTime = new Map<number, Date>();
    for (const m of dms) {
      const a = Number(m.sender_id);
      const b = Number(m.recipient_id);
      const sender = byUser(a);
      if (!sender || !byUser(b)) continue;
      const pair = [a, b].sort((x, y) => x - y) as [number, number];
      const key = pair.join(":");
      const createdAt = date(m.created_at) ?? new Date();
      messageTime.set(Number(m.id), createdAt);
      let conv = convs.get(key);
      if (!conv) {
        conv = { id: newId(), legacyPair: pair, last: createdAt, lastRead: new Map() };
        convs.set(key, conv);
      }
      if (createdAt > conv.last) conv.last = createdAt;
      const readAt = date(m.read_at);
      if (readAt) {
        const prev = conv.lastRead.get(b);
        if (!prev || readAt > prev) conv.lastRead.set(b, readAt);
      }
      const file = str(m.attachment_file);
      messageRows.push({
        id: newId(),
        conversationId: conv.id,
        senderId: sender,
        body: String(m.body ?? ""),
        attachment: file
          ? {
              key: file,
              name: str(m.attachment_name) ?? file,
              size: Number(m.attachment_size ?? 0),
              mime: anyMime[ext(str(m.attachment_name) ?? file)] ?? "application/octet-stream",
            }
          : null,
        trackId: m.music_id != null ? (trackIds.get(Number(m.music_id)) ?? null) : null,
        createdAt,
        legacyId: Number(m.id),
      });
    }
    const convRows: Row[] = [];
    const memberRows: Row[] = [];
    for (const [key, conv] of convs) {
      const [lo, hi] = conv.legacyPair;
      const loId = byUser(lo)!;
      const hiId = byUser(hi)!;
      convRows.push({ id: conv.id, dmKey: [loId, hiId].sort().join(":"), lastMessageAt: conv.last });
      const open = friends.has(key) || accepted.has(key);
      // Хто почав листування без дружби й без прийнятого запиту — у того співрозмовника розмова як «запит».
      const first = messageRows.find((r) => r.conversationId === conv.id);
      const starter = first?.senderId;
      for (const [legacyId, id] of [
        [lo, loId],
        [hi, hiId],
      ] as const) {
        const clear = cleared.find(
          (c) => Number(c.user_id) === legacyId && [lo, hi].includes(Number(c.other_user_id)),
        );
        memberRows.push({
          conversationId: conv.id,
          userId: id,
          state: open || id === starter ? "active" : "request",
          lastReadAt: conv.lastRead.get(legacyId) ?? null,
          clearedAt: clear ? (messageTime.get(Number(clear.cleared_up_to_id)) ?? null) : null,
        });
      }
    }
    await insertChunks(target, conversations, convRows);
    await insertChunks(target, conversationMembers, memberRows);
    await insertChunks(target, messages, messageRows);
    report.conversations = convRows.length;
    report.messages = messageRows.length;
  }

  // ─── Обговорення ────────────────────────────────────────────────────────
  {
    const th = await q(
      sql`select id, author_id, title, body, ${utc("created_at")} as created_at, ${utc("last_post_at")} as last_post_at from ${T("discussion_threads")} order by id`,
    );
    const threadIds = new Map<number, string>();
    const threadRows = th.map((t) => {
      const id = newId();
      threadIds.set(Number(t.id), id);
      return {
        id,
        authorId: byUser(t.author_id) ?? null,
        title: String(t.title),
        body: String(t.body),
        lastPostAt: date(t.last_post_at) ?? new Date(),
        createdAt: date(t.created_at) ?? new Date(),
        legacyId: Number(t.id),
      };
    });
    await insertChunks(target, threads, threadRows);
    const ps = await q(
      sql`select id, thread_id, author_id, body, ${utc("created_at")} as created_at, reply_to_post_id from ${T("discussion_posts")} order by id`,
    );
    const postIds = new Map(ps.map((p) => [Number(p.id), newId()]));
    const postRows = ps.flatMap((p) => {
      const threadId = threadIds.get(Number(p.thread_id));
      if (!threadId) return [];
      return [
        {
          id: postIds.get(Number(p.id)),
          threadId,
          authorId: byUser(p.author_id) ?? null,
          body: String(p.body),
          replyToId: p.reply_to_post_id != null ? (postIds.get(Number(p.reply_to_post_id)) ?? null) : null,
          createdAt: date(p.created_at) ?? new Date(),
          legacyId: Number(p.id),
        },
      ];
    });
    await insertChunks(target, posts, postRows);
    if (await has("thread_follows")) {
      const tf = await q(
        sql`select user_id, thread_id, ${utc("followed_at")} as followed_at, ${utc("last_read_at")} as last_read_at from ${T("thread_follows")}`,
      );
      const subRows = tf.flatMap((f) => {
        const userId = byUser(f.user_id);
        const threadId = threadIds.get(Number(f.thread_id));
        return userId && threadId
          ? [
              {
                userId,
                threadId,
                createdAt: date(f.followed_at) ?? new Date(),
                lastReadAt: date(f.last_read_at) ?? new Date(),
              },
            ]
          : [];
      });
      await insertChunks(target, threadSubscriptions, subRows);
    }
    await target.execute(
      sql`update threads t set post_count = (select count(*) from posts p where p.thread_id = t.id)`,
    );
    report.threads = threadRows.length;
    report.posts = postRows.length;
  }

  // ─── Заявки, правки, баг-репорти ────────────────────────────────────────
  {
    const reqs = await q(sql`
      select id, artist, title, release::text as release, duration, genre_names, album_title, youtube_video_id, lyrics, kind,
        requester_user_id, audio_file, ${utc("created_at")} as created_at
      from ${T("music_requests")} order by id`);
    const reqAssets: Row[] = [];
    const subRows = reqs.map((r) => {
      let audioAssetId: string | null = null;
      const file = str(r.audio_file);
      if (file) {
        audioAssetId = newId();
        reqAssets.push({
          id: audioAssetId,
          kind: "audio",
          ownerId: byUser(r.requester_user_id) ?? null,
          status: "uploaded",
          storageKey: file,
          originalName: file,
          mimeType: audioMime[ext(file)] ?? "audio/mpeg",
        });
      }
      const artistsList = String(r.artist)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      return {
        kind: r.kind === "community" ? "community_track" : "catalog_track",
        status: "pending",
        submitterId: byUser(r.requester_user_id) ?? null,
        targetLabel: `${artistsList.join(", ")} — ${r.title}`,
        payload: {
          title: String(r.title),
          artists: artistsList,
          ...(r.album_title ? { releaseTitle: String(r.album_title) } : {}),
          ...(r.release ? { releaseDate: String(r.release) } : {}),
          ...(r.duration ? { durationMs: parseDurationMs(String(r.duration)) } : {}),
          genres: String(r.genre_names ?? "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 5),
          ...(r.youtube_video_id ? { youtubeUrl: String(r.youtube_video_id) } : {}),
          ...(r.lyrics ? { lyrics: String(r.lyrics) } : {}),
          explicit: false,
        },
        audioAssetId,
        legacyId: Number(r.id),
        legacySource: "music_requests",
        createdAt: date(r.created_at) ?? new Date(),
      };
    });
    await insertChunks(target, assets, reqAssets);
    await insertChunks(target, submissions, subRows);
    report.submissions = subRows.length;

    if (await has("correction_requests")) {
      const corr = await q(sql`
        select id, user_id, music_id, artist_id, field, message, source_url, target_label, status, admin_note,
          ${utc("created_at")} as created_at, ${utc("resolved_at")} as resolved_at, resolved_by
        from ${T("correction_requests")} order by id`);
      const corrRows = corr.map((c) => {
        const targetType = c.music_id != null ? "track" : "artist";
        const targetId =
          c.music_id != null ? trackIds.get(Number(c.music_id)) : artistIds.get(Number(c.artist_id));
        return {
          kind: "correction",
          status: c.status === "done" ? "approved" : c.status === "rejected" ? "rejected" : "pending",
          submitterId: byUser(c.user_id) ?? null,
          targetType,
          targetId: targetId ?? null,
          targetLabel: str(c.target_label),
          payload: { field: String(c.field), message: String(c.message), sourceUrl: str(c.source_url) },
          reviewerId: byUser(c.resolved_by) ?? null,
          reviewNote: str(c.admin_note),
          reviewedAt: date(c.resolved_at),
          legacyId: Number(c.id),
          legacySource: "correction_requests",
          createdAt: date(c.created_at) ?? new Date(),
        };
      });
      await insertChunks(target, submissions, corrRows);
      report.corrections = corrRows.length;
    }

    const bugs = await q(
      sql`select id, user_id, description, context, status, screenshots, ${utc("created_at")} as created_at, ${utc("resolved_at")} as resolved_at, resolved_by from ${T("bug_reports")} order by id`,
    );
    const bugRows = bugs.map((b) => {
      let context: Record<string, unknown> | null = null;
      if (b.context) {
        try {
          context = JSON.parse(String(b.context)) as Record<string, unknown>;
        } catch {
          context = { text: String(b.context) };
        }
      }
      return {
        userId: byUser(b.user_id) ?? null,
        description: String(b.description),
        context,
        screenshots: (b.screenshots as string[] | null) ?? [],
        status: b.status === "resolved" ? "resolved" : "open",
        resolvedBy: byUser(b.resolved_by) ?? null,
        resolvedAt: date(b.resolved_at),
        legacyId: Number(b.id),
        createdAt: date(b.created_at) ?? new Date(),
      };
    });
    await insertChunks(target, bugReports, bugRows);
    report.bugReports = bugRows.length;
  }

  // ─── Лічильники й пошук ─────────────────────────────────────────────────
  await target.execute(
    sql`update tracks t set play_count = (select count(*) from plays p where p.track_id = t.id)`,
  );
  await recomputeCounters(target);
  await rebuildSearchIndex(target);
  log("лічильники й пошуковий індекс перераховано");
  return report;
}
