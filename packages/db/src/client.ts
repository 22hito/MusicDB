import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type Schema = typeof schema;
/** Спільний тип для postgres.js (робота) і PGlite (тести). */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;
export type Transaction = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type DbOrTx = Database | Transaction;

export type DbHandle = { db: Database; close: () => Promise<void> };

export function createDb(url: string, options: { max?: number } = {}): DbHandle {
  const client = postgres(url, {
    max: options.max ?? 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !url.includes("pooler"),
    onnotice: () => {},
  });
  const db = drizzle(client, { schema }) as unknown as Database;
  return { db, close: () => client.end({ timeout: 5 }) };
}
