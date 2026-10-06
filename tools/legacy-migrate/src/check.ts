/**
 * Перевірка підключення до старої бази v1 (LEGACY_DATABASE_URL) без перенесення:
 * хост/порт/база/параметри (без пароля), версія сервера, схеми й кількість таблиць.
 */
import postgres from "postgres";

const url = process.env.LEGACY_DATABASE_URL;
if (!url) throw new Error("Потрібен LEGACY_DATABASE_URL");
const u = new URL(url);
console.log(
  `хост: ${u.hostname} | порт: ${u.port || 5432} | база: ${u.pathname.slice(1)} | користувач: ${decodeURIComponent(u.username)} | параметри: ${[...u.searchParams.keys()].join(", ") || "—"}`,
);

for (let attempt = 1; attempt <= 3; attempt++) {
  const sql = postgres(url, { max: 1, connect_timeout: 20, prepare: false, ssl: "require" });
  try {
    const info = await sql<{ db: string; ver: string }[]>`
      select current_database() as db, split_part(version(), ' ', 2) as ver`;
    console.log(`підключено (спроба ${attempt}): база ${info[0]?.db}, PostgreSQL ${info[0]?.ver}`);
    const schemas = await sql<{ table_schema: string; tables: number }[]>`
      select table_schema, count(*)::int as tables from information_schema.tables
      where table_schema not in ('pg_catalog', 'information_schema') group by 1 order by 2 desc`;
    console.log("схеми:", schemas.map((s) => `${s.table_schema} (${s.tables} табл.)`).join(", "));
    if (!schemas.some((s) => s.table_schema === "lab")) {
      console.log("УВАГА: схеми lab немає — це не стара база v1. Перевірте адресу (v1 — ep-lucky-fire…).");
      await sql.end();
      process.exit(2);
    }
    await sql.end();
    process.exit(0);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.log(`спроба ${attempt}: ${e.code ?? ""} ${e.message ?? String(err)}`);
    await sql.end({ timeout: 1 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 3000));
  }
}
process.exit(1);
