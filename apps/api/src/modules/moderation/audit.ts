import { auditLog, type DbOrTx } from "@musicdb/db";

export async function audit(
  db: DbOrTx,
  entry: {
    actorId: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    label?: string;
    data?: Record<string, unknown>;
  },
) {
  await db.insert(auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    label: entry.label ?? null,
    data: entry.data ?? null,
  });
}
