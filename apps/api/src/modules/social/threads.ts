import { endpoints, type NotificationType, type Post, type Thread } from "@musicdb/contracts";
import { notifications, posts, threadSubscriptions, threads } from "@musicdb/db";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { isStaff } from "../../context";
import { decodeCursor, encodeCursor } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { forbidden, notFound } from "../../http/errors";
import { iso, loadUserRefs } from "../catalog/hydrate";
import { notify } from "./notify";

type ThreadRow = typeof threads.$inferSelect;

async function hydrateThreads(deps: Deps, rows: ThreadRow[], viewer: SessionUser | null): Promise<Thread[]> {
  if (rows.length === 0) return [];
  const authors = await loadUserRefs(
    deps.db,
    rows.map((r) => r.authorId),
  );
  let unreadIds = new Set<string>();
  if (viewer) {
    const unread = await deps.db
      .select({ id: threadSubscriptions.threadId })
      .from(threadSubscriptions)
      .where(
        and(
          eq(threadSubscriptions.userId, viewer.id),
          inArray(
            threadSubscriptions.threadId,
            rows.map((r) => r.id),
          ),
          sql`exists (select 1 from ${posts} p where p.thread_id = ${threadSubscriptions.threadId}
            and p.created_at > ${threadSubscriptions.lastReadAt} and p.author_id is distinct from ${viewer.id} and p.deleted_at is null)`,
        ),
      );
    unreadIds = new Set(unread.map((u) => u.id));
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.deletedAt ? "" : r.body,
    author: r.authorId ? (authors.get(r.authorId) ?? null) : null,
    postCount: r.postCount,
    lastPostAt: iso(r.lastPostAt),
    pinned: r.pinned,
    locked: r.locked,
    unread: unreadIds.has(r.id),
    createdAt: iso(r.createdAt),
  }));
}

async function hydratePosts(
  deps: Deps,
  rows: (typeof posts.$inferSelect)[],
  all: Map<string, typeof posts.$inferSelect>,
) {
  const authors = await loadUserRefs(deps.db, [
    ...rows.map((r) => r.authorId),
    ...rows.map((r) => (r.replyToId ? all.get(r.replyToId)?.authorId : null)),
  ]);
  return rows.map((r): Post => {
    const parent = r.replyToId ? all.get(r.replyToId) : undefined;
    return {
      id: r.id,
      threadId: r.threadId,
      author: r.authorId ? (authors.get(r.authorId) ?? null) : null,
      body: r.deletedAt ? "" : r.body,
      replyTo: parent
        ? {
            id: parent.id,
            author: parent.authorId ? (authors.get(parent.authorId) ?? null) : null,
            excerpt: parent.deletedAt ? "" : parent.body.slice(0, 160),
          }
        : null,
      createdAt: iso(r.createdAt),
      editedAt: r.editedAt ? iso(r.editedAt) : null,
      deleted: !!r.deletedAt,
    };
  });
}

async function subscribe(deps: Deps, userId: string, threadId: string) {
  await deps.db
    .insert(threadSubscriptions)
    .values({ userId, threadId })
    .onConflictDoUpdate({
      target: [threadSubscriptions.userId, threadSubscriptions.threadId],
      set: { lastReadAt: new Date() },
    });
}

async function loadThread(deps: Deps, id: string) {
  const [t] = await deps.db.select().from(threads).where(eq(threads.id, id));
  if (!t || t.deletedAt) throw notFound("thread");
  return t;
}

export const threadRoutes = [
  implement(endpoints.threads.list, async ({ deps, user, query }) => {
    const cursor = decodeCursor<{ t: string; id: string }>(query.cursor);
    const rows = await deps.db
      .select()
      .from(threads)
      .where(
        and(
          isNull(threads.deletedAt),
          cursor
            ? sql`(${threads.lastPostAt}, ${threads.id}) < (${new Date(cursor.t)}, ${cursor.id})`
            : undefined,
        ),
      )
      .orderBy(desc(threads.lastPostAt), desc(threads.id))
      .limit(query.limit + 1);
    // Закріплені гілки — на першій сторінці зверху.
    const page = rows.slice(0, query.limit);
    const pinned = !cursor
      ? await deps.db
          .select()
          .from(threads)
          .where(and(eq(threads.pinned, true), isNull(threads.deletedAt)))
      : [];
    const merged = [...pinned, ...page.filter((t) => !t.pinned || cursor)];
    const last = page.at(-1);
    return {
      items: await hydrateThreads(deps, merged, user),
      nextCursor:
        rows.length > query.limit && last ? encodeCursor({ t: iso(last.lastPostAt), id: last.id }) : null,
    };
  }),

  implement(endpoints.threads.create, async ({ deps, user, body }) => {
    const [t] = await deps.db
      .insert(threads)
      .values({ authorId: user.id, title: body.title, body: body.body })
      .returning();
    await subscribe(deps, user.id, t!.id);
    const [thread] = await hydrateThreads(deps, [t!], user);
    return thread!;
  }),

  implement(endpoints.threads.get, async ({ deps, user, params }) => {
    const t = await loadThread(deps, params.id);
    const postRows = await deps.db
      .select()
      .from(posts)
      .where(eq(posts.threadId, t.id))
      .orderBy(asc(posts.createdAt))
      .limit(2000);
    const all = new Map(postRows.map((p) => [p.id, p]));
    let subscribed = false;
    if (user) {
      const res = await deps.db
        .update(threadSubscriptions)
        .set({ lastReadAt: new Date() })
        .where(and(eq(threadSubscriptions.userId, user.id), eq(threadSubscriptions.threadId, t.id)))
        .returning({ id: threadSubscriptions.threadId });
      subscribed = res.length > 0;
      if (subscribed) deps.realtime.publish(user.id, { type: "badges.changed" });
    }
    const [thread] = await hydrateThreads(deps, [t], user);
    return {
      ...thread!,
      unread: false,
      posts: await hydratePosts(deps, postRows, all),
      viewer: user ? { subscribed, canModerate: isStaff(user) } : null,
    };
  }),

  implement(endpoints.threads.reply, async ({ deps, user, params, body }) => {
    const t = await loadThread(deps, params.id);
    if (t.locked && !isStaff(user)) throw forbidden("thread_locked", "Гілку закрито для відповідей");
    let parent: typeof posts.$inferSelect | undefined;
    if (body.replyToId) {
      [parent] = await deps.db
        .select()
        .from(posts)
        .where(and(eq(posts.id, body.replyToId), eq(posts.threadId, t.id)));
      if (!parent) throw notFound("post");
    }
    const now = new Date();
    const [row] = await deps.db
      .insert(posts)
      .values({
        threadId: t.id,
        authorId: user.id,
        body: body.body,
        replyToId: parent?.id ?? null,
        createdAt: now,
      })
      .returning();
    await deps.db
      .update(threads)
      .set({ postCount: sql`${threads.postCount} + 1`, lastPostAt: now })
      .where(eq(threads.id, t.id));
    await subscribe(deps, user.id, t.id);

    const subscribers = await deps.db
      .select({ id: threadSubscriptions.userId })
      .from(threadSubscriptions)
      .where(eq(threadSubscriptions.threadId, t.id));
    const data = { threadTitle: t.title, excerpt: body.body.slice(0, 140) };
    if (parent?.authorId && parent.authorId !== user.id) {
      await notify(deps, [parent.authorId], {
        type: "post_reply",
        actorId: user.id,
        entityType: "thread",
        entityId: t.id,
        data,
      });
    }
    await notify(
      deps,
      subscribers.map((s) => s.id).filter((id) => id !== parent?.authorId),
      { type: "thread_reply", actorId: user.id, entityType: "thread", entityId: t.id, data },
    );
    const all = new Map(parent ? [[parent.id, parent]] : []);
    const [post] = await hydratePosts(deps, [row!], all);
    return post!;
  }),

  implement(endpoints.threads.subscribe, async ({ deps, user, params }) => {
    await loadThread(deps, params.id);
    await subscribe(deps, user.id, params.id);
  }),

  implement(endpoints.threads.unsubscribe, async ({ deps, user, params }) => {
    await deps.db
      .delete(threadSubscriptions)
      .where(and(eq(threadSubscriptions.userId, user.id), eq(threadSubscriptions.threadId, params.id)));
  }),

  implement(endpoints.threads.delete, async ({ deps, user, params }) => {
    const t = await loadThread(deps, params.id);
    if (t.authorId !== user.id && !isStaff(user)) throw forbidden();
    await deps.db.update(threads).set({ deletedAt: new Date() }).where(eq(threads.id, t.id));
  }),

  implement(endpoints.threads.deletePost, async ({ deps, user, params }) => {
    const [p] = await deps.db.select().from(posts).where(eq(posts.id, params.id));
    if (!p || p.deletedAt) throw notFound("post");
    if (p.authorId !== user.id && !isStaff(user)) throw forbidden();
    await deps.db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, p.id));
  }),
];

export const notificationRoutes = [
  implement(endpoints.notifications.list, async ({ deps, user, query }) => {
    const cursor = decodeCursor<{ id: number }>(query.cursor);
    const rows = await deps.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), cursor ? lt(notifications.id, cursor.id) : undefined))
      .orderBy(desc(notifications.id))
      .limit(query.limit + 1);
    const page = rows.slice(0, query.limit);
    const actors = await loadUserRefs(
      deps.db,
      page.map((r) => r.actorId),
    );
    const last = page.at(-1);
    return {
      items: page.map((r) => ({
        id: r.id,
        type: r.type as NotificationType,
        actor: r.actorId ? (actors.get(r.actorId) ?? null) : null,
        entityType: r.entityType,
        entityId: r.entityId,
        data: r.data,
        createdAt: iso(r.createdAt),
        read: !!r.readAt,
      })),
      nextCursor: rows.length > query.limit && last ? encodeCursor({ id: last.id }) : null,
    };
  }),

  implement(endpoints.notifications.markRead, async ({ deps, user, body }) => {
    await deps.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, user.id),
          isNull(notifications.readAt),
          body.ids?.length ? inArray(notifications.id, body.ids) : undefined,
        ),
      );
    deps.realtime.publish(user.id, { type: "badges.changed" });
  }),
];
