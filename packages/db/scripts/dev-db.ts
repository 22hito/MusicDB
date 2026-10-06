/**
 * Локальний PostgreSQL для розробки без Docker і встановлення: бінарники приходять npm-пакетом.
 * Дані — у <repo>/.data/postgres, порт 54329 (не заважає системному Postgres, якщо він є).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const root = resolve(import.meta.dirname, "../../..");
const dataDir = resolve(root, ".data/postgres");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const databases = ["musicdb", "musicdb_test"];

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  // Без цього initdb на Windows бере кодування системної локалі (WIN1251) — кирилиця й емодзі ламаються.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

if (!existsSync(resolve(dataDir, "PG_VERSION"))) {
  console.log("Ініціалізація кластера в", dataDir);
  await pg.initialise();
}
await pg.start();

const admin = postgres({
  host: "127.0.0.1",
  port,
  user: "postgres",
  password: "postgres",
  database: "postgres",
});
for (const name of databases) {
  const [row] = await admin`select 1 as ok from pg_database where datname = ${name}`;
  if (!row) {
    await admin.unsafe(`create database ${name}`);
    console.log("Створено базу", name);
  }
}
await admin.end();

console.log(`PostgreSQL працює: postgres://postgres:postgres@127.0.0.1:${port}/musicdb  (Ctrl+C — зупинити)`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
