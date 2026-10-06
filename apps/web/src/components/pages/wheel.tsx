"use client";
/**
 * Колесо фортуни: випадковий жанр → готовий перемішаний плейлист цього жанру.
 *
 * Звичайний режим: жанр, на якому зупинилось колесо, — переможець. Режим «на вибування»: жанр, на якому
 * зупинилось колесо, вибуває й зникає з колеса; гра триває, доки не лишиться один — він і переможець,
 * і лише тоді з'являється плейлист. Під час обертання (і посеред гри на вибування) склад колеса змінювати
 * не можна; на колесі щонайменше 2 жанри. Обертання рахується в JS — працює і зі «зменшеними анімаціями».
 */
import { endpoints, type Genre, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { wheelColor } from "@musicdb/tokens";
import { Check, ListMusic, Play, Plus, RotateCcw, Search, Swords, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArtistLinks } from "@/components/music/common";
import { SavePlaylistDialog } from "@/components/music/save-playlist";
import { OwlGlyph } from "@/components/shell/logo";
import { Button, IconButton } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { Cover } from "@/components/ui/cover";
import { Dialog } from "@/components/ui/dialog";
import { PageTitle, Segmented } from "@/components/ui/heading";
import { NumStepper } from "@/components/ui/stepper";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";

const MIN_SONGS = 5;
const MIN_ON_WHEEL = 2;
const STORE_KEY = "nowl-wheel";
const BULBS = 24;

type Settings = {
  mode: "random" | "custom";
  count: number;
  secMin: number;
  secMax: number;
  custom: string[];
  sound: boolean;
  eliminate: boolean;
};
const defaults: Settings = {
  mode: "random",
  count: 10,
  secMin: 3,
  secMax: 6,
  custom: [],
  sound: true,
  eliminate: false,
};

function loadSettings(): Settings {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    return defaults;
  }
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Крива cubic-bezier (як у CSS) — довге плавне гальмування колеса. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (p: number) => {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (x(t) - p) / d;
    }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const spinEase = bezier(0.12, 0.72, 0.2, 1);

/** Звук язичка й перемоги — короткі синтезовані клацання (WebAudio, без файлів). */
function useWheelSound(enabled: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);
  const blip = useCallback(
    (freq: number, at: number, dur: number, vol: number, type: OscillatorType = "triangle") => {
      const ac = ctx.current;
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime + at);
      osc.stop(ac.currentTime + at + dur + 0.02);
    },
    [],
  );
  return {
    unlock: () => {
      if (!enabled) return;
      try {
        ctx.current ??= new AudioContext();
        if (ctx.current.state === "suspended") void ctx.current.resume();
      } catch {
        // без звуку
      }
    },
    tick: () => {
      if (!enabled || !ctx.current) return;
      const now = performance.now();
      if (now - lastTick.current < 28) return;
      lastTick.current = now;
      blip(1700, 0, 0.025, 0.05, "square");
    },
    out: () => {
      if (!enabled || !ctx.current) return;
      blip(330, 0, 0.18, 0.06);
      blip(247, 0.12, 0.22, 0.06);
    },
    win: () => {
      if (!enabled || !ctx.current) return;
      for (const [i, f] of [523, 659, 784, 1047].entries()) blip(f, i * 0.09, 0.28, 0.08);
    },
  };
}

/** Розмір квадрата, що вміщається в контейнер (колесо не розтягує сторінку). */
function useFitSquare<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      setSize(Math.floor(Math.min(e.contentRect.width, e.contentRect.height || e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

type Outcome = { genre: Genre; kind: "winner" | "out"; left: number };

export function WheelView() {
  const t = useT();
  const { data } = useEndpoint(endpoints.genres.list);
  const all = useMemo(
    () =>
      (data?.items ?? [])
        .filter((g) => g.trackCount >= MIN_SONGS)
        .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name)),
    [data],
  );
  const [settings, setSettings] = useState<Settings>(defaults);
  useEffect(() => setSettings(loadSettings()), []);

  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  // Гра на вибування: склад колеса на її початку й ті, хто вибув.
  const [roster, setRoster] = useState<Genre[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [winner, setWinner] = useState<{ genre: Genre; seed: string } | null>(null);
  const [history, setHistory] = useState<Genre[]>([]);
  const [tab, setTab] = useState<"genres" | "playlist" | "history">("genres");
  const [picking, setPicking] = useState(false);
  const [confettiKey, setConfettiKey] = useState("");
  const inGame = settings.eliminate && roster !== null && !winner;

  /** Зміна налаштувань — не під час обертання; зміна складу — ще й не посеред гри на вибування. */
  const update = (patch: Partial<Settings>, opts: { composition?: boolean } = {}) => {
    if (spinningRef.current) return;
    if (opts.composition && inGame) return;
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // приватний режим
      }
      return next;
    });
  };

  const order = useMemo(() => shuffled(all), [all]);
  const count = Math.min(Math.max(settings.count, MIN_ON_WHEEL), Math.max(MIN_ON_WHEEL, all.length));
  const base = useMemo(
    () =>
      settings.mode === "custom" ? all.filter((g) => settings.custom.includes(g.id)) : order.slice(0, count),
    [settings.mode, settings.custom, all, order, count],
  );
  const genres = useMemo(
    () => (roster ?? base).filter((g) => !removed.includes(g.id)),
    [roster, base, removed],
  );
  // Колір сектора закріплений за жанром — після вибування решта кольорів не «перескакує».
  const colorOf = useMemo(() => {
    const list = roster ?? base;
    const map = new Map(list.map((g, i) => [g.id, wheelColor(i, list.length)]));
    return (g: Genre) => map.get(g.id) ?? "#777";
  }, [roster, base]);

  const sound = useWheelSound(settings.sound);
  const discRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<SVGSVGElement>(null);
  const angle = useRef(0);
  const raf = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      for (const id of timers.current) clearTimeout(id);
    },
    [],
  );

  const enough = genres.length >= MIN_ON_WHEEL;
  const canSpin = !spinning && !leaving && enough && !(settings.eliminate && winner && roster);

  const flick = () => {
    const pin = pinRef.current;
    if (!pin) return;
    pin.style.transition = "none";
    pin.style.transform = "translateX(-50%) rotate(-24deg)";
    requestAnimationFrame(() => {
      pin.style.transition = "transform 140ms cubic-bezier(.34,1.56,.64,1)";
      pin.style.transform = "translateX(-50%) rotate(0deg)";
    });
  };

  const reset = () => {
    if (spinningRef.current) return;
    setRoster(null);
    setRemoved([]);
    setLeaving(null);
    setOutcome(null);
    setWinner(null);
    setTab("genres");
  };

  const finishWin = (genre: Genre) => {
    setWinner({ genre, seed: Math.random().toString(36).slice(2, 10) });
    setOutcome({ genre, kind: "winner", left: 1 });
    setHistory((h) => [genre, ...h.filter((x) => x.id !== genre.id)].slice(0, 12));
    setConfettiKey(Math.random().toString(36));
    setTab("playlist");
    sound.win();
  };

  const spin = () => {
    if (!canSpin) return;
    sound.unlock();
    const wheel = genres;
    if (settings.eliminate && !roster) setRoster(wheel);
    if (!settings.eliminate) setWinner(null);
    const dur = settings.secMin + Math.random() * (settings.secMax - settings.secMin);
    const n = wheel.length;
    const seg = 360 / n;
    const landed = Math.floor(Math.random() * n);
    const fullSpins = Math.max(4, Math.round(dur * 1.4)) + Math.floor(Math.random() * 2);
    // Не в центр сектора — у випадкову точку всередині (без самого краю): виглядає природніше.
    const target = landed * seg + seg * (0.18 + Math.random() * 0.64);
    const start = angle.current;
    const end = start + fullSpins * 360 + ((((360 - target - start) % 360) + 360) % 360);
    setOutcome(null);
    spinningRef.current = true;
    setSpinning(true);
    const t0 = performance.now();
    let lastSeg = -1;
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / (dur * 1000));
      const a = start + (end - start) * spinEase(p);
      angle.current = a;
      if (discRef.current) discRef.current.style.transform = `rotate(${a}deg)`;
      const under = Math.floor(((((360 - (a % 360)) % 360) + 360) % 360) / seg);
      if (under !== lastSeg) {
        if (lastSeg !== -1) {
          flick();
          sound.tick();
        }
        lastSeg = under;
      }
      if (p < 1) {
        raf.current = requestAnimationFrame(frame);
        return;
      }
      spinningRef.current = false;
      setSpinning(false);
      const genre = wheel[landed]!;
      if (!settings.eliminate) {
        finishWin(genre);
        return;
      }
      // На вибування: жанр підсвічується, потім зникає з колеса; лишився один — переможець.
      const left = n - 1;
      setOutcome({ genre, kind: "out", left });
      setLeaving(genre.id);
      sound.out();
      timers.current.push(
        setTimeout(() => {
          setRemoved((r) => [...r, genre.id]);
          setLeaving(null);
          if (left === 1) {
            const last = wheel.find((g) => g.id !== genre.id)!;
            timers.current.push(setTimeout(() => finishWin(last), 350));
          }
        }, 900),
      );
    };
    raf.current = requestAnimationFrame(frame);
  };

  // Пробіл або Enter — крутити (якщо фокус ні на чому: кнопка «Крутити» сама реагує на пробіл).
  const spinRef = useRef(spin);
  spinRef.current = spin;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if ((tag && tag !== "BODY") || picking) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        spinRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking]);

  const [stageRef, size] = useFitSquare<HTMLDivElement>();
  const lockedComposition = spinning || inGame;
  const highlight = outcome ? outcome.genre.id : null;

  return (
    <div className="pb-6">
      <PageTitle
        pre={t("wheel.headingPre")}
        accent={t("wheel.headingAccent")}
        sub={t("wheel.sub")}
        className="pb-3"
        actions={
          <IconButton
            label={settings.sound ? t("wheel.soundOff") : t("wheel.soundOn")}
            onClick={() => update({ sound: !settings.sound })}
            className="bg-surface-2/70"
          >
            {settings.sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </IconButton>
        }
      />
      <div className="grid gap-4 px-4 sm:px-6 lg:h-[clamp(500px,calc(100dvh-290px),740px)] lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Сцена: колесо вписується в доступну висоту */}
        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_50%_40%,color-mix(in_srgb,var(--n-accent)_12%,transparent),transparent_65%)] p-4">
          {settings.eliminate && roster ? (
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2 text-fg-2">
                <Swords className="size-4 text-accent" />
                {winner
                  ? t("wheel.koDone")
                  : t("wheel.koLeft", { count: genres.length, total: roster.length })}
              </span>
              <Button variant="ghost" size="sm" onClick={reset} disabled={spinning}>
                <RotateCcw className="size-4" /> {t("wheel.restart")}
              </Button>
            </div>
          ) : null}
          <div ref={stageRef} className="flex min-h-[280px] flex-1 items-center justify-center lg:min-h-0">
            <div
              className="relative"
              style={{ width: size || "100%", height: size || "auto", aspectRatio: "1" }}
            >
              <svg
                ref={pinRef}
                viewBox="0 0 40 52"
                className="absolute top-[-3%] left-1/2 z-20 w-[8%] min-w-7 origin-[50%_28%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                style={{ transform: "translateX(-50%)" }}
                aria-hidden
              >
                <path
                  d="M20 50 C14 38 4 28 4 17 A16 16 0 0 1 36 17 C36 28 26 38 20 50Z"
                  fill="var(--n-accent)"
                  stroke="var(--n-bg)"
                  strokeWidth="2"
                />
                <circle cx="20" cy="16" r="6" fill="var(--n-bg)" opacity="0.85" />
              </svg>
              <button
                type="button"
                onClick={spin}
                disabled={!canSpin}
                aria-label={t("wheel.spin")}
                className="group/disc relative block size-full rounded-full disabled:cursor-default"
              >
                <Rim spinning={spinning} won={outcome?.kind === "winner"} />
                <div
                  ref={discRef}
                  className="absolute inset-[5.5%] rounded-full will-change-transform"
                  style={{ transform: `rotate(${angle.current}deg)` }}
                >
                  <Disc genres={genres} colorOf={colorOf} highlight={highlight} leaving={leaving} />
                </div>
              </button>
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex size-[19%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-[color-mix(in_srgb,var(--n-accent)_60%,transparent)] bg-surface-1 shadow-[0_6px_20px_rgba(0,0,0,0.55)]">
                <OwlGlyph className="size-[62%]" />
              </div>
              {outcome ? (
                <>
                  {outcome.kind === "winner" ? <Confetti key={confettiKey} /> : null}
                  <div
                    className={cn(
                      "absolute top-1/2 left-1/2 z-30 flex aspect-square w-[54%] flex-col items-center justify-center gap-1 rounded-full border-2 bg-surface-1/95 p-4 text-center shadow-2xl shadow-black/60 backdrop-blur",
                      outcome.kind === "winner" ? "border-accent" : "border-line-strong",
                    )}
                    style={{
                      transform: "translate(-50%, -50%)",
                      animation: "pop-in .35s cubic-bezier(.34,1.56,.64,1)",
                    }}
                  >
                    <button
                      type="button"
                      aria-label={t("common.close")}
                      onClick={() => setOutcome(null)}
                      className="absolute top-[13%] right-[17%] flex size-7 items-center justify-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <X className="size-3.5" />
                    </button>
                    <span className="text-xs text-muted">
                      {outcome.kind === "winner" ? t("wheel.result") : t("wheel.out")}
                    </span>
                    <span
                      className={cn(
                        "font-serif text-xl leading-tight font-bold break-words sm:text-2xl",
                        outcome.kind === "winner" ? "text-accent" : "text-fg-2 line-through decoration-1",
                      )}
                    >
                      {outcome.genre.name}
                    </span>
                    <span className="text-xs text-subtle">
                      {outcome.kind === "winner"
                        ? t("release.songs", { count: outcome.genre.trackCount })
                        : t("wheel.koLeftShort", { count: outcome.left })}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex shrink-0 flex-col items-center gap-1">
            <Button size="lg" className="min-w-48" disabled={!canSpin} onClick={spin}>
              {spinning ? t("wheel.spinning") : t("wheel.spin")}
            </Button>
            {settings.eliminate && winner && roster ? (
              <p className="text-xs text-subtle">{t("wheel.koAgain")}</p>
            ) : !enough ? (
              <p className="text-sm text-warning">{t("wheel.customEmpty")}</p>
            ) : (
              <p className="hidden text-xs text-subtle sm:block">{t("wheel.hint")}</p>
            )}
          </div>
        </section>

        {/* Бічна панель: компактні параметри + вкладки */}
        <aside className="flex min-h-0 flex-col gap-3">
          <div
            className={cn(
              "shrink-0 space-y-3 rounded-2xl border border-line bg-surface-2/60 p-3.5 transition-opacity",
              spinning && "opacity-60",
            )}
            aria-disabled={spinning}
          >
            <div className="flex items-center justify-between gap-2">
              <Segmented
                value={settings.mode}
                disabled={lockedComposition}
                onChange={(mode) => update({ mode }, { composition: true })}
                options={[
                  { value: "random", label: t("wheel.modeRandom") },
                  { value: "custom", label: t("wheel.modeCustom") },
                ]}
              />
              {settings.mode === "random" ? (
                <NumStepper
                  label={t("wheel.count")}
                  value={count}
                  min={MIN_ON_WHEEL}
                  max={Math.max(MIN_ON_WHEEL, all.length)}
                  disabled={lockedComposition}
                  onChange={(v) => update({ count: v }, { composition: true })}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={lockedComposition}
                  onClick={() => !lockedComposition && setPicking(true)}
                >
                  <Plus className="size-4" /> {t("wheel.pick")}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm whitespace-nowrap text-fg-2">{t("wheel.durationShort")}</span>
              <span className="flex items-center gap-1">
                <NumStepper
                  label={t("wheel.duration")}
                  value={settings.secMin}
                  min={1}
                  max={30}
                  disabled={spinning}
                  onChange={(v) => update({ secMin: v, secMax: Math.max(v, settings.secMax) })}
                />
                <span className="text-muted">—</span>
                <NumStepper
                  label={t("wheel.duration")}
                  value={settings.secMax}
                  min={1}
                  max={30}
                  disabled={spinning}
                  onChange={(v) => update({ secMax: v, secMin: Math.min(v, settings.secMin) })}
                />
              </span>
            </div>
            <label
              className={cn(
                "flex items-center justify-between gap-3 text-sm text-fg-2",
                lockedComposition ? "cursor-default" : "cursor-pointer",
              )}
              title={t("wheel.eliminateHint")}
            >
              <span>{t("wheel.eliminate")}</span>
              <input
                type="checkbox"
                checked={settings.eliminate}
                disabled={lockedComposition}
                onChange={(e) => {
                  update({ eliminate: e.target.checked }, { composition: true });
                  reset();
                }}
                className="size-5 accent-[var(--n-accent)]"
              />
            </label>
          </div>

          <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface-2/60 lg:min-h-0">
            <div className="flex shrink-0 gap-1 border-b border-line p-1.5" role="tablist">
              {(
                [
                  ["genres", `${t("wheel.legend")} · ${genres.length}`],
                  ["playlist", t("wheel.playlistTab")],
                  ["history", `${t("wheel.history")}${history.length ? ` · ${history.length}` : ""}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  disabled={id === "playlist" && !winner}
                  onClick={() => setTab(id)}
                  className={cn(
                    "h-8 flex-1 truncate rounded-lg px-2 text-[13px] font-semibold transition-colors disabled:opacity-40",
                    tab === id ? "bg-accent-soft text-accent" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="scroll-area relative min-h-0 flex-1 overflow-y-auto p-2">
              {tab === "genres" ? (
                <Legend
                  genres={genres}
                  colorOf={colorOf}
                  highlight={highlight}
                  removed={roster?.filter((g) => removed.includes(g.id)) ?? []}
                />
              ) : tab === "playlist" && winner ? (
                <WheelPlaylist genre={winner.genre} seed={winner.seed} />
              ) : tab === "history" ? (
                history.length ? (
                  <ul className="space-y-0.5">
                    {history.map((g) => (
                      <li key={g.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setWinner({ genre: g, seed: Math.random().toString(36).slice(2, 10) });
                            setTab("playlist");
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-3/60"
                        >
                          <span className="truncate">{g.name}</span>
                          <span className="text-xs text-subtle tabular-nums">{g.trackCount}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-muted">{t("wheel.playlistEmpty")}</p>
                )
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <GenrePicker
        open={picking}
        onOpenChange={setPicking}
        genres={all}
        selected={settings.custom}
        onChange={(custom) => update({ custom }, { composition: true })}
      />
    </div>
  );
}

/** Обідок з лампочками: під час обертання «біжать», після перемоги — блимають. */
function Rim({ spinning, won }: { spinning: boolean; won: boolean }) {
  return (
    <svg viewBox="-110 -110 220 220" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="wheel-rim" r="0.5">
          <stop offset="0.86" stopColor="var(--n-surface-3)" />
          <stop offset="0.93" stopColor="var(--n-surface-1)" />
          <stop offset="1" stopColor="var(--n-bg)" />
        </radialGradient>
      </defs>
      <circle r="109" fill="url(#wheel-rim)" />
      <circle r="104.5" fill="none" stroke="var(--n-accent)" strokeWidth="2.2" />
      <circle r="96.5" fill="none" stroke="var(--n-accent-lo)" strokeWidth="1.4" />
      {Array.from({ length: BULBS }, (_, i) => {
        const a = (i / BULBS) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={(Math.sin(a) * 100.5).toFixed(3)}
            cy={(-Math.cos(a) * 100.5).toFixed(3)}
            r="2.3"
            className={cn("wheel-bulb", spinning && "is-spinning", won && "is-won")}
            style={{ animationDelay: spinning ? `${(i % 2) * 140}ms` : `${(i % 3) * 120}ms` }}
          />
        );
      })}
    </svg>
  );
}

function Disc({
  genres,
  colorOf,
  highlight,
  leaving,
}: {
  genres: Genre[];
  colorOf: (g: Genre) => string;
  highlight: string | null;
  leaving: string | null;
}) {
  const n = Math.max(1, genres.length);
  const seg = 360 / n;
  const point = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.sin(rad) * r).toFixed(3)} ${(-Math.cos(rad) * r).toFixed(3)}`;
  };
  // Підпис — уздовж радіуса; що більше сегментів, то менший шрифт; на лівій половині — розвернутий.
  const fontSize = n <= 6 ? 7.2 : n <= 10 ? 6.2 : n <= 16 ? 5.2 : n <= 28 ? 4.2 : 3.4;
  const maxChars = Math.max(6, Math.round(66 / fontSize));
  return (
    <svg viewBox="-100 -100 200 200" className="size-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="wheel-depth" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      {genres.map((g, i) => {
        const a0 = i * seg;
        const a1 = (i + 1) * seg;
        const d =
          n === 1
            ? "M0 -100 A100 100 0 1 1 -0.01 -100 Z"
            : `M0 0 L${point(a0, 100)} A100 100 0 ${seg > 180 ? 1 : 0} 1 ${point(a1, 100)} Z`;
        const mid = a0 + seg / 2;
        const label = g.name.length > maxChars ? `${g.name.slice(0, maxChars - 1)}…` : g.name;
        const flip = mid > 180;
        const isLeaving = leaving === g.id;
        const dim = highlight !== null && highlight !== g.id;
        return (
          <g
            key={g.id}
            style={{
              opacity: isLeaving ? 0.15 : dim ? 0.5 : 1,
              transition: "opacity .6s ease",
            }}
          >
            <path
              d={d}
              fill={colorOf(g)}
              stroke={highlight === g.id ? "#fff" : "rgba(0,0,0,0.18)"}
              strokeWidth={highlight === g.id ? 1.6 : 0.5}
            />
            <text
              transform={
                flip ? `rotate(${mid + 90}) translate(-24 0)` : `rotate(${mid - 90}) translate(24 0)`
              }
              textAnchor={flip ? "end" : "start"}
              dominantBaseline="middle"
              fontSize={fontSize}
              fontWeight={700}
              fill="#fff"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={fontSize / 6}
              paintOrder="stroke"
              style={{
                fontFamily: "var(--font-sans)",
                textDecoration: isLeaving ? "line-through" : undefined,
              }}
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle r="100" fill="url(#wheel-depth)" pointerEvents="none" />
      {n > 1
        ? genres.map((g, i) => (
            <line
              key={`sep-${g.id}`}
              x1="0"
              y1="0"
              x2={(Math.sin((i * seg * Math.PI) / 180) * 100).toFixed(3)}
              y2={(-Math.cos((i * seg * Math.PI) / 180) * 100).toFixed(3)}
              stroke="var(--n-accent)"
              strokeOpacity="0.5"
              strokeWidth="0.7"
            />
          ))
        : null}
    </svg>
  );
}

function Legend({
  genres,
  colorOf,
  highlight,
  removed,
}: {
  genres: Genre[];
  colorOf: (g: Genre) => string;
  highlight: string | null;
  removed: Genre[];
}) {
  return (
    <ul className="space-y-0.5">
      {genres.map((g) => (
        <li
          key={g.id}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-300",
            g.id === highlight && "bg-accent-soft font-semibold text-accent",
          )}
        >
          <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(g) }} />
          <span className="min-w-0 flex-1 truncate">{g.name}</span>
          <span className="text-xs text-subtle tabular-nums">{g.trackCount}</span>
        </li>
      ))}
      {removed.map((g) => (
        <li
          key={g.id}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-subtle line-through"
        >
          <span className="size-3 shrink-0 rounded-full opacity-40" style={{ background: colorOf(g) }} />
          <span className="min-w-0 flex-1 truncate">{g.name}</span>
        </li>
      ))}
    </ul>
  );
}

/** Випадкові пісні жанру з одним зерном — до 200 для відтворення. */
async function loadGenreTracks(slug: string, seed: string, max = 200): Promise<Track[]> {
  const out: Track[] = [];
  let cursor: string | undefined;
  while (out.length < max) {
    const page = await api.tracks.browse({
      query: { genre: slug, sort: "random", seed, limit: 100, ...(cursor ? { cursor } : {}) },
    });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out.slice(0, max);
}

function WheelPlaylist({ genre, seed }: { genre: Genre; seed: string }) {
  const t = useT();
  const me = useMe().data;
  const gate = useAuthGate();
  const [saving, setSaving] = useState(false);
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { genre: genre.slug, sort: "random", seed, limit: 30 },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const context = { type: "wheel" as const, id: genre.id, name: `${t("nav.wheel")} · ${genre.name}` };
  const [busy, setBusy] = useState(false);
  const playAll = async () => {
    setBusy(true);
    try {
      const all = await loadGenreTracks(genre.slug, seed);
      if (all.length) playerStore.getState().playContext(all, 0, context);
      else toast(t("track.unavailable"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
        <h3 className="serif-title min-w-0 truncate text-base">
          {t("wheel.playlistTitle", { genre: genre.name, count: genre.trackCount })}
        </h3>
        <div className="flex gap-1.5">
          {me ? (
            <Button variant="outline" size="sm" onClick={gate(() => setSaving(true))}>
              <ListMusic className="size-4" /> {t("wheel.save")}
            </Button>
          ) : null}
          <Button size="sm" onClick={playAll} loading={busy} disabled={!tracks.length}>
            <Play className="size-4" fill="currentColor" /> {t("wheel.play")}
          </Button>
        </div>
      </div>
      <ul className="space-y-0.5">
        {tracks.map((track, i) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => playerStore.getState().playContext(tracks, i, context)}
              className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-3/60"
            >
              <span className="relative shrink-0">
                <Cover src={track.release?.coverUrl} alt="" size={40} seed={track.id} className="w-9" />
                <span className="absolute inset-0 hidden items-center justify-center rounded-md bg-black/50 group-hover:flex">
                  <Play className="size-3.5 text-white" fill="currentColor" strokeWidth={0} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{track.title}</span>
                <ArtistLinks artists={track.artists} className="block truncate text-xs text-muted" />
              </span>
            </button>
          </li>
        ))}
        {list.isLoading
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="skeleton h-11 rounded-md" />)
          : null}
      </ul>
      {list.hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          loading={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
        >
          {t("wheel.more")}
        </Button>
      ) : null}
      <SavePlaylistDialog
        open={saving}
        onOpenChange={setSaving}
        defaultTitle={t("wheel.savedTitle", { genre: genre.name })}
        loadTracks={() => loadGenreTracks(genre.slug, seed)}
      />
    </div>
  );
}

function GenrePicker({
  open,
  onOpenChange,
  genres,
  selected,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  genres: Genre[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const set = new Set(selected);
  const shown = genres.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => onChange(set.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("wheel.pickTitle")}
      description={t("wheel.customEmpty")}
    >
      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("wheel.searchGenre")}
          className="h-10 w-full rounded-full border border-line bg-surface-3 pr-3 pl-9 text-sm outline-none focus:border-accent"
        />
      </label>
      <ul className="scroll-area -mx-2 max-h-[46vh] overflow-y-auto">
        {shown.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-3"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                  set.has(g.id) ? "border-accent bg-accent text-on-accent" : "border-line-strong",
                )}
              >
                {set.has(g.id) ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <span className="flex-1 truncate">{g.name}</span>
              <span className="text-xs text-subtle tabular-nums">{g.trackCount}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className={cn("text-sm", selected.length < MIN_ON_WHEEL ? "text-warning" : "text-muted")}>
          {t("wheel.selected", { count: selected.length })}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            {t("wheel.clear")}
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} disabled={selected.length < MIN_ON_WHEEL}>
            {t("common.done")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
