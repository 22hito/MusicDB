import type { Notification, NotificationType } from "@musicdb/contracts";
import { type DbOrTx, notifications, userBlocks } from "@musicdb/db";
import { and, eq, inArray, or } from "drizzle-orm";
import type { Deps } from "../../context";
import { iso, loadUserRefs } from "../catalog/hydrate";

export type NotifyInput = {
  type: NotificationType;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
};

/**
 * Сповіщення отримувачам: рядок у базі + подія в реалтаймі.
 * Тим, хто заблокував автора дії, сповіщення не надсилається; сам собі — теж.
 */
export async function notify(deps: Deps, recipients: string[], input: NotifyInput, db: DbOrTx = deps.db) {
  let ids = [...new Set(recipients)].filter((id) => id !== input.actorId);
  if (ids.length === 0) return;
  if (input.actorId) {
    const blocked = await db
      .select({ a: userBlocks.blockerId, b: userBlocks.blockedId })
      .from(userBlocks)
      .where(
        or(
          and(inArray(userBlocks.blockerId, ids), eq(userBlocks.blockedId, input.actorId)),
          and(eq(userBlocks.blockerId, input.actorId), inArray(userBlocks.blockedId, ids)),
        ),
      );
    const skip = new Set(blocked.flatMap((r) => [r.a, r.b]));
    ids = ids.filter((id) => !skip.has(id));
    if (ids.length === 0) return;
  }
  const rows = await db
    .insert(notifications)
    .values(
      ids.map((userId) => ({
        userId,
        type: input.type,
        actorId: input.actorId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        data: input.data ?? {},
      })),
    )
    .returning();
  const actors = await loadUserRefs(db, [input.actorId]);
  for (const row of rows) {
    const notification: Notification = {
      id: row.id,
      type: row.type as NotificationType,
      actor: row.actorId ? (actors.get(row.actorId) ?? null) : null,
      entityType: row.entityType,
      entityId: row.entityId,
      data: row.data,
      createdAt: iso(row.createdAt),
      read: false,
    };
    deps.realtime.publish(row.userId, { type: "notification", notification });
  }
}

/** Чи заблокував хтось із двох іншого. */
export async function isBlockedBetween(db: DbOrTx, a: string, b: string) {
  const rows = await db
    .select({ x: userBlocks.blockerId })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
        and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
