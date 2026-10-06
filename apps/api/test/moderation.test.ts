import type { Page, Report, Submission, Track, UploadTicket } from "@musicdb/contracts";
import { assets, users } from "@musicdb/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseYoutubeId } from "../src/modules/catalog/write";
import { computeWaveform, parseDuration, parseLoudness } from "../src/services/audio";
import { createTestApp, ORIGIN, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;
let user: { cookie: string; id: string };
let admin: { cookie: string; id: string };

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
  user = await t.signUp("user@test.dev", "User");
  admin = await t.signUp("admin@test.dev", "Admin");
});
afterAll(() => t.close());

describe("заявки", () => {
  it("користувач не має доступу до адмінки", async () => {
    const res = await t.request("GET", "/v1/admin/submissions", { cookie: user.cookie });
    expect(res.status).toBe(403);
  });

  it("заявка в каталог → схвалення створює трек, виконавця, жанр і реліз", async () => {
    const created = await t.request<Submission>("POST", "/v1/submissions", {
      cookie: user.cookie,
      body: {
        kind: "catalog_track",
        track: {
          title: "In the End",
          artists: ["Linkin Park"],
          releaseTitle: "Hybrid Theory",
          releaseDate: "2000-10-24",
          genres: ["Nu Metal", "alternative rock"],
          youtubeUrl: "https://www.youtube.com/watch?v=eVTXPUF4Oz4",
          durationMs: 216_000,
        },
      },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "pending", targetLabel: "Linkin Park — In the End" });
    expect(t.realtime.events.some((e) => e.to === "role:moderator")).toBe(true);

    const queue = await t.request<Page<Submission>>("GET", "/v1/admin/submissions", { cookie: admin.cookie });
    expect(queue.body.items.map((x) => x.id)).toContain(created.body.id);

    const reviewed = await t.request<Submission>("POST", `/v1/admin/submissions/${created.body.id}/review`, {
      cookie: admin.cookie,
      body: { decision: "approve", note: "Дякуємо!" },
    });
    expect(reviewed.body.status).toBe("approved");
    const trackId = reviewed.body.resultTrackId!;
    const track = await t.request<Track>("GET", `/v1/tracks/${trackId}`);
    expect(track.body).toMatchObject({
      title: "In the End",
      artists: [{ id: s.artists.lp.id }],
      release: { title: "Hybrid Theory" },
      playback: { youtubeVideoId: "eVTXPUF4Oz4" },
    });
    expect(track.body.genres.map((g) => g.name).sort()).toEqual(["alternative rock", "nu metal"]);
    const search = await t.request<{ tracks: { id: string }[] }>(
      "GET",
      "/v1/search?q=in%20the%20end&types=track",
    );
    expect(search.body.tracks[0]!.id).toBe(trackId);
    expect(t.jobs.queued).toContainEqual({ queue: "notify.new_track", payload: { trackId } });

    const again = await t.request<{ code: string }>(
      "POST",
      `/v1/admin/submissions/${created.body.id}/review`,
      {
        cookie: admin.cookie,
        body: { decision: "reject" },
      },
    );
    expect(again.body.code).toBe("already_reviewed");
  });

  it("відхилена заявка: статус і сповіщення автору з приміткою", async () => {
    const created = await t.request<Submission>("POST", "/v1/submissions", {
      cookie: user.cookie,
      body: { kind: "community_track", track: { title: "Demo", artists: ["Me"] } },
    });
    await t.request("POST", `/v1/admin/submissions/${created.body.id}/review`, {
      cookie: admin.cookie,
      body: { decision: "reject", note: "Немає аудіо" },
    });
    const mine = await t.request<Page<Submission>>("GET", "/v1/me/submissions", { cookie: user.cookie });
    expect(mine.body.items.find((x) => x.id === created.body.id)).toMatchObject({
      status: "rejected",
      reviewNote: "Немає аудіо",
    });
    const notes = await t.request<Page<{ type: string }>>("GET", "/v1/notifications", {
      cookie: user.cookie,
    });
    expect(notes.body.items.map((n) => n.type)).toContain("submission_rejected");
  });

  it("запит на правку з міткою цілі", async () => {
    const res = await t.request<Submission>("POST", "/v1/submissions", {
      cookie: user.cookie,
      body: {
        kind: "correction",
        correction: {
          targetType: "track",
          targetId: s.tracks.numb.id,
          field: "release_date",
          message: "Сингл вийшов 2003-09-08",
        },
      },
    });
    expect(res.body).toMatchObject({ kind: "correction", targetLabel: "Linkin Park — Numb" });
  });
});

describe("скарги", () => {
  it("скарга без дублікатів → видалення контенту закриває всі скарги на ціль", async () => {
    const thread = await t.request<{ id: string }>("POST", "/v1/threads", {
      cookie: user.cookie,
      body: { title: "Спам-гілка", body: "купуйте" },
    });
    const other = await t.signUp("other@test.dev");
    for (const who of [admin, admin, other]) {
      await t.request("POST", "/v1/reports", {
        cookie: who.cookie,
        body: { targetType: "thread", targetId: thread.body.id, reason: "spam" },
      });
    }
    const open = await t.request<Page<Report>>("GET", "/v1/admin/reports", { cookie: admin.cookie });
    expect(open.body.items).toHaveLength(2);
    expect(open.body.items[0]!.targetLabel).toBe("Спам-гілка");
    await t.request("POST", `/v1/admin/reports/${open.body.items[0]!.id}/resolve`, {
      cookie: admin.cookie,
      body: { action: "remove_content", note: "Спам" },
    });
    const left = await t.request<Page<Report>>("GET", "/v1/admin/reports", { cookie: admin.cookie });
    expect(left.body.items).toHaveLength(0);
    const gone = await t.request("GET", `/v1/threads/${thread.body.id}`);
    expect(gone.status).toBe(404);
  });

  it("блокування автора: сесії відкликано, вхід неможливий", async () => {
    const spammer = await t.signUp("spammer@test.dev");
    await t.request("POST", "/v1/reports", {
      cookie: user.cookie,
      body: { targetType: "user", targetId: spammer.id, reason: "spam" },
    });
    const [report] = (await t.request<Page<Report>>("GET", "/v1/admin/reports", { cookie: admin.cookie }))
      .body.items;
    await t.request("POST", `/v1/admin/reports/${report!.id}/resolve`, {
      cookie: admin.cookie,
      body: { action: "ban_user" },
    });
    const [row] = await t.db.select({ banned: users.banned }).from(users).where(eq(users.id, spammer.id));
    expect(row!.banned).toBe(true);
    const me = await t.request("GET", "/v1/me", { cookie: spammer.cookie });
    expect(me.status).toBe(401);
  });

  it("журнал дій адміністраторів", async () => {
    const res = await t.request<Page<{ action: string }>>("GET", "/v1/admin/audit", { cookie: admin.cookie });
    expect(res.body.items.map((x) => x.action)).toEqual(
      expect.arrayContaining(["submission.approve", "report.remove_content", "report.ban_user"]),
    );
  });
});

describe("завантаження файлів", () => {
  it("підписане посилання → завантаження → обробка аудіо в черзі", async () => {
    const ticket = await t.request<UploadTicket>("POST", "/v1/uploads", {
      cookie: user.cookie,
      body: { purpose: "track_audio", fileName: "demo.mp3", mimeType: "audio/mpeg", sizeBytes: 11 },
    });
    expect(ticket.status).toBe(201);
    const early = await t.request<{ code: string }>("POST", `/v1/uploads/${ticket.body.uploadId}/complete`, {
      cookie: user.cookie,
    });
    expect(early.body.code).toBe("upload_missing");
    const path = new URL(ticket.body.url).pathname;
    const put = await t.app.request(path, {
      method: "PUT",
      headers: ticket.body.headers,
      body: "hello audio",
    });
    expect(put.status).toBe(200);
    const done = await t.request<{ status: string }>("POST", `/v1/uploads/${ticket.body.uploadId}/complete`, {
      cookie: user.cookie,
    });
    expect(done.body.status).toBe("processing");
    expect(t.jobs.queued).toContainEqual({
      queue: "audio.process",
      payload: { assetId: ticket.body.uploadId },
    });
  });

  it("неприпустимий тип і завеликий файл", async () => {
    const exe = await t.request<{ code: string }>("POST", "/v1/uploads", {
      cookie: user.cookie,
      body: { purpose: "avatar", fileName: "x.exe", mimeType: "application/x-msdownload", sizeBytes: 10 },
    });
    expect(exe.status).toBe(415);
    const big = await t.request<{ code: string }>("POST", "/v1/uploads", {
      cookie: user.cookie,
      body: { purpose: "avatar", fileName: "a.png", mimeType: "image/png", sizeBytes: 6 * 1024 * 1024 },
    });
    expect(big.status).toBe(413);
  });

  it("аватар із завантаженої картинки віддається через /v1/media", async () => {
    const ticket = await t.request<UploadTicket>("POST", "/v1/uploads", {
      cookie: user.cookie,
      body: { purpose: "avatar", fileName: "me.png", mimeType: "image/png", sizeBytes: 4 },
    });
    await t.app.request(new URL(ticket.body.url).pathname, {
      method: "PUT",
      headers: ticket.body.headers,
      body: "PNG!",
    });
    await t.request("POST", `/v1/uploads/${ticket.body.uploadId}/complete`, { cookie: user.cookie });
    const me = await t.request<{ image: string }>("PATCH", "/v1/me", {
      cookie: user.cookie,
      body: { avatarUploadId: ticket.body.uploadId },
    });
    expect(me.body.image).toBe(`http://localhost/v1/media/${ticket.body.uploadId}`);
    const media = await t.app.request(`/v1/media/${ticket.body.uploadId}`, { headers: { origin: ORIGIN } });
    expect(media.status).toBe(302);
    const file = await t.app.request(new URL(media.headers.get("location")!).pathname);
    expect(await file.text()).toBe("PNG!");
    const [asset] = await t.db.select().from(assets).where(eq(assets.id, ticket.body.uploadId));
    expect(asset!.status).toBe("uploaded");
  });
});

describe("аудіо-утиліти", () => {
  it("розбір виводу ffmpeg", () => {
    expect(parseDuration("  Duration: 00:03:24.45, start: 0")).toBe(204_450);
    expect(
      parseLoudness(
        "...Summary:\n  Integrated loudness:\n    I:         -9.8 LUFS\n  True peak:\n    Peak:       0.4 dBFS",
      ),
    ).toEqual({
      lufs: -9.8,
      peak: 0.4,
    });
  });

  it("хвиля нормалізується до 0–255", () => {
    const pcm = Buffer.alloc(8);
    pcm.writeInt16LE(1000, 0);
    pcm.writeInt16LE(-2000, 2);
    pcm.writeInt16LE(500, 4);
    pcm.writeInt16LE(0, 6);
    expect(computeWaveform(pcm, 2)).toEqual([255, 64]);
  });

  it("розбір посилань YouTube", () => {
    for (const url of [
      "https://youtu.be/eVTXPUF4Oz4",
      "https://www.youtube.com/watch?v=eVTXPUF4Oz4&t=10",
      "https://music.youtube.com/watch?v=eVTXPUF4Oz4",
      "https://www.youtube.com/shorts/eVTXPUF4Oz4",
      "eVTXPUF4Oz4",
    ]) {
      expect(parseYoutubeId(url)).toBe("eVTXPUF4Oz4");
    }
    expect(parseYoutubeId("https://example.com")).toBeNull();
  });
});

describe("видалення акаунта", () => {
  it("особисті дані стерто, гілки лишаються без автора", async () => {
    const leaver = await t.signUp("leaver@test.dev");
    const thread = await t.request<{ id: string }>("POST", "/v1/threads", {
      cookie: leaver.cookie,
      body: { title: "Прощавайте", body: "..." },
    });
    const bad = await t.request("DELETE", "/v1/me", { cookie: leaver.cookie, body: { confirm: "nope" } });
    expect(bad.status).toBe(422);
    const res = await t.request("DELETE", "/v1/me", { cookie: leaver.cookie, body: { confirm: "DELETE" } });
    expect(res.status).toBe(204);
    const [row] = await t.db.select().from(users).where(eq(users.id, leaver.id));
    expect(row).toBeUndefined();
    const kept = await t.request<{ author: unknown }>("GET", `/v1/threads/${thread.body.id}`);
    expect(kept.body.author).toBeNull();
  });
});
