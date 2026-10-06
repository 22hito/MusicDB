/**
 * Спілкування: особисті повідомлення, обговорення, сповіщення.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./_columns";
import { users } from "./auth";
import { tracks } from "./catalog";

export const memberState = pgEnum("member_state", ["active", "request", "declined"]);

export type Attachment = { key: string; name: string; size: number; mime: string };

/**
 * Розмова. Для особистих повідомлень dm_key = "меншийId:більшийId" — одна розмова на пару.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    dmKey: text("dm_key"),
    lastMessageAt: ts("last_message_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("conversations_dm_key").on(t.dmKey),
    index("conversations_last_idx").on(t.lastMessageAt.desc()),
  ],
);

/**
 * Учасник розмови. state = request — людина ще не прийняла запит на листування (пише не друг).
 * cleared_at — «видалити чат у себе»: старіші повідомлення цьому учаснику не показуються.
 */
export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: memberState("state").notNull().default("active"),
    lastReadAt: ts("last_read_at"),
    clearedAt: ts("cleared_at"),
    muted: boolean("muted").notNull().default(false),
    joinedAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_members_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull().default(""),
    attachment: jsonb("attachment").$type<Attachment>(),
    trackId: text("track_id").references(() => tracks.id, { onDelete: "set null" }),
    replyToId: text("reply_to_id"),
    createdAt: createdAt(),
    editedAt: ts("edited_at"),
    deletedAt: ts("deleted_at"),
    legacyId: integer("legacy_id"),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt.desc())],
);

export const threads = pgTable(
  "threads",
  {
    id: id(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    postCount: integer("post_count").notNull().default(0),
    lastPostAt: ts("last_post_at").notNull().defaultNow(),
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    deletedAt: ts("deleted_at"),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("threads_last_post_idx").on(t.pinned.desc(), t.lastPostAt.desc())],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    replyToId: text("reply_to_id"),
    createdAt: createdAt(),
    editedAt: ts("edited_at"),
    deletedAt: ts("deleted_at"),
    legacyId: integer("legacy_id"),
  },
  (t) => [index("posts_thread_idx").on(t.threadId, t.createdAt)],
);

/** Учасник гілки отримує сповіщення про нові дописи; непрочитане — дописи новіші за last_read_at. */
export const threadSubscriptions = pgTable(
  "thread_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    lastReadAt: ts("last_read_at").notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.threadId] }),
    index("thread_subscriptions_thread_idx").on(t.threadId),
  ],
);

/**
 * Сповіщення — по рядку на отримувача (fan-out на запис). type — напр. follow, new_release,
 * thread_reply, submission_reviewed; entity_* — на що веде клік; data — знімок підписів.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    readAt: ts("read_at"),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt.desc())],
);
