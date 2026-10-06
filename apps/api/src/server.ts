import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { runMigrations } from "@musicdb/db/migrate";
import { createApp } from "./app";
import { loadEnv } from "./env";
import { createRuntime, jobHandlers } from "./runtime";
import { Worker } from "./services/jobs";
import type { RealtimeSocket } from "./services/realtime";

const env = loadEnv();
const { deps, realtime, log, close } = createRuntime(env);

if (env.AUTO_MIGRATE) {
  await runMigrations(deps.db);
  log.info("migrations applied");
}

const app = createApp(deps);
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/v1/realtime",
  async (c, next) => (c.get("user") ? next() : c.json({ code: "unauthorized" }, 401)),
  upgradeWebSocket((c) => {
    const user = c.get("user")!;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const socket: RealtimeSocket = { send: () => {}, close: () => {} };
    return {
      onOpen(_evt, ws) {
        socket.send = (data) => ws.send(data);
        socket.close = () => ws.close();
        realtime.connect(user.id, user.role, socket);
        heartbeat = setInterval(() => ws.send(JSON.stringify({ type: "ping" })), 25_000);
      },
      onClose() {
        clearInterval(heartbeat);
        realtime.disconnect(user.id, socket);
      },
    };
  }),
);

const worker = env.WORKER_MODE === "inline" ? new Worker(deps.db, jobHandlers(deps), log) : null;
worker?.start();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info(`N'Owl API: http://localhost:${info.port}  ·  docs: http://localhost:${info.port}/docs`);
});
injectWebSocket(server);

const shutdown = async () => {
  log.info("shutting down");
  worker?.stop();
  server.close();
  await close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
