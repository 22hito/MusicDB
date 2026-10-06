import { type Conversation, endpoints, type Message } from "@musicdb/contracts";
import {
  type Attachment,
  assets,
  conversationMembers,
  conversations,
  type DbOrTx,
  messages,
  users,
} from "@musicdb/db";
import { and, count, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { decodeCursor, encodeCursor } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { badRequest, forbidden, notFound } from "../../http/errors";
import { iso, loadTracks, loadUserRefs } from "../catalog/hydrate";
import { areFriends } from "../playlists/routes";
import { isBlockedBetween } from "./notify";

const PENDING_LIMIT = 5;

type MessageRow = typeof messages.$inferSelect;
type MemberRow = typeof conversationMembers.$inferSelect;

async function hydrateMessages(deps: Deps, rows: MessageRow[]): Promise<Message[]> {
  if (rows.length === 0) return [];
  const [senders, trackList] = await Promise.all([
    loadUserRefs(
      deps.db,
      rows.map((r) => r.senderId),
    ),
    loadTracks(
      deps.db,
      rows.flatMap((r) => (r.trackId && !r.deletedAt ? [r.trackId] : [])),
    ),
  ]);
  const tracksById = new Map(trackList.map((t) => [t.id, t]));
  return Promise.all(
    rows.map(async (r) => {
      const deleted = !!r.deletedAt;
      const attachment: Attachment | null = deleted ? null : r.attachment;
      return {
        id: r.id,
        conversationId: r.conversationId,
        sender: r.senderId ? (senders.get(r.senderId) ?? null) : null,
        body: deleted ? "" : r.body,
        attachment: attachment
          ? {
              name: attachment.name,
              size: attachment.size,
              mimeType: attachment.mime,
              url: await deps.storage.presignGet(attachment.key, {
                expiresIn: 3600,
                contentType: attachment.mime,
              }),
            }
          : null,
        track: !deleted && r.trackId ? (tracksById.get(r.trackId) ?? null) : null,
        replyToId: r.replyToId,
        createdAt: iso(r.createdAt),
        editedAt: r.editedAt ? iso(r.editedAt) : null,
        deleted,
      };
    }),
  );
}

async function membership(db: DbOrTx, conversationId: string, userId: string) {
  const members = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));
  const me = members.find((m) => m.userId === userId);
  const peer = members.find((m) => m.userId !== userId);
  if (!me || !peer) throw notFound("conversation");
  return { me, peer };
}

function stateOf(me: MemberRow, peer: MemberRow): Conversation["state"] {
  if (me.state === "request") return "request";
  if (peer.state === "declined") return "declined";
  if (peer.state === "request") return "pending";
  return "active";
}

async function toConversations(deps: Deps, userId: string, ids: string[]): Promise<Conversation[]> {
  if (ids.length === 0) return [];
  const db = deps.db;
  const [convRows, memberRows] = await Promise.all([
    db.select().from(conversations).where(inArray(conversations.id, ids)),
    db.select().from(conversationMembers).where(inArray(conversationMembers.conversationId, ids)),
  ]);
  const lastRes = await db
    .selectDistinctOn([messages.conversationId])
    .from(messages)
    .where(inArray(messages.conversationId, ids))
    .orderBy(messages.conversationId, desc(messages.createdAt));
  const meRows = memberRows.filter((m) => m.userId === userId);
  const unread = await db
    .select({ id: messages.conversationId, n: count() })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .where(
      and(
        inArray(messages.conversationId, ids),
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        or(isNull(conversationMembers.lastReadAt), gt(messages.createdAt, conversationMembers.lastReadAt)),
        or(isNull(conversationMembers.clearedAt), gt(messages.createdAt, conversationMembers.clearedAt)),
      ),
    )
    .groupBy(messages.conversationId);
  const peers = await loadUserRefs(
    db,
    memberRows.filter((m) => m.userId !== userId).map((m) => m.userId),
  );
  const visibleLast = lastRes.filter((m) => {
    const me = meRows.find((x) => x.conversationId === m.conversationId);
    return !me?.clearedAt || m.createdAt > me.clearedAt;
  });
  const lastMessages = new Map((await hydrateMessages(deps, visibleLast)).map((m) => [m.conversationId, m]));
  const unreadBy = new Map(unread.map((u) => [u.id, u.n]));
  const order = new Map(ids.map((id, i) => [id, i]));
  return convRows
    .flatMap((c): Conversation[] => {
      const me = memberRows.find((m) => m.conversationId === c.id && m.userId === userId);
      const peer = memberRows.find((m) => m.conversationId === c.id && m.userId !== userId);
      if (!me || !peer) return [];
      return [
        {
          id: c.id,
          peer: peers.get(peer.userId) ?? { id: peer.userId, username: null, name: "—", image: null },
          state: stateOf(me, peer),
          lastMessage: lastMessages.get(c.id) ?? null,
          unreadCount: unreadBy.get(c.id) ?? 0,
          updatedAt: iso(c.lastMessageAt ?? c.createdAt),
        },
      ];
    })
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function openDm(deps: Deps, user: SessionUser, peerId: string) {
  const db = deps.db;
  if (peerId === user.id) throw badRequest("cannot_message_self", "Не можна написати собі");
  const [peer] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, peerId), isNull(users.deletedAt)));
  if (!peer) throw notFound("user");
  if (await isBlockedBetween(db, user.id, peerId)) throw forbidden("blocked", "Листування недоступне");
  const dmKey = [user.id, peerId].sort().join(":");
  const [existing] = await db.select().from(conversations).where(eq(conversations.dmKey, dmKey));
  if (existing) return existing.id;
  const friends = await areFriends(db, user.id, peerId);
  return db.transaction(async (tx) => {
    const [conv] = await tx.insert(conversations).values({ dmKey }).onConflictDoNothing().returning();
    if (!conv) {
      const [again] = await tx.select().from(conversations).where(eq(conversations.dmKey, dmKey));
      return again!.id;
    }
    await tx.insert(conversationMembers).values([
      { conversationId: conv.id, userId: user.id, state: "active" },
      { conversationId: conv.id, userId: peerId, state: friends ? "active" : "request" },
    ]);
    return conv.id;
  });
}

export const conversationRoutes = [
  implement(endpoints.conversations.list, async ({ deps, user, query }) => {
    const cursor = decodeCursor<{ t: string; id: string }>(query.cursor);
    const rows = await deps.db
      .select({ id: conversations.id, last: conversations.lastMessageAt })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(
        and(
          eq(conversationMembers.userId, user.id),
          query.folder === "requests"
            ? eq(conversationMembers.state, "request")
            : ne(conversationMembers.state, "request"),
          sql`${conversations.lastMessageAt} is not null`,
          or(
            isNull(conversationMembers.clearedAt),
            gt(conversations.lastMessageAt, conversationMembers.clearedAt),
          ),
          cursor
            ? or(
                lt(conversations.lastMessageAt, new Date(cursor.t)),
                and(eq(conversations.lastMessageAt, new Date(cursor.t)), gt(conversations.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(conversations.lastMessageAt), conversations.id)
      .limit(query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: await toConversations(
        deps,
        user.id,
        page.map((r) => r.id),
      ),
      nextCursor:
        rows.length > query.limit && last?.last ? encodeCursor({ t: iso(last.last), id: last.id }) : null,
    };
  }),

  implement(endpoints.conversations.open, async ({ deps, user, body }) => {
    const id = await openDm(deps, user, body.userId);
    const [conv] = await toConversations(deps, user.id, [id]);
    return conv!;
  }),

  implement(endpoints.conversations.get, async ({ deps, user, params }) => {
    await membership(deps.db, params.id, user.id);
    const [conv] = await toConversations(deps, user.id, [params.id]);
    return conv!;
  }),

  implement(endpoints.conversations.messages, async ({ deps, user, params, query }) => {
    const { me } = await membership(deps.db, params.id, user.id);
    const cursor = decodeCursor<{ t: string; id: string }>(query.cursor);
    const rows = await deps.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, params.id),
          me.clearedAt ? gt(messages.createdAt, me.clearedAt) : undefined,
          cursor
            ? or(
                lt(messages.createdAt, new Date(cursor.t)),
                and(eq(messages.createdAt, new Date(cursor.t)), lt(messages.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: await hydrateMessages(deps, page),
      nextCursor:
        rows.length > query.limit && last ? encodeCursor({ t: iso(last.createdAt), id: last.id }) : null,
    };
  }),

  implement(endpoints.conversations.send, async ({ deps, user, params, body }) => {
    const db = deps.db;
    const { me, peer } = await membership(db, params.id, user.id);
    if (await isBlockedBetween(db, user.id, peer.userId)) throw forbidden("blocked", "Листування недоступне");
    if (peer.state === "declined")
      throw forbidden("request_declined", "Людина відхилила запит на листування");
    if (!body.body.trim() && !body.trackId && !body.attachmentUploadId) {
      throw badRequest("empty_message", "Порожнє повідомлення");
    }
    if (peer.state === "request") {
      const [{ n } = { n: 0 }] = await db
        .select({ n: count() })
        .from(messages)
        .where(and(eq(messages.conversationId, params.id), eq(messages.senderId, user.id)));
      if (n >= PENDING_LIMIT) {
        throw forbidden("request_pending", "Дочекайтеся, поки людина прийме запит на листування");
      }
    }
    let attachment: Attachment | null = null;
    if (body.attachmentUploadId) {
      const [asset] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, body.attachmentUploadId), eq(assets.ownerId, user.id)));
      if (!asset || asset.status === "pending" || asset.status === "failed") throw notFound("upload");
      attachment = {
        key: asset.storageKey,
        name: asset.originalName ?? "file",
        size: asset.sizeBytes ?? 0,
        mime: asset.mimeType ?? "application/octet-stream",
      };
    }
    const now = new Date();
    const [row] = await db
      .insert(messages)
      .values({
        conversationId: params.id,
        senderId: user.id,
        body: body.body.trim(),
        trackId: body.trackId ?? null,
        attachment,
        replyToId: body.replyToId ?? null,
        createdAt: now,
      })
      .returning();
    await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, params.id));
    // Відповідь на запит означає згоду на листування.
    if (me.state === "request") {
      await db
        .update(conversationMembers)
        .set({ state: "active" })
        .where(
          and(eq(conversationMembers.conversationId, params.id), eq(conversationMembers.userId, user.id)),
        );
    }
    await db
      .update(conversationMembers)
      .set({ lastReadAt: now })
      .where(and(eq(conversationMembers.conversationId, params.id), eq(conversationMembers.userId, user.id)));
    const [message] = await hydrateMessages(deps, [row!]);
    deps.realtime.publish([user.id, peer.userId], { type: "message", message: message! });
    deps.realtime.publish(peer.userId, { type: "badges.changed" });
    return message!;
  }),

  implement(endpoints.conversations.read, async ({ deps, user, params }) => {
    const { peer } = await membership(deps.db, params.id, user.id);
    await deps.db
      .update(conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, params.id), eq(conversationMembers.userId, user.id)));
    deps.realtime.publish(peer.userId, {
      type: "conversation.read",
      conversationId: params.id,
      userId: user.id,
    });
    deps.realtime.publish(user.id, { type: "badges.changed" });
  }),

  implement(endpoints.conversations.respond, async ({ deps, user, params, body }) => {
    const { me } = await membership(deps.db, params.id, user.id);
    if (me.state !== "request" && body.accept === false && me.state !== "active") return;
    await deps.db
      .update(conversationMembers)
      .set({ state: body.accept ? "active" : "declined" })
      .where(and(eq(conversationMembers.conversationId, params.id), eq(conversationMembers.userId, user.id)));
    deps.realtime.publish(user.id, { type: "badges.changed" });
  }),

  implement(endpoints.conversations.clear, async ({ deps, user, params }) => {
    await membership(deps.db, params.id, user.id);
    await deps.db
      .update(conversationMembers)
      .set({ clearedAt: new Date(), lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, params.id), eq(conversationMembers.userId, user.id)));
  }),

  implement(endpoints.conversations.deleteMessage, async ({ deps, user, params }) => {
    const [row] = await deps.db.select().from(messages).where(eq(messages.id, params.id));
    if (!row) throw notFound("message");
    if (row.senderId !== user.id) throw forbidden();
    const [updated] = await deps.db
      .update(messages)
      .set({ deletedAt: new Date(), body: "", attachment: null, trackId: null })
      .where(eq(messages.id, params.id))
      .returning();
    const { peer } = await membership(deps.db, row.conversationId, user.id);
    const [message] = await hydrateMessages(deps, [updated!]);
    deps.realtime.publish([user.id, peer.userId], { type: "message", message: message! });
  }),
];
