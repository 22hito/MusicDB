/**
 * HTTP для звірки: окремий ліміт швидкості на кожне джерело (поважаємо правила API), повтори з паузою
 * на 429/5xx і кеш відповідей на диску — повторний запуск не ходить у мережу вдруге.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const USER_AGENT = "NOwl-catalog-check/2.0 (+https://github.com/22hito/MusicDB)";
const CACHE_DIR = join(import.meta.dirname, "..", ".cache");

/** Мінімальний інтервал між запитами до джерела, мс. */
const INTERVAL: Record<string, number> = {
  deezer: 120, // офіційно 50 запитів / 5 с
  musicbrainz: 1100, // 1 запит / с
  itunes: 3100, // ≈ 20 запитів / хв
  wikidata: 250,
  wikipedia: 250,
};

const nextAt = new Map<string, number>();

async function slot(source: string) {
  const gap = INTERVAL[source] ?? 500;
  const now = Date.now();
  const at = Math.max(now, nextAt.get(source) ?? 0);
  nextAt.set(source, at + gap);
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

export type FetchStats = Record<string, { network: number; cached: number; errors: number }>;
export const stats: FetchStats = {};
const bump = (source: string, key: "network" | "cached" | "errors") => {
  stats[source] ??= { network: 0, cached: 0, errors: 0 };
  stats[source][key]++;
};

/**
 * JSON з джерела. `null` — 404 або порожня відповідь; помилки мережі після повторів кидаються далі.
 * Кешуються і порожні відповіді (щоб не перепитувати «нічого не знайдено»).
 */
export async function getJson<T>(source: string, url: string): Promise<T | null> {
  const key = createHash("sha1").update(url).digest("hex");
  const file = join(CACHE_DIR, source, `${key.slice(0, 2)}`, `${key}.json`);
  try {
    const cached = JSON.parse(await readFile(file, "utf8")) as { body: T | null };
    bump(source, "cached");
    return cached.body;
  } catch {
    // немає в кеші
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    await slot(source);
    let res: Response;
    try {
      res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" } });
    } catch {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (res.status === 429 || res.status === 503 || res.status >= 500) {
      const retry = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
      await new Promise((r) => setTimeout(r, retry * 1000));
      continue;
    }
    bump(source, "network");
    let body: T | null = null;
    if (res.ok) {
      const text = await res.text();
      body = text ? (JSON.parse(text) as T) : null;
      // Deezer повертає помилки зі статусом 200: {"error": {...}}; квота — повторюємо.
      const err = (body as { error?: { code?: number } } | null)?.error;
      if (source === "deezer" && err) {
        if (err.code === 4) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        body = null;
      }
    } else if (res.status !== 404 && res.status !== 400) {
      bump(source, "errors");
      continue;
    }
    await mkdir(join(CACHE_DIR, source, key.slice(0, 2)), { recursive: true });
    await writeFile(file, JSON.stringify({ url, body }));
    return body;
  }
  bump(source, "errors");
  throw new Error(`${source}: не вдалося отримати ${url}`);
}
