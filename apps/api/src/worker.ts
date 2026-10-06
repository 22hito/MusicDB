/** Окремий процес воркера фонових задач (для продакшну з кількома інстансами API). */
import { loadEnv } from "./env";
import { createRuntime, jobHandlers } from "./runtime";
import { Worker } from "./services/jobs";

const env = loadEnv();
const { deps, log, close } = createRuntime(env);
const worker = new Worker(deps.db, jobHandlers(deps), log, { concurrency: 2 });
worker.start();
log.info("worker started");

const shutdown = async () => {
  worker.stop();
  await close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
