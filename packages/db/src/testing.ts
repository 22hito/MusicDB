/**
 * Справжній PostgreSQL у пам'яті процесу (PGlite) для тестів: без сервера, з тими самими міграціями,
 * що й на проді — тести перевіряють реальні SQL-обмеження, індекси й повнотекстовий пошук.
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "./client";
import { migrationsFolder } from "./migrate";
import * as schema from "./schema/index";

export async function createTestDb(): Promise<{ db: Database; client: PGlite; close: () => Promise<void> }> {
  const client = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db: db as unknown as Database, client, close: () => client.close() };
}
