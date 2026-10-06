/**
 * Турнір «Батл рояль» на вибування — чиста логіка без платформи (сайт і застосунок).
 * Стан — лише початковий порядок пісень і послідовність виборів (0 — ліва, 1 — права): з них однозначно
 * відновлюються поточна пара, раунд, шлях переможця й п'єдестал. Тому «крок назад» — це просто прибрати
 * останній вибір, а незавершений турнір легко зберегти й продовжити навіть на 1024 пісні.
 */

export const TOURNAMENT_SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024] as const;

export type Match<T> = { size: number; winner: T; loser: T };

export type TournamentState<T> = {
  size: number;
  rounds: number;
  /** Поточний раунд (усі учасники) і номер пари в ньому. */
  round: T[];
  match: number;
  pair: [T, T] | null;
  /** Зіграно матчів із size − 1. */
  played: number;
  steps: Match<T>[];
  champion: T | null;
};

export function replayTournament<T>(initial: T[], choices: readonly (0 | 1)[]): TournamentState<T> {
  const size = initial.length;
  let round = initial;
  let winners: T[] = [];
  let match = 0;
  const steps: Match<T>[] = [];
  let champion: T | null = null;
  for (const side of choices) {
    const a = round[match * 2];
    const b = round[match * 2 + 1];
    if (a === undefined || b === undefined) break;
    const winner = side ? b : a;
    steps.push({ size: round.length, winner, loser: side ? a : b });
    winners.push(winner);
    match++;
    if (match * 2 >= round.length) {
      if (winners.length === 1) {
        champion = winner;
        break;
      }
      round = winners;
      winners = [];
      match = 0;
    }
  }
  const a = round[match * 2];
  const b = round[match * 2 + 1];
  return {
    size,
    rounds: Math.round(Math.log2(size)),
    round,
    match,
    pair: !champion && a !== undefined && b !== undefined ? [a, b] : null,
    played: steps.length,
    steps,
    champion,
  };
}

/** Шлях переможця: кого він переміг у кожному раунді. */
export function championPath<T>(state: TournamentState<T>): Match<T>[] {
  return state.champion ? state.steps.filter((m) => m.winner === state.champion) : [];
}

/** П'єдестал: фіналіст і обидва півфіналісти (третє місце ділять). */
export function podium<T>(state: TournamentState<T>): { first: T | null; second: T | null; third: T[] } {
  return {
    first: state.champion,
    second: state.steps.find((m) => m.size === 2)?.loser ?? null,
    third: state.steps.filter((m) => m.size === 4).map((m) => m.loser),
  };
}

/**
 * Рейтинг усіх учасників: переможець, далі — за раундом вибування (пізніше вибув — вище),
 * всередині раунду — за порядком матчів.
 */
export function tournamentRanking<T>(state: TournamentState<T>): T[] {
  if (!state.champion) return [];
  const losers = [...state.steps].sort((x, y) => x.size - y.size).map((m) => m.loser);
  return [state.champion, ...losers];
}

/**
 * Ключ турніру — хеш початкового порядку й виборів. Однаковий для того самого турніру (оновили сторінку,
 * повторили запит), тож сервер зараховує перемогу пісні лише раз.
 */
export function tournamentKey(initialIds: readonly string[], choices: readonly (0 | 1)[]): string {
  const str = `${initialIds.join(",")}|${choices.join("")}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  return `${(h1 >>> 0).toString(36).padStart(7, "0")}${(h2 >>> 0).toString(36).padStart(7, "0")}`;
}
