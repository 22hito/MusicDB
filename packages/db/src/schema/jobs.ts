/**
 * Черга фонових задач у Postgres: воркер бере задачу через FOR UPDATE SKIP LOCKED,
 * повторює з експоненційною затримкою, зберігає останню помилку. Без Redis.
 */
import { bigint, index, integer, jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, ts } from "./_columns";

export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

export const jobs = pgTable(
  "jobs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    queue: text("queue").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: ts("run_at").notNull().defaultNow(),
    lockedAt: ts("locked_at"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("jobs_pick_idx").on(t.status, t.runAt), index("jobs_queue_idx").on(t.queue, t.status)],
);
