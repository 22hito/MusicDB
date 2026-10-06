import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./client";

/** У зібраному образі міграції лежать поруч із бандлом — шлях задається MIGRATIONS_DIR. */
export const migrationsFolder = process.env.MIGRATIONS_DIR ?? resolve(import.meta.dirname, "../drizzle");

export async function runMigrations(db: Database) {
  // biome-ignore lint/suspicious/noExplicitAny: мігратор postgres-js приймає власний тип бази
  await migrate(db as any, { migrationsFolder });
}
