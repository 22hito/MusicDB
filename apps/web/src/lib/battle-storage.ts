"use client";
/**
 * Збереження батлу в браузері (лише для цього глядача): незавершений турнір — початковий порядок і вибори,
 * щоб продовжити після оновлення сторінки; «Мої переможці» — кілька останніх чемпіонів.
 */
import type { Track } from "@musicdb/contracts/client";

const BATTLE_KEY = "nowl-battle-v2";
const WINNERS_KEY = "nowl-battle-winners";
const CHORUS_KEY = "nowl-battle-chorus";

export type SavedBattle = { title: string; initial: Track[]; choices: (0 | 1)[]; savedAt: number };
export type BattleWinner = {
  id: string;
  title: string;
  artists: string;
  cover: string | null;
  pool: string;
  size: number;
  at: number;
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // приватний режим або переповнене сховище — турнір просто не збережеться
  }
}

export const loadBattle = () => {
  const b = read<SavedBattle>(BATTLE_KEY);
  return b && Array.isArray(b.initial) && b.initial.length >= 4 && Array.isArray(b.choices) ? b : null;
};
export const saveBattle = (b: SavedBattle | null) => write(BATTLE_KEY, b);

export const loadWinners = () => read<BattleWinner[]>(WINNERS_KEY) ?? [];
export function addWinner(track: Track, pool: string, size: number) {
  const entry: BattleWinner = {
    id: track.id,
    title: track.title,
    artists: track.artists.map((a) => a.name).join(", "),
    cover: track.release?.coverUrl ?? null,
    pool,
    size,
    at: Date.now(),
  };
  write(WINNERS_KEY, [entry, ...loadWinners()].slice(0, 12));
}

export const loadChorus = () => read<boolean>(CHORUS_KEY) ?? false;
export const saveChorus = (v: boolean) => write(CHORUS_KEY, v);
