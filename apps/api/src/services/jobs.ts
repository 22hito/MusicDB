/**
 * Фонові задачі: постановка в чергу (таблиця jobs) і воркер, що їх виконує.
 * Воркер може жити в процесі API (за замовчуванням у розробці) або окремим процесом (src/worker.ts).
 */
import { type Database, type DbOrTx, jobs } from "@musicdb/db";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Logger } from "pino";

export type JobMap = {
  /** reprocess — перерахувати гучність/хвилю для файлу, що вже грає (перенесені з v1). */
  "audio.process": { assetId: string; reprocess?: boolean };
  "notify.new_track": { trackId: string };
};
export type QueueName = keyof JobMap;

export interface Jobs {
  enqueue<Q extends QueueName>(
    queue: Q,
    payload: JobMap[Q],
    opts?: { delayMs?: number; db?: DbOrTx },
  ): Promise<void>;
}

export class PgJobs implements Jobs {
  constructor(private db: Database) {}

  async enqueue<Q extends QueueName>(
    queue: Q,
    payload: JobMap[Q],
    opts: { delayMs?: number; db?: DbOrTx } = {},
  ) {
    await (opts.db ?? this.db).insert(jobs).values({
      queue,
      payload,
      runAt: new Date(Date.now() + (opts.delayMs ?? 0)),
    });
  }
}

/** Для тестів: запам'ятовує задачі, виконати їх можна вручну. */
export class RecordingJobs implements Jobs {
  queued: { queue: QueueName; payload: unknown }[] = [];
  async enqueue<Q extends QueueName>(queue: Q, payload: JobMap[Q]) {
    this.queued.push({ queue, payload });
  }
}

export type JobHandlers = { [Q in QueueName]: (payload: JobMap[Q]) => Promise<void> };

type JobRow = {
  id: number;
  queue: QueueName;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export class Worker {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private db: Database,
    private handlers: JobHandlers,
    private log: Logger,
    private opts: { pollMs?: number; concurrency?: number } = {},
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    void this.recoverStale();
    this.loop();
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
  }

  private loop() {
    if (!this.running) return;
    void this.tick()
      .catch((err) => this.log.error({ err }, "worker tick failed"))
      .finally(() => {
        if (this.running) this.timer = setTimeout(() => this.loop(), this.opts.pollMs ?? 2000);
      });
  }

  /** Задачі, що «зависли» в running (процес упав), повертаються в чергу. */
  private async recoverStale() {
    await this.db
      .update(jobs)
      .set({ status: "queued", lockedAt: null })
      .where(and(eq(jobs.status, "running"), lt(jobs.lockedAt, new Date(Date.now() - 15 * 60_000))));
  }

  async tick() {
    const concurrency = this.opts.concurrency ?? 2;
    for (let i = 0; i < concurrency * 4; i++) {
      const job = await this.claim();
      if (!job) return;
      await this.run(job);
    }
  }

  private async claim(): Promise<JobRow | null> {
    const res = await this.db.execute(sql`
      update ${jobs} set status = 'running', locked_at = now(), attempts = attempts + 1
      where id = (
        select id from ${jobs} where status = 'queued' and run_at <= now()
        order by run_at for update skip locked limit 1
      )
      returning id, queue, payload, attempts, max_attempts`);
    const rows = Array.isArray(res) ? res : ((res as { rows?: JobRow[] }).rows ?? []);
    return (rows[0] as JobRow | undefined) ?? null;
  }

  private async run(job: JobRow) {
    const handler = this.handlers[job.queue] as ((p: unknown) => Promise<void>) | undefined;
    const started = Date.now();
    try {
      if (!handler) throw new Error(`Немає обробника для черги ${job.queue}`);
      await handler(job.payload);
      await this.db
        .update(jobs)
        .set({ status: "done", finishedAt: new Date(), lastError: null })
        .where(eq(jobs.id, job.id));
      this.log.info({ job: job.id, queue: job.queue, ms: Date.now() - started }, "job done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const final = job.attempts >= job.max_attempts;
      const backoff = Math.min(60 * 60_000, 2 ** job.attempts * 15_000);
      await this.db
        .update(jobs)
        .set({
          status: final ? "failed" : "queued",
          lockedAt: null,
          lastError: message.slice(0, 2000),
          runAt: new Date(Date.now() + backoff),
          ...(final ? { finishedAt: new Date() } : {}),
        })
        .where(eq(jobs.id, job.id));
      this.log.warn(
        { job: job.id, queue: job.queue, attempt: job.attempts, final, err: message },
        "job failed",
      );
    }
  }
}
