import { z } from "zod";
import { Id, IsoDateTime } from "./common";
import { Track, UserRef } from "./models";

export const Attachment = z
  .object({ name: z.string(), size: z.number().int(), mimeType: z.string(), url: z.string().nullable() })
  .meta({ id: "Attachment" });
export type Attachment = z.infer<typeof Attachment>;

export const Message = z
  .object({
    id: Id,
    conversationId: Id,
    sender: UserRef.nullable(),
    body: z.string(),
    attachment: Attachment.nullable(),
    track: Track.nullable(),
    replyToId: Id.nullable(),
    createdAt: IsoDateTime,
    editedAt: IsoDateTime.nullable(),
    deleted: z.boolean(),
  })
  .meta({ id: "Message" });
export type Message = z.infer<typeof Message>;

export const Conversation = z
  .object({
    id: Id,
    peer: UserRef,
    /** request — мені написав не друг, треба прийняти; pending — я написав, чекаю на прийняття. */
    state: z.enum(["active", "request", "pending", "declined"]),
    lastMessage: Message.nullable(),
    unreadCount: z.number().int(),
    updatedAt: IsoDateTime,
  })
  .meta({ id: "Conversation" });
export type Conversation = z.infer<typeof Conversation>;

export const SendMessageBody = z.object({
  body: z.string().max(4000).default(""),
  trackId: Id.optional(),
  attachmentUploadId: Id.optional(),
  replyToId: Id.optional(),
});

export const Thread = z
  .object({
    id: Id,
    title: z.string(),
    body: z.string(),
    author: UserRef.nullable(),
    postCount: z.number().int(),
    lastPostAt: IsoDateTime,
    pinned: z.boolean(),
    locked: z.boolean(),
    unread: z.boolean(),
    createdAt: IsoDateTime,
  })
  .meta({ id: "Thread" });
export type Thread = z.infer<typeof Thread>;

export const Post = z
  .object({
    id: Id,
    threadId: Id,
    author: UserRef.nullable(),
    body: z.string(),
    replyTo: z.object({ id: Id, author: UserRef.nullable(), excerpt: z.string() }).nullable(),
    createdAt: IsoDateTime,
    editedAt: IsoDateTime.nullable(),
    deleted: z.boolean(),
  })
  .meta({ id: "Post" });
export type Post = z.infer<typeof Post>;

export const ThreadDetail = Thread.extend({
  posts: z.array(Post),
  viewer: z.object({ subscribed: z.boolean(), canModerate: z.boolean() }).nullable(),
}).meta({ id: "ThreadDetail" });
export type ThreadDetail = z.infer<typeof ThreadDetail>;

export const NotificationType = z.enum([
  "follow",
  "new_release",
  "thread_reply",
  "post_reply",
  "submission_approved",
  "submission_rejected",
  "report_resolved",
  "playlist_follow",
  "system",
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const Notification = z
  .object({
    id: z.number().int(),
    type: NotificationType,
    actor: UserRef.nullable(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    data: z.record(z.string(), z.unknown()),
    createdAt: IsoDateTime,
    read: z.boolean(),
  })
  .meta({ id: "Notification" });
export type Notification = z.infer<typeof Notification>;

/** Усі лічильники бейджів одним запитом. */
export const Badges = z
  .object({
    notifications: z.number().int(),
    messages: z.number().int(),
    messageRequests: z.number().int(),
    threads: z.number().int(),
    moderation: z.number().int(),
  })
  .meta({ id: "Badges" });
export type Badges = z.infer<typeof Badges>;
