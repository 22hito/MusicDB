/**
 * API у serverless-середовищі (Vercel): той самий застосунок Hono, але без постійного процесу.
 * Залежності створюються один раз на «теплий» екземпляр функції; черга фонових задач (обробка аудіо,
 * сповіщення) обробляється коротким проходом після відповіді (`drainJobs` через `after()` у Next).
 * WebSocket-реалтайму тут немає — клієнти оновлюються опитуванням.
 */
import { createApp } from "./app";
import { loadEnv } from "./env";
import { createRuntime, jobHandlers } from "./runtime";
import { Worker } from "./services/jobs";

type Runtime = { fetch: (req: Request) => Response | Promise<Response>; worker: Worker };
let runtime: Runtime | null = null;

function getRuntime(): Runtime {
  if (runtime) return runtime;
  const env = loadEnv({
    ...process.env,
    // Невеликий пул: кожен екземпляр функції має свій; Neon pooler (PgBouncer) тримає решту.
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX ?? "3",
  });
  const { deps, log } = createRuntime(env);
  const app = createApp(deps);
  runtime = { fetch: app.fetch, worker: new Worker(deps.db, jobHandlers(deps), log, { concurrency: 1 }) };
  return runtime;
}

export function handleApiRequest(req: Request): Response | Promise<Response> {
  return getRuntime().fetch(req);
}

/** Один короткий прохід черги задач (викликається після відповіді). */
export async function drainJobs(): Promise<void> {
  try {
    await getRuntime().worker.tick();
  } catch {
    // задача лишиться в черзі й повториться наступного разу
  }
}
