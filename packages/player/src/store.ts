/**
 * Стан плеєра без прив'язки до платформи (zustand/vanilla). Звук відтворюють «рушії» застосунку
 * (HTMLAudio/YouTube на сайті, expo-audio/YouTube у застосунку) — вони підписуються на `current`
 * і повідомляють сюди час, кінець треку й помилки.
 *
 * Черга як у Spotify: контекст (альбом, плейлист…) + пріоритетна черга «Далі в черзі»,
 * яка грає раніше за продовження контексту.
 */
import type { PlayContext, Track } from "@musicdb/contracts";
import { createStore } from "zustand/vanilla";

export type RepeatMode = "off" | "all" | "one";
export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type QueueOrigin = "context" | "user" | "radio";

export type QueueItem = { uid: string; track: Track; origin: QueueOrigin };
export type ContextInfo = PlayContext & { name?: string };

export type PlayerState = {
  context: ContextInfo | null;
  /** Порядок відтворення контексту (з урахуванням перемішування). */
  items: QueueItem[];
  /** Порядок до перемішування — щоб повернути при вимкненні. */
  original: QueueItem[] | null;
  /** Позиція останнього зіграного треку контексту. */
  index: number;
  priority: QueueItem[];
  current: QueueItem | null;
  shuffle: boolean;
  repeat: RepeatMode;
  status: PlaybackStatus;
  positionMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  autoplay: boolean;
  /** Вирівнювання гучності треків (EBU R128). */
  normalize: boolean;
  error: string | null;
  /** Лічильник «перезапусків» — рушій бачить, що той самий трек треба почати знову. */
  restartToken: number;
  /** Запит на перемотування для рушія (null — немає). */
  seekRequest: { ms: number; token: number } | null;
  radioLoading: boolean;
  /** Таймер сну: пауза в момент endsAt або наприкінці поточного треку. */
  sleep: SleepTimer;
};

export type SleepTimer = { mode: "time"; endsAt: number } | { mode: "track" } | null;

export type PlayerActions = {
  playContext(
    tracks: Track[],
    startIndex?: number,
    context?: ContextInfo | null,
    opts?: { shuffle?: boolean },
  ): void;
  playTrack(track: Track, context?: ContextInfo | null): void;
  playNext(tracks: Track[]): void;
  addToQueue(tracks: Track[]): void;
  removeFromQueue(uid: string): void;
  clearPriority(): void;
  moveInQueue(uid: string, toIndex: number): void;
  jumpTo(uid: string): void;
  next(opts?: { auto?: boolean }): void;
  previous(): void;
  togglePlay(): void;
  play(): void;
  pause(): void;
  seek(ms: number): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  setVolume(v: number): void;
  toggleMute(): void;
  setAutoplay(v: boolean): void;
  setNormalize(v: boolean): void;
  /** Таймер сну: хвилини, «до кінця пісні» або null — вимкнути. */
  setSleepTimer(value: number | "track" | null): void;
  // Події від рушія
  onLoaded(durationMs: number): void;
  onPlaying(): void;
  onPaused(): void;
  onTime(positionMs: number, durationMs?: number): void;
  onEnded(): void;
  onError(message: string): void;
  /** Майбутні треки для відображення черги. */
  upcoming(limit?: number): QueueItem[];
};

export type PlayerStore = ReturnType<typeof createPlayerStore>;

export type PlayerDeps = {
  /** Зарахувати прослуховування (сервер сам вирішує, чи достатньо). */
  report?: (trackId: string, msPlayed: number, context: ContextInfo | null) => void;
  /** Схожі треки, коли черга закінчилась і ввімкнено автопродовження. */
  fetchRadio?: (seed: Track, exclude: string[]) => Promise<Track[]>;
  /** Чи можна відтворити трек (без файлу й відео — пропускаємо). */
  isPlayable?: (track: Track) => boolean;
  random?: () => number;
  /** Поточний час (для тестів таймера сну). */
  now?: () => number;
};

// Таймер є і в браузері, і в React Native, і в Node — оголошуємо без DOM-типів.
declare function setTimeout(cb: () => void, ms: number): unknown;

let uidCounter = 0;
const makeUid = () => `q${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
const wrap = (tracks: Track[], origin: QueueOrigin): QueueItem[] =>
  tracks.map((track) => ({ uid: makeUid(), track, origin }));

/** Можна відтворити: є файл, збережене відео або сервер знайде відео на YouTube. */
export const defaultIsPlayable = (t: Track) =>
  t.playback.audio || !!t.playback.youtubeVideoId || t.playback.resolvable;

export function shuffleKeepingFirst<T>(items: T[], first: number, random: () => number): T[] {
  const head = first >= 0 && first < items.length ? [items[first]!] : [];
  const rest = items.filter((_, i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return [...head, ...rest];
}

export function createPlayerStore(deps: PlayerDeps = {}) {
  const random = deps.random ?? Math.random;
  const playable = deps.isPlayable ?? defaultIsPlayable;
  const now = deps.now ?? Date.now;
  let sleepToken = 0;
  let listened = 0;
  let lastPosition = 0;

  const store = createStore<PlayerState & PlayerActions>()((set, get) => {
    /** Звітує про прослуховування попереднього треку перед зміною. */
    const flushReport = () => {
      const { current, context } = get();
      if (current && listened > 0) deps.report?.(current.track.id, Math.round(listened), context);
      listened = 0;
      lastPosition = 0;
    };

    const startItem = (item: QueueItem | null, patch: Partial<PlayerState> = {}) => {
      flushReport();
      set({
        ...patch,
        current: item,
        status: item ? "loading" : "idle",
        positionMs: 0,
        durationMs: item?.track.durationMs ?? 0,
        error: null,
        restartToken: get().restartToken + 1,
        seekRequest: null,
      });
    };

    const firstPlayableFrom = (items: QueueItem[], from: number, step: 1 | -1) => {
      for (let i = from; i >= 0 && i < items.length; i += step) if (playable(items[i]!.track)) return i;
      return -1;
    };

    const loadRadio = async () => {
      const { current, items, priority } = get();
      if (!deps.fetchRadio || !current || get().radioLoading) return false;
      set({ radioLoading: true });
      try {
        const exclude = [...new Set([...items, ...priority, current].map((i) => i.track.id))];
        const tracks = (await deps.fetchRadio(current.track, exclude)).filter(playable);
        if (tracks.length === 0) return false;
        const radio = wrap(tracks, "radio");
        set((s) => ({
          items: [...s.items, ...radio],
          ...(s.original ? { original: [...s.original, ...radio] } : {}),
        }));
        return true;
      } catch {
        return false;
      } finally {
        set({ radioLoading: false });
      }
    };

    return {
      context: null,
      items: [],
      original: null,
      index: -1,
      priority: [],
      current: null,
      shuffle: false,
      repeat: "off",
      status: "idle",
      positionMs: 0,
      durationMs: 0,
      volume: 0.8,
      muted: false,
      autoplay: true,
      normalize: true,
      error: null,
      restartToken: 0,
      seekRequest: null,
      radioLoading: false,
      sleep: null,

      playContext(tracks, startIndex = 0, context = null, opts = {}) {
        const all = wrap(tracks, "context");
        const shuffle = opts.shuffle ?? get().shuffle;
        let start = Math.min(Math.max(startIndex, 0), Math.max(all.length - 1, 0));
        if (opts.shuffle && startIndex === 0) start = Math.floor(random() * all.length);
        if (!playable(all[start]?.track ?? ({ playback: { audio: false, youtubeVideoId: null } } as Track))) {
          start = firstPlayableFrom(all, start, 1);
          if (start < 0) start = firstPlayableFrom(all, 0, 1);
        }
        if (start < 0) return;
        const items = shuffle ? shuffleKeepingFirst(all, start, random) : all;
        const index = shuffle ? 0 : start;
        startItem(items[index]!, { items, original: shuffle ? all : null, index, context, shuffle });
      },

      playTrack(track, context = null) {
        get().playContext([track], 0, context, { shuffle: false });
      },

      playNext(tracks) {
        set((s) => ({ priority: [...wrap(tracks, "user"), ...s.priority] }));
        if (!get().current) get().next();
      },

      addToQueue(tracks) {
        set((s) => ({ priority: [...s.priority, ...wrap(tracks, "user")] }));
        if (!get().current) get().next();
      },

      removeFromQueue(uid) {
        set((s) => {
          const inPriority = s.priority.some((i) => i.uid === uid);
          if (inPriority) return { priority: s.priority.filter((i) => i.uid !== uid) };
          const pos = s.items.findIndex((i) => i.uid === uid);
          if (pos <= s.index) return {};
          return {
            items: s.items.filter((i) => i.uid !== uid),
            ...(s.original ? { original: s.original.filter((i) => i.uid !== uid) } : {}),
          };
        });
      },

      clearPriority() {
        set({ priority: [] });
      },

      moveInQueue(uid, toIndex) {
        const upcoming = get().upcoming(Number.POSITIVE_INFINITY);
        const from = upcoming.findIndex((i) => i.uid === uid);
        if (from < 0) return;
        const reordered = [...upcoming];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(Math.max(0, Math.min(toIndex, reordered.length)), 0, moved!);
        // Усе, що опинилось перед першим елементом контексту, стає пріоритетною чергою.
        const { items, index } = get();
        const contextIds = new Set(items.slice(index + 1).map((i) => i.uid));
        const firstContext = reordered.findIndex((i) => contextIds.has(i.uid) && i.uid !== uid);
        const cut = firstContext < 0 ? reordered.length : firstContext;
        const priority = reordered.slice(0, cut);
        const restContext = reordered.slice(cut);
        set({ priority, items: [...items.slice(0, index + 1), ...restContext] });
      },

      jumpTo(uid) {
        const s = get();
        const pIndex = s.priority.findIndex((i) => i.uid === uid);
        if (pIndex >= 0) {
          startItem(s.priority[pIndex]!, { priority: s.priority.slice(pIndex + 1) });
          return;
        }
        const cIndex = s.items.findIndex((i) => i.uid === uid);
        if (cIndex >= 0) startItem(s.items[cIndex]!, { index: cIndex });
      },

      next(opts = {}) {
        const s = get();
        if (opts.auto && s.repeat === "one" && s.current) {
          flushReport();
          set({ positionMs: 0, status: "loading", restartToken: s.restartToken + 1 });
          return;
        }
        if (s.priority.length) {
          const [head, ...rest] = s.priority;
          startItem(head!, { priority: rest });
          return;
        }
        let nextIndex = firstPlayableFrom(s.items, s.index + 1, 1);
        if (nextIndex < 0 && s.repeat === "all" && s.items.length)
          nextIndex = firstPlayableFrom(s.items, 0, 1);
        if (nextIndex >= 0) {
          startItem(s.items[nextIndex]!, { index: nextIndex });
          return;
        }
        if (s.autoplay && s.current) {
          void loadRadio().then((ok) => {
            if (ok) get().next();
            else if (opts.auto) {
              flushReport();
              set({ status: "paused", positionMs: 0, seekRequest: { ms: 0, token: Date.now() } });
            }
          });
          return;
        }
        if (opts.auto) {
          flushReport();
          set({ status: "paused", positionMs: 0, seekRequest: { ms: 0, token: Date.now() } });
        }
      },

      previous() {
        const s = get();
        if (s.positionMs > 3000 || !s.current) {
          get().seek(0);
          return;
        }
        const prev = firstPlayableFrom(s.items, s.index - 1, -1);
        if (prev >= 0 && s.current.origin !== "user") startItem(s.items[prev]!, { index: prev });
        else if (s.current.origin === "user" && s.index >= 0) startItem(s.items[s.index]!, {});
        else get().seek(0);
      },

      togglePlay() {
        const { status, current } = get();
        if (!current) return;
        if (status === "playing" || status === "loading") get().pause();
        else get().play();
      },

      play() {
        if (!get().current) return;
        set({ status: get().status === "idle" ? "loading" : "playing" });
      },

      pause() {
        if (get().current) set({ status: "paused" });
      },

      seek(ms) {
        const clamped = Math.max(0, Math.min(ms, get().durationMs || ms));
        lastPosition = clamped;
        set({ positionMs: clamped, seekRequest: { ms: clamped, token: Date.now() + Math.random() } });
      },

      toggleShuffle() {
        const s = get();
        if (!s.shuffle) {
          const original = s.items;
          const shuffled = shuffleKeepingFirst(original, s.index, random);
          set({ shuffle: true, original, items: shuffled, index: s.index >= 0 ? 0 : -1 });
        } else {
          const original = s.original ?? s.items;
          const currentUid = s.items[s.index]?.uid;
          const index = currentUid ? original.findIndex((i) => i.uid === currentUid) : -1;
          set({ shuffle: false, items: original, original: null, index });
        }
      },

      cycleRepeat() {
        const order: RepeatMode[] = ["off", "all", "one"];
        set((s) => ({ repeat: order[(order.indexOf(s.repeat) + 1) % order.length]! }));
      },

      setVolume(v) {
        set({ volume: Math.max(0, Math.min(1, v)), muted: v <= 0 });
      },

      toggleMute() {
        set((s) => ({ muted: !s.muted }));
      },

      setAutoplay(v) {
        set({ autoplay: v });
      },

      setNormalize(v) {
        set({ normalize: v });
      },

      onLoaded(durationMs) {
        if (durationMs > 0) set({ durationMs });
      },

      onPlaying() {
        set({ status: "playing", error: null });
      },

      onPaused() {
        if (get().status === "playing") set({ status: "paused" });
      },

      onTime(positionMs, durationMs) {
        const delta = positionMs - lastPosition;
        // Перемотування (стрибок) не рахується як прослуховування.
        if (get().status === "playing" && delta > 0 && delta < 2500) listened += delta;
        lastPosition = positionMs;
        set({ positionMs, ...(durationMs && durationMs > 0 ? { durationMs } : {}) });
      },

      onEnded() {
        // «До кінця пісні»: зупиняємось, не переходячи далі.
        if (get().sleep?.mode === "track") {
          flushReport();
          sleepToken++;
          set({ sleep: null, status: "paused", positionMs: 0, seekRequest: { ms: 0, token: now() } });
          return;
        }
        get().next({ auto: true });
      },

      setSleepTimer(value) {
        const token = ++sleepToken;
        if (value === null) return set({ sleep: null });
        if (value === "track") return set({ sleep: { mode: "track" } });
        const ms = Math.max(1, value) * 60_000;
        set({ sleep: { mode: "time", endsAt: now() + ms } });
        setTimeout(() => {
          if (token !== sleepToken) return;
          set({ sleep: null });
          get().pause();
        }, ms);
      },

      onError(message) {
        set({ status: "error", error: message });
        // Неграбельний трек — переходимо далі, як роблять стрімінгові сервіси.
        setTimeout(() => {
          if (get().status === "error") get().next({ auto: true });
        }, 1200);
      },

      upcoming(limit = 50) {
        const s = get();
        const rest = s.items.slice(s.index + 1);
        return [...s.priority, ...rest].slice(0, limit);
      },
    };
  });

  return store;
}
