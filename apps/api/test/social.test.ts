import type {
  Badges,
  Conversation,
  Message,
  Notification,
  Page,
  Profile,
  ThreadDetail,
} from "@musicdb/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, seedCatalog, type TestApp } from "./harness";

let t: TestApp;
let s: Awaited<ReturnType<typeof seedCatalog>>;
let ann: { cookie: string; id: string };
let ben: { cookie: string; id: string };
let cat: { cookie: string; id: string };

beforeAll(async () => {
  t = await createTestApp();
  s = await seedCatalog(t);
  ann = await t.signUp("ann@test.dev", "Ann");
  ben = await t.signUp("ben@test.dev", "Ben");
  cat = await t.signUp("cat@test.dev", "Cat");
});
afterAll(() => t.close());

describe("підписки й профілі", () => {
  it("підписка створює сповіщення, лічильники й статус у профілі", async () => {
    await t.request("PUT", `/v1/users/${ann.id}/follow`, { cookie: ben.cookie });
    const notes = await t.request<Page<Notification>>("GET", "/v1/notifications", { cookie: ann.cookie });
    expect(notes.body.items[0]).toMatchObject({ type: "follow", actor: { name: "Ben" }, read: false });
    const badges = await t.request<Badges>("GET", "/v1/me/badges", { cookie: ann.cookie });
    expect(badges.body.notifications).toBe(1);
    await t.request("POST", "/v1/notifications/read", { cookie: ann.cookie, body: {} });
    const after = await t.request<Badges>("GET", "/v1/me/badges", { cookie: ann.cookie });
    expect(after.body.notifications).toBe(0);
    const profile = await t.request<Profile>("GET", `/v1/users/${ann.id}`, { cookie: ben.cookie });
    expect(profile.body).toMatchObject({
      followerCount: 1,
      viewer: { following: true, followsYou: false, isSelf: false },
    });
  });

  it("не можна підписатися на себе", async () => {
    const res = await t.request<{ code: string }>("PUT", `/v1/users/${ann.id}/follow`, {
      cookie: ann.cookie,
    });
    expect(res.body.code).toBe("cannot_follow_self");
  });

  it("приватний профіль приховує активність від не-друзів", async () => {
    await t.request("PATCH", "/v1/me", { cookie: cat.cookie, body: { isPrivate: true } });
    await t.request("POST", "/v1/plays", {
      cookie: cat.cookie,
      body: { trackId: s.tracks.numb.id, msPlayed: 60_000 },
    });
    const stranger = await t.request<Profile>("GET", `/v1/users/${cat.id}`, { cookie: ann.cookie });
    expect(stranger.body.recentlyPlayed).toEqual([]);
    const self = await t.request<Profile>("GET", `/v1/users/${cat.id}`, { cookie: cat.cookie });
    expect(self.body.recentlyPlayed).toHaveLength(1);
  });
});

describe("особисті повідомлення", () => {
  let conv: Conversation;

  it("не-друг пише через запит на листування", async () => {
    const open = await t.request<Conversation>("POST", "/v1/conversations", {
      cookie: cat.cookie,
      body: { userId: ann.id },
    });
    conv = open.body;
    expect(conv.state).toBe("pending");
    await t.request<Message>("POST", `/v1/conversations/${conv.id}/messages`, {
      cookie: cat.cookie,
      body: { body: "Привіт!" },
    });
    const requests = await t.request<Page<Conversation>>("GET", "/v1/conversations?folder=requests", {
      cookie: ann.cookie,
    });
    expect(requests.body.items).toHaveLength(1);
    expect(requests.body.items[0]).toMatchObject({ state: "request", unreadCount: 1, peer: { name: "Cat" } });
    const inbox = await t.request<Page<Conversation>>("GET", "/v1/conversations", { cookie: ann.cookie });
    expect(inbox.body.items).toHaveLength(0);
    const badges = await t.request<Badges>("GET", "/v1/me/badges", { cookie: ann.cookie });
    expect(badges.body.messageRequests).toBe(1);
  });

  it("до прийняття запиту — не більше 5 повідомлень", async () => {
    for (let i = 0; i < 4; i++) {
      await t.request("POST", `/v1/conversations/${conv.id}/messages`, {
        cookie: cat.cookie,
        body: { body: `#${i}` },
      });
    }
    const blocked = await t.request<{ code: string }>("POST", `/v1/conversations/${conv.id}/messages`, {
      cookie: cat.cookie,
      body: { body: "ще" },
    });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("request_pending");
  });

  it("відповідь приймає запит; поділитися треком; прочитано", async () => {
    const reply = await t.request<Message>("POST", `/v1/conversations/${conv.id}/messages`, {
      cookie: ann.cookie,
      body: { body: "Послухай", trackId: s.tracks.moses.id },
    });
    expect(reply.body.track!.title).toBe("Shadow Moses");
    const forCat = await t.request<Conversation>("GET", `/v1/conversations/${conv.id}`, {
      cookie: cat.cookie,
    });
    expect(forCat.body.state).toBe("active");
    expect(forCat.body.unreadCount).toBe(1);
    await t.request("POST", `/v1/conversations/${conv.id}/read`, { cookie: cat.cookie });
    const read = await t.request<Conversation>("GET", `/v1/conversations/${conv.id}`, { cookie: cat.cookie });
    expect(read.body.unreadCount).toBe(0);
    const events = t.realtime.events.filter((e) => e.event.type === "conversation.read");
    expect(events.at(-1)!.to).toBe(ann.id);
    const history = await t.request<Page<Message>>("GET", `/v1/conversations/${conv.id}/messages?limit=3`, {
      cookie: ann.cookie,
    });
    expect(history.body.items[0]!.body).toBe("Послухай");
    expect(history.body.nextCursor).not.toBeNull();
  });

  it("видалити історію в себе — співрозмовник свою копію зберігає", async () => {
    await t.request("POST", `/v1/conversations/${conv.id}/clear`, { cookie: ann.cookie });
    const mine = await t.request<Page<Message>>("GET", `/v1/conversations/${conv.id}/messages`, {
      cookie: ann.cookie,
    });
    expect(mine.body.items).toHaveLength(0);
    const theirs = await t.request<Page<Message>>("GET", `/v1/conversations/${conv.id}/messages`, {
      cookie: cat.cookie,
    });
    expect(theirs.body.items.length).toBeGreaterThan(0);
  });

  it("блокування забороняє листування й розриває підписки", async () => {
    await t.request("PUT", `/v1/users/${cat.id}/follow`, { cookie: ann.cookie });
    await t.request("PUT", `/v1/users/${cat.id}/block`, { cookie: ann.cookie });
    const send = await t.request<{ code: string }>("POST", `/v1/conversations/${conv.id}/messages`, {
      cookie: cat.cookie,
      body: { body: "?" },
    });
    expect(send.body.code).toBe("blocked");
    const profile = await t.request<Profile>("GET", `/v1/users/${cat.id}`, { cookie: ann.cookie });
    expect(profile.body.viewer).toMatchObject({ blocked: true, following: false });
    const hidden = await t.request("GET", `/v1/users/${ann.id}`, { cookie: cat.cookie });
    expect(hidden.status).toBe(404);
  });

  it("свої повідомлення можна видалити, чужі — ні", async () => {
    const open = await t.request<Conversation>("POST", "/v1/conversations", {
      cookie: ann.cookie,
      body: { userId: ben.id },
    });
    const msg = await t.request<Message>("POST", `/v1/conversations/${open.body.id}/messages`, {
      cookie: ann.cookie,
      body: { body: "x" },
    });
    const foreign = await t.request("DELETE", `/v1/messages/${msg.body.id}`, { cookie: ben.cookie });
    expect(foreign.status).toBe(403);
    const own = await t.request("DELETE", `/v1/messages/${msg.body.id}`, { cookie: ann.cookie });
    expect(own.status).toBe(204);
    const list = await t.request<Page<Message>>("GET", `/v1/conversations/${open.body.id}/messages`, {
      cookie: ben.cookie,
    });
    expect(list.body.items[0]).toMatchObject({ deleted: true, body: "" });
  });
});

describe("обговорення", () => {
  it("гілка, відповідь на допис, сповіщення учасникам, непрочитане", async () => {
    const thread = await t.request<{ id: string }>("POST", "/v1/threads", {
      cookie: ann.cookie,
      body: { title: "Найкращий альбом 2003", body: "Meteora чи ні?" },
    });
    const first = await t.request<{ id: string }>("POST", `/v1/threads/${thread.body.id}/posts`, {
      cookie: ben.cookie,
      body: { body: "Meteora, без варіантів" },
    });
    const annNotes = await t.request<Page<Notification>>("GET", "/v1/notifications", { cookie: ann.cookie });
    expect(annNotes.body.items[0]).toMatchObject({ type: "thread_reply", entityId: thread.body.id });
    const annBadges = await t.request<Badges>("GET", "/v1/me/badges", { cookie: ann.cookie });
    expect(annBadges.body.threads).toBe(1);

    await t.request("POST", `/v1/threads/${thread.body.id}/posts`, {
      cookie: ann.cookie,
      body: { body: "Згодна", replyToId: first.body.id },
    });
    const benNotes = await t.request<Page<Notification>>("GET", "/v1/notifications", { cookie: ben.cookie });
    expect(benNotes.body.items[0]!.type).toBe("post_reply");

    const detail = await t.request<ThreadDetail>("GET", `/v1/threads/${thread.body.id}`, {
      cookie: ann.cookie,
    });
    expect(detail.body.posts).toHaveLength(2);
    expect(detail.body.posts[1]!.replyTo).toMatchObject({ id: first.body.id, author: { name: "Ben" } });
    expect(detail.body.postCount).toBe(2);
    const afterRead = await t.request<Badges>("GET", "/v1/me/badges", { cookie: ann.cookie });
    expect(afterRead.body.threads).toBe(0);
  });
});
