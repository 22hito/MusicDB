/**
 * Збереження батлу на пристрої: незавершений турнір (початковий порядок і вибори) — щоб продовжити
 * після закриття застосунку; «Мої переможці» — кілька останніх чемпіонів; налаштування «з приспіву».
 */
import type { Track } from "@musicdb/contracts/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  void (
    value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify(value))
  ).catch(() => {});
}

export async function loadBattle() {
  const b = await read<SavedBattle>(BATTLE_KEY);
  return b && Array.isArray(b.initial) && b.initial.length >= 4 && Array.isArray(b.choices) ? b : null;
}
export const saveBattle = (b: SavedBattle | null) => write(BATTLE_KEY, b);

export const loadWinners = async () => (await read<BattleWinner[]>(WINNERS_KEY)) ?? [];
export async function addWinner(track: Track, pool: string, size: number) {
  const entry: BattleWinner = {
    id: track.id,
    title: track.title,
    artists: track.artists.map((a) => a.name).join(", "),
    cover: track.release?.coverUrl ?? null,
    pool,
    size,
    at: Date.now(),
  };
  write(WINNERS_KEY, [entry, ...(await loadWinners())].slice(0, 12));
}

export const loadChorus = async () => (await read<boolean>(CHORUS_KEY)) ?? false;
export const saveChorus = (v: boolean) => write(CHORUS_KEY, v);
