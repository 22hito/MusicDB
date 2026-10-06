"use client";
/**
 * Екран турніру батлу. Стан — початковий порядок і вибори (логіка — @musicdb/player/tournament),
 * тому «крок назад» миттєвий, а незавершений турнір зберігається й продовжується після оновлення сторінки.
 * «З приспіву» — пісні стартують із третини; «Не можу обрати» — монетка; рейтинг можна зберегти плейлистом.
 */
import type { Track } from "@musicdb/contracts/client";
import {
  championPath,
  podium,
  replayTournament,
  type TournamentState,
  tournamentKey,
  tournamentRanking,
} from "@musicdb/player";
import { useMe } from "@musicdb/sdk/react";
import { MEDALS } from "@musicdb/tokens";
import {
  Coins,
  Crown,
  Headphones,
  ListMusic,
  MousePointer2,
  Music,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SavePlaylistDialog } from "@/components/music/save-playlist";
import { Button, IconButton } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { api } from "@/lib/api";
import { addWinner, loadChorus, saveBattle, saveChorus } from "@/lib/battle-storage";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";
import { loadYouTubeApi, type YTPlayer } from "@/player/youtube";

type Media = { kind: "youtube"; videoId: string } | { kind: "audio"; url: string } | { kind: "none" };

/** Плеєр однієї сторони реєструє себе, щоб грав лише один бік і працювали «Послухати»/наведення. */
type SideControl = { play(): void; pause(): void };

/** «З приспіву»: старт із третини пісні (приспів зазвичай там), не пізніше 75 с. */
const chorusStart = (t: Track) => Math.min(75, Math.round((t.durationMs / 1000) * 0.33)) || 45;

export function Tournament({
  initial,
  title,
  initialChoices = [],
  onRematch,
  onExit,
}: {
  initial: Track[];
  title: string;
  initialChoices?: (0 | 1)[];
  onRematch: () => void;
  onExit: () => void;
}) {
  const t = useT();
  const [choices, setChoices] = useState<(0 | 1)[]>(initialChoices);
  const state = useMemo(() => replayTournament(initial, choices), [initial, choices]);
  const [flash, setFlash] = useState<0 | 1 | null>(null);
  const [hover, setHover] = useState(false);
  const [chorus, setChorus] = useState(false);
  const [playingSide, setPlayingSide] = useState<0 | 1 | null>(null);
  const controls = useRef<(SideControl | null)[]>([null, null]);
  const thumbs = useRef(new Map<string, string>());
  const recorded = useRef(false);
  const me = useMe().data;
  const [winStats, setWinStats] = useState<{ wins: number; mine: number } | null>(null);
  const { size, rounds, champion, played } = state;
  const pair = state.pair;

  useEffect(() => setChorus(loadChorus()), []);

  // Основний плеєр — на паузу: інакше звучало б три джерела одночасно.
  useEffect(() => {
    playerStore.getState().pause();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Збереження прогресу; після перемоги — запис у «Мої переможці» й очищення.
  useEffect(() => {
    if (champion) {
      saveBattle(null);
      if (!recorded.current) {
        recorded.current = true;
        addWinner(champion, title, size);
        // Перемога зараховується пісні на сервері (раз на турнір); гостям — лише показуємо лічильник.
        const key = tournamentKey(
          initial.map((x) => x.id),
          choices,
        );
        const req = me
          ? api.battle.recordWin({
              body: { trackId: champion.id, battleKey: key, poolSize: size, poolTitle: title },
            })
          : api.battle.wins({ params: { id: champion.id } });
        req.then((r) => setWinStats({ wins: r.wins, mine: r.mine })).catch(() => setWinStats(null));
      }
    } else {
      recorded.current = false;
      setWinStats(null);
      saveBattle({ title, initial, choices, savedAt: Date.now() });
    }
  }, [champion, choices, initial, title, size, me]);

  const roundTitle = useCallback(
    (len: number, m?: number) => {
      if (len === 2) return t("battle.final");
      const pairLabel = m !== undefined ? ` — ${m}/${len / 2}` : "";
      if (len === 4) return `${t("battle.semifinal")}${pairLabel}`;
      if (len === 8) return `${t("battle.quarterfinal")}${pairLabel}`;
      const x = rounds - Math.log2(len) + 1;
      return m !== undefined
        ? `${t("battle.round", { x, n: rounds })}${pairLabel}`
        : t("battle.roundShort", { x });
    },
    [rounds, t],
  );

  const choose = useCallback(
    (side: 0 | 1) => {
      if (champion || flash !== null || !pair) return;
      for (const c of controls.current) c?.pause();
      setFlash(side);
      setTimeout(() => {
        setFlash(null);
        setChoices((c) => [...c, side]);
      }, 380);
    },
    [champion, flash, pair],
  );

  const undo = useCallback(() => {
    if (flash !== null) return;
    setChoices((c) => c.slice(0, -1));
  }, [flash]);

  const coin = useCallback(() => {
    choose(Math.random() < 0.5 ? 0 : 1);
  }, [choose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "z" || e.key === "я")) {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") onExit();
      else if (!champion && (e.key === "ArrowLeft" || e.key === "1")) {
        e.preventDefault();
        choose(0);
      } else if (!champion && (e.key === "ArrowRight" || e.key === "2")) {
        e.preventDefault();
        choose(1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [choose, undo, onExit, champion]);

  const register = (side: 0 | 1) => (c: SideControl | null) => {
    controls.current[side] = c;
  };
  const onSidePlay = (side: 0 | 1) => {
    controls.current[side === 0 ? 1 : 0]?.pause();
    setPlayingSide(side);
  };
  const thumbOf = useCallback(
    (track: Track) => track.release?.coverUrl ?? thumbs.current.get(track.id) ?? null,
    [],
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-bg" role="dialog" aria-modal="true">
      <BattleBackdrop
        a={champion ? thumbOf(champion) : pair ? thumbOf(pair[0]) : null}
        b={champion ? thumbOf(champion) : pair ? thumbOf(pair[1]) : null}
      />

      <header className="relative z-10 flex items-center gap-2 border-b border-line/60 px-4 py-3 sm:gap-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted">{title}</div>
          <div className="truncate font-serif text-lg font-semibold sm:text-xl">
            {champion ? t("battle.champion") : roundTitle(state.round.length, state.match + 1)}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-1.5 max-w-md flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-expo)]",
                  champion ? "bg-success" : "bg-gradient-to-r from-accent-lo to-accent",
                )}
                style={{ width: `${(played / (size - 1)) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {t("battle.played", { x: played, n: size - 1 })}
            </span>
          </div>
        </div>
        {!champion ? (
          <>
            <button
              type="button"
              onClick={() => {
                setChorus((c) => {
                  saveChorus(!c);
                  return !c;
                });
              }}
              title={t("battle.chorusHint")}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                chorus ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-fg",
              )}
            >
              <SkipForward className="size-4" />{" "}
              <span className="hidden sm:inline">{t("battle.chorus")}</span>
            </button>
            <IconButton
              label={t("battle.hoverMode")}
              title={t("battle.hoverHint")}
              onClick={() => setHover((h) => !h)}
              className={cn("hidden md:inline-flex", hover && "bg-accent-soft text-accent")}
            >
              <MousePointer2 className="size-5" />
            </IconButton>
          </>
        ) : null}
        <Button variant="outline" size="sm" onClick={undo} disabled={!choices.length} title="Ctrl+Z">
          <Undo2 className="size-4" /> <span className="hidden sm:inline">{t("battle.undo")}</span>
        </Button>
        <IconButton label={t("battle.exit")} onClick={onExit}>
          <X className="size-5" />
        </IconButton>
      </header>

      {champion ? (
        <Champion
          state={state}
          title={title}
          winStats={winStats}
          signedIn={!!me}
          thumbOf={thumbOf}
          roundTitle={roundTitle}
          onListen={() => {
            playerStore.getState().playContext([champion], 0, { type: "battle", name: t("nav.battle") });
            onExit();
          }}
          onRematch={onRematch}
        />
      ) : pair ? (
        <div className="scroll-area relative z-10 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
            {pair.map((track, i) => {
              const side = i as 0 | 1;
              return (
                <div key={`${side}-${track.id}-${played}`} className="contents">
                  {side === 1 ? (
                    <div className="flex flex-row items-center justify-center gap-3 md:flex-col">
                      <span className="flex size-14 items-center justify-center rounded-full border border-line bg-surface-2 font-serif text-xl font-bold text-accent shadow-lg">
                        {t("battle.vs")}
                      </span>
                      <button
                        type="button"
                        onClick={coin}
                        title={t("battle.coinHint")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/80 px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        <Coins className="size-3.5" /> {t("battle.coin")}
                      </button>
                    </div>
                  ) : null}
                  <BattleSide
                    track={track}
                    side={side}
                    startAt={chorus ? chorusStart(track) : 0}
                    flash={flash === null ? null : flash === side ? "win" : "lose"}
                    hover={hover}
                    playing={playingSide === side}
                    register={register(side)}
                    onPlay={() => onSidePlay(side)}
                    onPause={() => setPlayingSide((p) => (p === side ? null : p))}
                    onThumb={(url) => thumbs.current.set(track.id, url)}
                    onChoose={() => choose(side)}
                  />
                </div>
              );
            })}
          </div>
          <p className="hidden pb-4 text-center text-xs text-subtle md:block">{t("battle.keysHint")}</p>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function BattleBackdrop({ a, b }: { a: string | null; b: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-2 opacity-30" aria-hidden>
      {[a, b].map((src, i) => (
        <div
          key={i}
          className="bg-cover bg-center blur-3xl transition-[background-image] duration-700"
          style={src ? { backgroundImage: `url("${src}")` } : undefined}
        />
      ))}
    </div>
  );
}

function BattleSide({
  track,
  side,
  startAt,
  flash,
  hover,
  playing,
  register,
  onPlay,
  onPause,
  onThumb,
  onChoose,
}: {
  track: Track;
  side: 0 | 1;
  startAt: number;
  flash: "win" | "lose" | null;
  hover: boolean;
  playing: boolean;
  register: (c: SideControl | null) => void;
  onPlay: () => void;
  onPause: () => void;
  onThumb: (url: string) => void;
  onChoose: () => void;
}) {
  const t = useT();
  const [media, setMedia] = useState<Media | null>(null);
  const control = useRef<SideControl | null>(null);
  const thumbCb = useRef(onThumb);
  thumbCb.current = onThumb;

  useEffect(() => {
    let cancelled = false;
    setMedia(null);
    (async (): Promise<Media> => {
      if (track.playback.youtubeVideoId) return { kind: "youtube", videoId: track.playback.youtubeVideoId };
      try {
        const src = await api.tracks.playback({
          params: { id: track.id },
          query: { prefer: track.playback.audio ? "audio" : "youtube" },
        });
        return src.type === "youtube"
          ? { kind: "youtube", videoId: src.videoId }
          : { kind: "audio", url: src.url };
      } catch {
        return { kind: "none" };
      }
    })().then((m) => {
      if (cancelled) return;
      setMedia(m);
      if (m.kind === "youtube") thumbCb.current(`https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`);
    });
    return () => {
      cancelled = true;
    };
  }, [track.id, track.playback.youtubeVideoId, track.playback.audio]);

  const proxy = useMemo<SideControl>(
    () => ({ play: () => control.current?.play(), pause: () => control.current?.pause() }),
    [],
  );
  useEffect(() => {
    register(proxy);
    return () => register(null);
  }, [register, proxy]);

  return (
    <article
      className={cn(
        "flex min-w-0 animate-rise flex-col gap-3 rounded-xl border border-line bg-surface-1/80 p-3 shadow-xl shadow-black/30 backdrop-blur transition-[transform,opacity,border-color,box-shadow] duration-300 sm:p-4",
        flash === "win" &&
          "scale-[1.02] border-accent shadow-[0_0_0_1px_var(--n-accent),0_20px_50px_-20px_var(--n-accent)]",
        flash === "lose" && "scale-[0.96] opacity-35",
      )}
      style={{ animationDelay: `${side * 70}ms` }}
      onMouseEnter={() => hover && proxy.play()}
      onMouseLeave={() => hover && proxy.pause()}
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        {media?.kind === "youtube" ? (
          <YouTubeSide
            videoId={media.videoId}
            startAt={startAt}
            controlRef={control}
            onPlay={onPlay}
            onPause={onPause}
          />
        ) : media?.kind === "audio" ? (
          <AudioSide
            url={media.url}
            startAt={startAt}
            track={track}
            controlRef={control}
            onPlay={onPlay}
            onPause={onPause}
          />
        ) : media?.kind === "none" ? (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
            <Music className="size-8" />
            <span className="text-sm">{t("battle.videoNotFound")}</span>
          </div>
        ) : (
          <div className="skeleton size-full" />
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold sm:text-lg" title={track.title}>
            {track.title}
          </div>
          <div className="truncate text-sm text-muted">{track.artists.map((x) => x.name).join(", ")}</div>
        </div>
        <IconButton
          label={playing ? t("common.pause") : t("battle.listen")}
          onClick={() => (playing ? proxy.pause() : proxy.play())}
          disabled={!media || media.kind === "none"}
          className="bg-surface-2"
        >
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Headphones className="size-5" />}
        </IconButton>
      </div>
      <Button size="lg" onClick={onChoose} className="w-full">
        {side === 0 ? "← " : ""}
        {t("battle.choose")}
        {side === 1 ? " →" : ""}
      </Button>
    </article>
  );
}

function YouTubeSide({
  videoId,
  startAt,
  controlRef,
  onPlay,
  onPause,
}: {
  videoId: string;
  startAt: number;
  controlRef: React.RefObject<SideControl | null>;
  onPlay: () => void;
  onPause: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const handlers = useRef({ onPlay, onPause });
  handlers.current = { onPlay, onPause };

  useEffect(() => {
    let destroyed = false;
    void loadYouTubeApi().then(() => {
      if (destroyed || !mount.current) return;
      const host = document.createElement("div");
      mount.current.appendChild(host);
      player.current = new window.YT!.Player(host, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1, start: startAt },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            const s = playerStore.getState();
            e.target.setVolume(Math.round((s.muted ? 0 : s.volume) * 100));
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) handlers.current.onPlay();
            else if (e.data === 2 || e.data === 0) handlers.current.onPause();
          },
        },
      });
    });
    controlRef.current = {
      play: () => player.current?.playVideo(),
      pause: () => player.current?.pauseVideo(),
    };
    return () => {
      destroyed = true;
      controlRef.current = null;
      try {
        player.current?.destroy();
      } catch {
        // iframe уже прибрано
      }
      player.current = null;
      if (mount.current) mount.current.innerHTML = "";
    };
  }, [videoId, startAt, controlRef]);

  return <div ref={mount} className="size-full [&_iframe]:size-full" />;
}

function AudioSide({
  url,
  startAt,
  track,
  controlRef,
  onPlay,
  onPause,
}: {
  url: string;
  startAt: number;
  track: Track;
  controlRef: React.RefObject<SideControl | null>;
  onPlay: () => void;
  onPause: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState({ cur: 0, dur: 0, paused: true });
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const s = playerStore.getState();
    el.volume = s.muted ? 0 : s.volume;
    controlRef.current = { play: () => void el.play().catch(() => {}), pause: () => el.pause() };
    return () => {
      el.pause();
      controlRef.current = null;
    };
  }, [controlRef]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-4 p-4">
      {track.release?.coverUrl ? (
        <img
          src={track.release.coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-40 blur-sm"
        />
      ) : null}
      {/* biome-ignore lint/a11y/useMediaCaption: музика без тексту */}
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          if (startAt && e.currentTarget.duration > startAt) e.currentTarget.currentTime = startAt;
        }}
        onPlay={() => {
          setTime((x) => ({ ...x, paused: false }));
          onPlay();
        }}
        onPause={() => {
          setTime((x) => ({ ...x, paused: true }));
          onPause();
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setTime({ cur: el.currentTime, dur: el.duration || 0, paused: el.paused });
        }}
      />
      <button
        type="button"
        onClick={() => (time.paused ? controlRef.current?.play() : controlRef.current?.pause())}
        className="accent-grad relative flex size-16 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95"
        aria-label={time.paused ? "play" : "pause"}
      >
        {time.paused ? (
          <Play className="size-7 translate-x-[2px]" fill="currentColor" strokeWidth={0} />
        ) : (
          <Pause className="size-7" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <div className="relative w-full max-w-xs">
        <button
          type="button"
          aria-label="seek"
          className="block h-1.5 w-full overflow-hidden rounded-full bg-white/20"
          onClick={(e) => {
            const el = audio.current;
            if (!el?.duration) return;
            const r = e.currentTarget.getBoundingClientRect();
            el.currentTime = ((e.clientX - r.left) / r.width) * el.duration;
          }}
        >
          <span
            className="block h-full bg-accent"
            style={{ width: `${time.dur ? (time.cur / time.dur) * 100 : 0}%` }}
          />
        </button>
        <div className="mt-1 text-center text-xs text-white/80 tabular-nums">
          {fmt(time.cur)} / {fmt(time.dur)}
        </div>
      </div>
    </div>
  );
}

function Champion({
  state,
  title,
  winStats,
  signedIn,
  thumbOf,
  roundTitle,
  onListen,
  onRematch,
}: {
  state: TournamentState<Track>;
  title: string;
  winStats: { wins: number; mine: number } | null;
  signedIn: boolean;
  thumbOf: (t: Track) => string | null;
  roundTitle: (len: number) => string;
  onListen: () => void;
  onRematch: () => void;
}) {
  const t = useT();
  const me = useMe().data;
  const gate = useAuthGate();
  const champion = state.champion!;
  const path = championPath(state);
  const places = podium(state);
  const cover = thumbOf(champion);

  const [saving, setSaving] = useState(false);
  const saveRanking = gate(() => setSaving(true));

  return (
    <div className="scroll-area relative z-10 min-h-0 flex-1 overflow-y-auto">
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="relative flex flex-col items-center text-center">
          <Confetti count={60} top="38%" />
          <div className="relative animate-pop">
            <Crown
              className="absolute -top-7 left-1/2 size-9 -translate-x-1/2 drop-shadow"
              style={{ color: MEDALS[0] }}
              fill="currentColor"
            />
            <div
              className="size-44 overflow-hidden rounded-xl shadow-2xl ring-4 sm:size-56"
              style={{ ["--tw-ring-color" as string]: MEDALS[0] }}
            >
              {cover ? (
                <img src={cover} alt="" className="size-full object-cover" />
              ) : (
                <div className="accent-grad flex size-full items-center justify-center">
                  <Music className="size-16" />
                </div>
              )}
            </div>
          </div>
          <span className="mt-5 text-xs font-bold tracking-[0.12em] text-accent uppercase">
            {t("battle.champion")}
          </span>
          <h2 className="serif-title mt-1 text-3xl sm:text-4xl">{champion.title}</h2>
          <p className="mt-1 text-muted">{champion.artists.map((a) => a.name).join(", ")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={onListen}>
              <Play className="size-4" fill="currentColor" /> {t("battle.listenWinner")}
            </Button>
            {me ? (
              <Button size="lg" variant="outline" onClick={saveRanking}>
                <ListMusic className="size-4" /> {t("battle.saveRanking")}
              </Button>
            ) : null}
            <Button size="lg" variant="outline" onClick={onRematch}>
              <RotateCcw className="size-4" /> {t("battle.rematch")}
            </Button>
          </div>
        </div>

        {/* Перемоги — скільки разів ця пісня ставала чемпіоном батл роялю на N'Owl, а не дуелі цього турніру. */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { n: state.size, label: t("battle.songs", { count: state.size }), note: null },
            {
              n: winStats ? winStats.wins : "…",
              label: t("battle.titles", { count: winStats?.wins ?? 0 }),
              note: !signedIn
                ? t("battle.titlesSignIn")
                : winStats && winStats.mine !== winStats.wins
                  ? t("battle.titlesMine", { count: winStats.mine })
                  : null,
            },
            { n: state.rounds, label: t("battle.rounds", { count: state.rounds }), note: null },
          ].map(({ n, label, note }, i) => (
            <div
              key={label}
              className="animate-rise rounded-lg border border-line bg-surface-2/60 p-3 text-center"
              style={{ animationDelay: `${150 + i * 60}ms` }}
            >
              <div className="stat-num text-3xl">{n}</div>
              <div className="text-sm text-muted">{label}</div>
              {note ? <div className="mt-0.5 text-[11.5px] text-subtle">{note}</div> : null}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h3 className="serif-title mb-3 text-xl">{t("battle.path")}</h3>
            <ol className="relative space-y-3 border-l border-line pl-5">
              {path.map((m, i) => (
                <li
                  key={`${m.size}-${m.loser.id}`}
                  className="relative animate-rise"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span
                    className={cn(
                      "absolute top-3 -left-[26px] size-3 rounded-full border-2 border-bg",
                      m.size === 2 ? "bg-accent" : "bg-line-strong",
                    )}
                  />
                  <span className="text-[11px] font-bold tracking-wide text-accent uppercase">
                    {roundTitle(m.size)}
                  </span>
                  <div className="mt-1 flex items-center gap-3">
                    <Thumb src={thumbOf(m.loser)} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.loser.title}</div>
                      <div className="truncate text-xs text-muted">
                        {m.loser.artists.map((a) => a.name).join(", ")}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {places.second ? (
            <section>
              <h3 className="serif-title mb-3 text-xl">{t("battle.podium")}</h3>
              <div className="grid grid-cols-3 items-end gap-2">
                <PodiumCol place={2} tracks={[places.second]} thumbOf={thumbOf} />
                <PodiumCol place={1} tracks={[champion]} thumbOf={thumbOf} />
                <PodiumCol place={3} tracks={places.third} thumbOf={thumbOf} />
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <SavePlaylistDialog
        open={saving}
        onOpenChange={setSaving}
        defaultTitle={t("battle.rankingTitle", { title })}
        description={t("battle.rankingSaved")}
        loadTracks={() => tournamentRanking(state)}
      />
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    <img src={src} alt="" className="size-11 shrink-0 rounded-md object-cover" loading="lazy" />
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-3 text-muted">
      <Music className="size-5" />
    </span>
  );
}

function PodiumCol({
  place,
  tracks,
  thumbOf,
}: {
  place: 1 | 2 | 3;
  tracks: Track[];
  thumbOf: (t: Track) => string | null;
}) {
  const medal = MEDALS[place - 1]!;
  const height = { 1: "h-28", 2: "h-20", 3: "h-14" }[place];
  return (
    <div
      className="flex min-w-0 animate-rise flex-col items-center gap-2"
      style={{ animationDelay: `${place * 90}ms` }}
    >
      <div className="flex -space-x-3">
        {tracks.map((x) => (
          <div
            key={x.id}
            className="rounded-md ring-2"
            style={{ ["--tw-ring-color" as string]: medal }}
            title={`${x.artists.map((a) => a.name).join(", ")} — ${x.title}`}
          >
            <Thumb src={thumbOf(x)} />
          </div>
        ))}
      </div>
      <div className="w-full min-w-0 text-center">
        {tracks.map((x) => (
          <div key={x.id} className="truncate text-xs font-semibold">
            {x.title}
          </div>
        ))}
      </div>
      <div
        className={cn("flex w-full items-start justify-center rounded-t-lg pt-1", height)}
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${medal} 34%, transparent), transparent)`,
        }}
      >
        <span className="font-serif text-3xl font-bold" style={{ color: medal }}>
          {place}
        </span>
      </div>
    </div>
  );
}
