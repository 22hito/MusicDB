import { endpoints, type Me } from "@musicdb/contracts";
import {
  assets,
  conversationMembers,
  conversations,
  type DbOrTx,
  messages,
  notifications,
  posts,
  removeFromIndex,
  reports,
  sessions,
  submissions,
  subscriptions,
  threadSubscriptions,
  threads,
  users,
} from "@musicdb/db";
import { and, count, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { implement } from "../../http/endpoint";
import { conflict, notFound } from "../../http/errors";
import { iso, rowsOf } from "../catalog/hydrate";
import { audit } from "../moderation/audit";
import { myStats } from "./stats";

export async function loadMe(db: DbOrTx, userId: string): Promise<Me> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw notFound("user");
  const [sub] = await db
    .select({ end: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        gt(subscriptions.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    username: u.username,
    image: u.image,
    bio: u.bio,
    role: (["user", "artist", "moderator", "admin"].includes(u.role) ? u.role : "user") as Me["role"],
    locale: u.locale === "en" ? "en" : "uk",
    isPrivate: u.isPrivate,
    premium: { active: !!sub, until: sub ? iso(sub.end) : null },
    createdAt: iso(u.createdAt),
  };
}

/** Публічна адреса завантаженої картинки (аватар, обкладинка) або null. */
export async function imageUrlFromUpload(deps: Deps, user: SessionUser, uploadId: string) {
  const [asset] = await deps.db
    .select()
    .from(assets)
    .where(and(eq(assets.id, uploadId), eq(assets.ownerId, user.id)));
  if (asset?.kind !== "image" || (asset.status !== "uploaded" && asset.status !== "ready")) {
    throw notFound("upload");
  }
  return deps.storage.publicUrl(asset.storageKey) ?? `${deps.env.API_URL}/v1/media/${asset.id}`;
}

export const meRoutes = [
  implement(endpoints.me.get, async ({ deps, user }) => loadMe(deps.db, user.id)),

  implement(endpoints.me.update, async ({ deps, user, body }) => {
    const patch: Partial<typeof users.$inferInsert> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.bio !== undefined) patch.bio = body.bio;
    if (body.locale !== undefined) patch.locale = body.locale;
    if (body.isPrivate !== undefined) patch.isPrivate = body.isPrivate;
    if (body.username !== undefined) {
      const username = body.username.toLowerCase();
      const [taken] = await deps.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, username), ne(users.id, user.id)));
      if (taken) throw conflict("username_taken", "Це ім'я користувача вже зайняте");
      patch.username = username;
      patch.displayUsername = body.username;
    }
    if (body.avatarUploadId !== undefined) {
      patch.image = body.avatarUploadId ? await imageUrlFromUpload(deps, user, body.avatarUploadId) : null;
    }
    if (Object.keys(patch).length) await deps.db.update(users).set(patch).where(eq(users.id, user.id));
    return loadMe(deps.db, user.id);
  }),

  implement(endpoints.me.delete, async ({ deps, user }) => {
    // Видалення акаунта (вимога Google Play): особисті дані стираються, публічний внесок
    // (пісні ком'юніті, дописи) лишається без автора.
    await deps.db.transaction(async (tx) => {
      await tx.update(threads).set({ authorId: null }).where(eq(threads.authorId, user.id));
      await tx.update(posts).set({ authorId: null }).where(eq(posts.authorId, user.id));
      await tx
        .update(messages)
        .set({ body: "", attachment: null, deletedAt: new Date() })
        .where(eq(messages.senderId, user.id));
      await tx.delete(users).where(eq(users.id, user.id));
      await removeFromIndex(tx, "user", [user.id]);
      await audit(tx, { actorId: null, action: "account.deleted", entityType: "user", entityId: user.id });
    });
  }),

  implement(endpoints.me.badges, async ({ deps, user }) => {
    const db = deps.db;
    const isStaff = user.role === "admin" || user.role === "moderator";
    const [[n], [m], [r], [t], [mod]] = await Promise.all([
      db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
      db
        .select({ n: count() })
        .from(messages)
        .innerJoin(
          conversationMembers,
          and(
            eq(conversationMembers.conversationId, messages.conversationId),
            eq(conversationMembers.userId, user.id),
          ),
        )
        .where(
          and(
            eq(conversationMembers.state, "active"),
            ne(messages.senderId, user.id),
            isNull(messages.deletedAt),
            or(
              isNull(conversationMembers.lastReadAt),
              gt(messages.createdAt, conversationMembers.lastReadAt),
            ),
          ),
        ),
      db
        .select({ n: count() })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
        .where(and(eq(conversationMembers.userId, user.id), eq(conversationMembers.state, "request"))),
      db
        .select({ n: sql<number>`count(distinct ${threadSubscriptions.threadId})::int` })
        .from(threadSubscriptions)
        .innerJoin(posts, eq(posts.threadId, threadSubscriptions.threadId))
        .where(
          and(
            eq(threadSubscriptions.userId, user.id),
            gt(posts.createdAt, threadSubscriptions.lastReadAt),
            ne(posts.authorId, user.id),
            isNull(posts.deletedAt),
          ),
        ),
      isStaff
        ? db
            .execute(
              sql`select ((select count(*) from ${submissions} where status = 'pending') + (select count(*) from ${reports} where status = 'open'))::int as n`,
            )
            .then((r) => rowsOf<{ n: number }>(r))
        : Promise.resolve([{ n: 0 }]),
    ]);
    return {
      notifications: Number(n?.n ?? 0),
      messages: Number(m?.n ?? 0),
      messageRequests: Number(r?.n ?? 0),
      threads: Number(t?.n ?? 0),
      moderation: Number(mod?.n ?? 0),
    };
  }),

  implement(endpoints.me.stats, async ({ deps, user, query }) =>
    myStats(deps.db, user.id, query.period, query.tz),
  ),

  implement(endpoints.me.sessions, async ({ deps, user }) => {
    const rows = await deps.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.updatedAt));
    return {
      items: rows.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: iso(s.createdAt),
        lastActiveAt: iso(s.updatedAt),
        current: s.id === user.sessionId,
      })),
    };
  }),

  implement(endpoints.me.revokeSession, async ({ deps, user, params }) => {
    const res = await deps.db
      .delete(sessions)
      .where(and(eq(sessions.id, params.id), eq(sessions.userId, user.id)))
      .returning({ id: sessions.id });
    if (res.length === 0) throw notFound("session");
  }),
];
