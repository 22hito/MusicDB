/**
 * Перенесення v1 → v2.
 *
 *   LEGACY_DATABASE_URL=postgres://…  (стара база, схема lab)
 *   DATABASE_URL=postgres://…         (нова, порожня — міграції застосуються автоматично)
 *   pnpm --filter @musicdb/legacy-migrate migrate [--reprocess-audio] [--force]
 *
 * Стара база лише читається. Нова має бути порожньою (перевіряється), інакше потрібен --force.
 */
import { createDb } from "@musicdb/db";
import { runMigrations } from "@musicdb/db/migrate";
import { sql } from "drizzle-orm";
import { migrateLegacy } from "./migrate";

const legacyUrl = process.env.LEGACY_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!legacyUrl || !targetUrl) {
  console.error("Потрібні LEGACY_DATABASE_URL і DATABASE_URL");
  process.exit(1);
}
const args = new Set(process.argv.slice(2));

const legacy = createDb(legacyUrl, { max: 2 });
const target = createDb(targetUrl, { max: 2 });
try {
  // Захист від запису в стару базу: усі читання — в транзакції лише для читання на рівні сесії.
  await legacy.db.execute(sql`set session characteristics as transaction read only`);
  await runMigrations(target.db);
  const [row] = (await target.db.execute(
    sql`select (select count(*) from users) + (select count(*) from tracks) as n`,
  )) as unknown as {
    n: number;
  }[];
  if (Number(row?.n ?? 0) > 0 && !args.has("--force")) {
    console.error("Нова база не порожня. Перенесення розраховане на порожню базу (або --force).");
    process.exit(1);
  }
  const started = Date.now();
  const report = await migrateLegacy(legacy.db, target.db, {
    reprocessAudio: args.has("--reprocess-audio"),
    log: (m) => console.log(`  · ${m}`),
  });
  console.log(`\nГотово за ${((Date.now() - started) / 1000).toFixed(1)} с`);
  console.table(report);
} finally {
  await legacy.close();
  await target.close();
}
