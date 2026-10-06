import { z } from "zod";
import { Message, Notification } from "./social";

/** Події, які сервер надсилає клієнту через WebSocket /v1/realtime. */
export const RealtimeEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), userId: z.string() }),
  z.object({ type: z.literal("notification"), notification: Notification }),
  z.object({ type: z.literal("message"), message: Message }),
  z.object({ type: z.literal("conversation.read"), conversationId: z.string(), userId: z.string() }),
  z.object({ type: z.literal("badges.changed") }),
  z.object({
    type: z.literal("library.changed"),
    scope: z.enum(["likes", "playlists", "follows", "releases"]),
  }),
  z.object({ type: z.literal("playlist.changed"), playlistId: z.string() }),
  z.object({ type: z.literal("upload.status"), uploadId: z.string(), status: z.string() }),
  z.object({ type: z.literal("catalog.changed"), trackIds: z.array(z.string()).optional() }),
  z.object({ type: z.literal("moderation.changed") }),
]);
export type RealtimeEvent = z.infer<typeof RealtimeEvent>;
