import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/client";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/musicdb";
const { db, close } = createDb(url, { max: 1 });
const started = Date.now();
// biome-ignore lint/suspicious/noExplicitAny: мігратор postgres-js приймає власний тип бази
await migrate(db as any, { migrationsFolder: resolve(import.meta.dirname, "../drizzle") });
console.log(`Міграції застосовано за ${Date.now() - started} мс`);
await close();
