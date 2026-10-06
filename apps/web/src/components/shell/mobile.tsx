"use client";
import { useBadges, useMe } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import {
  ChevronDown,
  Clapperboard,
  Compass,
  Disc3,
  Expand,
  Home,
  Library,
  ListMusic,
  Maximize2,
  MicVocal,
  Minimize2,
  Pause,
  Play,
  Search,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArtistLinks, LikeButton } from "@/components/music/common";
import { IconButton } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { Segmented } from "@/components/ui/heading";
import { Vinyl } from "@/components/ui/vinyl";
import { cn } from "@/lib/cn";
import { useDominantColor } from "@/lib/color";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/ui-store";
import { usePlayerHotkeys } from "@/player/hotkeys";
import { playerStore, usePlayer } from "@/player/store";
import { enterVideoFullscreen, usePlayingSource, VideoSlot } from "@/player/video-slot";
import { Controls, Progress, Volume } from "./player-bar";
import { LyricsView } from "./right-panel";
import { SleepTimerButton } from "./sleep-timer";

export function MobileNav() {
  const t = useT();
  const pathname = usePathname();
  const me = useMe().data;
  const badges = useBadges().data;
  const exploreRoutes = [
    "/explore",
    "/top",
    "/catalog",
    "/wheel",
    "/battle",
    "/taste",
    "/graph",
    "/artists",
    "/recommendations",
  ];
  const items: { href: string; label: string; icon: typeof Home; active: boolean; badge?: number }[] = [
    { href: "/", label: t("nav.home"), icon: Home, active: pathname === "/" },
    {
      href: "/search",
      label: t("nav.search"),
      icon: Search,
      active: pathname.startsWith("/search") || pathname.startsWith("/genre"),
    },
    {
      href: "/explore",
      label: t("nav.explore"),
      icon: Compass,
      active: exploreRoutes.some((r) => pathname.startsWith(r)),
    },
    {
      href: "/library",
      label: t("nav.library"),
      icon: Library,
      active: pathname.startsWith("/library") || pathname.startsWith("/collection"),
    },
    {
      href: "/community",
      label: t("nav.community"),
      icon: Users,
      active: pathname.startsWith("/community") || pathname.startsWith("/messages"),
      badge: me ? (badges?.messages ?? 0) + (badges?.messageRequests ?? 0) : 0,
    },
  ];
  return (
    <nav
      className="safe-bottom grid bg-gradient-to-t from-bg via-bg/95 to-bg/0 pt-3"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "relative flex flex-col items-center gap-1 pb-2 text-[10px] font-medium",
            item.active ? "text-fg" : "text-muted",
          )}
        >
          <item.icon className="size-6" strokeWidth={item.active ? 2.4 : 1.8} />
          {item.label}
          {item.badge ? (
            <span className="absolute top-0 left-1/2 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-on-accent">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function MiniPlayer() {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const status = usePlayer((s) => s.status);
  const progress = usePlayer((s) => (s.durationMs ? s.positionMs / s.durationMs : 0));
  const setFull = useUi((s) => s.setFullPlayer);
  const track = current?.track;
  const color = useDominantColor(track?.release?.coverUrl, track?.release?.id ?? track?.id ?? "x");
  if (!track) return null;
  const playing = status === "playing" || status === "loading";
  return (
    <div className="px-2 pb-1.5">
      {/* Капсула з платівкою, як док на комп'ютері; тонка шкала прогресу — по верхньому краю. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFull(true)}
        onKeyDown={(e) => e.key === "Enter" && setFull(true)}
        className="relative flex h-[60px] items-center gap-3 overflow-hidden rounded-[20px] border border-line/80 py-2 pr-1.5 pl-2 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        style={{ background: `color-mix(in srgb, ${color} 22%, var(--n-elevated))` }}
      >
        <span className="absolute inset-x-0 top-0 h-[2px] bg-white/10">
          <span
            className="block h-full bg-gradient-to-r from-accent-lo to-accent"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
        <Vinyl
          src={track.release?.coverUrl}
          seed={track.release?.id ?? track.id}
          playing={status === "playing"}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-fg">{track.title}</div>
          <div className="truncate text-xs text-muted">{track.artists.map((a) => a.name).join(", ")}</div>
        </div>
        <LikeButton track={track} size="sm" />
        <button
          type="button"
          aria-label={playing ? t("player.pause") : t("player.play")}
          onClick={(e) => {
            e.stopPropagation();
            playerStore.getState().togglePlay();
          }}
          className="accent-grad flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          {playing ? (
            <Pause className="size-[18px]" fill="currentColor" strokeWidth={0} />
          ) : (
            <Play className="size-[18px] translate-x-[1px]" fill="currentColor" strokeWidth={0} />
          )}
        </button>
      </div>
    </div>
  );
}

type Stage = "art" | "lyrics";

/** Розмір, що вміщається в контейнер із заданим співвідношенням сторін (відео 16:9, обкладинка з платівкою). */
function useFit(ratio: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      const { width, height } = e.contentRect;
      const w = Math.min(width, height * ratio);
      setSize({ w: Math.floor(w), h: Math.floor(w / ratio) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);
  return [ref, size] as const;
}

/**
 * Повноекранний плеєр: на телефоні відкривається з міні-плеєра, на ПК — кнопкою в доку.
 * Два вигляди — «Обкладинка/Відео» і «Текст» (перемикач на видноті вгорі, клавіша L);
 * у вигляді тексту обкладинка чи відео з керуванням стають колонкою зліва. Відео можна розгорнути
 * на весь екран (F), а сам плеєр — на весь монітор. Обкладинка — з платівкою, що виїжджає під час гри.
 */
export function FullPlayer() {
  const t = useT();
  const open = useUi((s) => s.fullPlayer);
  const setFull = useUi((s) => s.setFullPlayer);
  const current = usePlayer((s) => s.current);
  const context = usePlayer((s) => s.context);
  const [stage, setStage] = useState<Stage>("art");
  const [screenFull, setScreenFull] = useState(false);
  const track = current?.track;
  const color = useDominantColor(track?.release?.coverUrl, track?.release?.id ?? track?.id ?? "x");
  const source = usePlayingSource((s) => s.kind);
  const isVideo =
    !!track && (source === "youtube" || (!track.playback.audio && !!track.playback.youtubeVideoId));

  useEffect(() => {
    if (!track) setFull(false);
  }, [track, setFull]);

  useEffect(() => {
    const on = () => setScreenFull(document.fullscreenElement === document.documentElement);
    on();
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Закрили плеєр — виходимо й з режиму «на весь монітор».
  useEffect(() => {
    if (!open && document.fullscreenElement === document.documentElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, [open]);

  const toggleScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  usePlayerHotkeys(open && !!track, {
    ...(FEATURES.lyrics ? { l: () => setStage((s) => (s === "lyrics" ? "art" : "lyrics")) } : {}),
    f: () => (isVideo ? enterVideoFullscreen() : toggleScreen()),
    escape: () => setFull(false),
  });

  const switcher = !FEATURES.lyrics ? null : (
    <Segmented
      value={stage}
      onChange={setStage}
      options={[
        {
          value: "art",
          label: (
            <>
              {isVideo ? <Clapperboard className="size-4" /> : <Disc3 className="size-4" />}
              {isVideo ? t("player.video") : t("player.cover")}
            </>
          ),
        },
        {
          value: "lyrics",
          label: (
            <>
              <MicVocal className="size-4" />
              {t("player.lyrics")}
            </>
          ),
        },
      ]}
    />
  );

  return (
    <AnimatePresence>
      {open && track ? (
        <motion.div
          key="full"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          drag="y"
          dragListener={stage === "art"}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => info.offset.y > 140 && setFull(false)}
          className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-bg"
          role="dialog"
          aria-label={t("player.nowPlaying")}
        >
          <div
            className="pointer-events-none absolute inset-0 transition-[background] duration-700"
            style={{
              background: `radial-gradient(70% 60% at 18% 8%, color-mix(in srgb, ${color} 42%, transparent), transparent 70%), radial-gradient(55% 55% at 92% 100%, color-mix(in srgb, ${color} 20%, transparent), transparent 70%)`,
            }}
            aria-hidden
          />

          <div className="safe-top relative flex items-center gap-3 px-4 pt-4 md:px-8">
            <button
              type="button"
              onClick={() => setFull(false)}
              title="Esc"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-1/60 pr-4 pl-2.5 text-[13px] font-semibold backdrop-blur transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              <ChevronDown className="size-5" />
              {t("player.collapse")}
            </button>
            <div className="min-w-0 flex-1 md:w-72 md:flex-none">
              <div className="text-[10.5px] font-bold tracking-[0.18em] text-subtle uppercase">
                {t("player.playingFrom")}
              </div>
              <div className="truncate text-[13px] font-semibold">{context?.name ?? t("player.queue")}</div>
            </div>
            <div className="hidden flex-1 justify-center md:flex">{switcher}</div>
            <div className="flex items-center justify-end gap-1 md:w-72">
              {isVideo ? (
                <IconButton label={t("player.videoFullscreen")} onClick={enterVideoFullscreen}>
                  <Expand className="size-5" />
                </IconButton>
              ) : null}
              <IconButton
                label={screenFull ? t("player.exitFullscreen") : t("player.fullscreen")}
                onClick={toggleScreen}
                className="hidden md:inline-flex"
              >
                {screenFull ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
              </IconButton>
            </div>
          </div>

          {stage === "art" || !FEATURES.lyrics ? (
            <div className="relative mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col gap-6 px-5 pt-4 pb-4 md:flex-row md:items-center md:gap-14 md:px-10 md:pb-10">
              <BigStage isVideo={isVideo} />
              <div className="w-full shrink-0 md:w-[400px]">
                <NowInfo onNavigate={() => setFull(false)} />
                <Transport onNavigate={() => setFull(false)} />
              </div>
            </div>
          ) : (
            <div className="relative mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 px-5 pt-4 pb-4 md:flex-row md:gap-12 md:px-10 md:pb-10">
              <aside className="hidden w-[360px] shrink-0 flex-col justify-center md:flex">
                {isVideo ? (
                  <VideoSlot
                    priority={10}
                    className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl"
                  />
                ) : (
                  <Cover
                    src={track.release?.coverUrl}
                    alt=""
                    size={400}
                    seed={track.release?.id ?? track.id}
                    rounded="lg"
                    className="aspect-square w-full shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
                  />
                )}
                <div className="mt-6">
                  <NowInfo onNavigate={() => setFull(false)} />
                  <Transport onNavigate={() => setFull(false)} />
                </div>
              </aside>
              <div className="scroll-area min-h-0 flex-1 overflow-y-auto pr-2 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_88%,transparent)]">
                <LyricsView large />
              </div>
              {/* Телефон: компактний рядок із мініатюрою під текстом */}
              <div className="md:hidden">
                <div className="flex items-center gap-3">
                  {isVideo ? (
                    <VideoSlot
                      priority={10}
                      className="aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-black"
                    />
                  ) : (
                    <Cover
                      src={track.release?.coverUrl}
                      alt=""
                      size={48}
                      seed={track.release?.id ?? track.id}
                      className="size-12 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{track.title}</div>
                    <ArtistLinks artists={track.artists} className="block truncate text-sm text-muted" />
                  </div>
                  <LikeButton track={track} />
                </div>
                <Transport onNavigate={() => setFull(false)} compact />
              </div>
            </div>
          )}

          <div className="safe-bottom relative flex justify-center pb-4 md:hidden">{switcher}</div>
          <p className="pointer-events-none absolute inset-x-0 bottom-3 hidden text-center text-[11px] text-subtle lg:block">
            {FEATURES.lyrics ? t("player.hotkeys") : t("player.hotkeysBasic")}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Головна сцена: відео 16:9 або обкладинка, з-під якої під час гри виїжджає платівка. */
function BigStage({ isVideo }: { isVideo: boolean }) {
  const track = usePlayer((s) => s.current?.track);
  const playing = usePlayer((s) => s.status === "playing");
  const [ref, size] = useFit(isVideo ? 16 / 9 : 1.28);
  if (!track) return null;
  return (
    <div ref={ref} className="flex min-h-[200px] min-w-0 flex-1 items-center justify-center self-stretch">
      {isVideo ? (
        <VideoSlot
          priority={10}
          className="overflow-hidden rounded-xl bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          style={{ width: size.w, height: size.h }}
        />
      ) : size.w ? (
        <div className="relative" style={{ width: size.w, height: size.h }}>
          <Vinyl
            src={track.release?.coverUrl}
            seed={track.release?.id ?? track.id}
            playing={playing}
            imageSize={1000}
            className={cn(
              "absolute top-[3%] left-0 transition-transform duration-700 ease-[var(--ease-out-expo)]",
              playing ? "translate-x-[24%]" : "translate-x-[6%]",
            )}
            size={Math.round(size.h * 0.94)}
          />
          <div className="relative" style={{ width: size.h, height: size.h }}>
            <Cover
              src={track.release?.coverUrl}
              alt=""
              size={1000}
              seed={track.release?.id ?? track.id}
              rounded="lg"
              priority
              className="size-full shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NowInfo({ onNavigate }: { onNavigate: () => void }) {
  const track = usePlayer((s) => s.current?.track);
  if (!track) return null;
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <Link
          href={`/track/${track.id}`}
          onClick={onNavigate}
          className="serif-title block truncate text-[26px] leading-tight hover:underline md:text-[30px]"
        >
          {track.title}
        </Link>
        <ArtistLinks artists={track.artists} className="mt-1 block truncate text-[15px] text-muted" />
      </div>
      <LikeButton track={track} />
    </div>
  );
}

/**
 * Показати/сховати плаваюче відео YouTube, коли плеєр згорнуто (на телефоні в міні-плеєрі місця немає,
 * тож перемикач — тут). Лише коли грає відео.
 */
function VideoToggle() {
  const t = useT();
  const source = usePlayingSource((s) => s.kind);
  const hidden = useUi((s) => s.videoHidden);
  if (source !== "youtube") return null;
  return (
    <button
      type="button"
      onClick={() => useUi.getState().setVideoHidden(!hidden)}
      aria-label={hidden ? t("player.showVideo") : t("player.hideVideo")}
      title={hidden ? t("player.showVideo") : t("player.hideVideo")}
      aria-pressed={!hidden}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full transition-colors hover:text-fg",
        hidden ? "text-muted" : "text-accent",
      )}
    >
      {hidden ? <VideoOff className="size-5" /> : <Video className="size-5" />}
    </button>
  );
}

/** Шкала, кнопки й другорядний рядок: гучність, черга, таймер сну. */
function Transport({ onNavigate, compact }: { onNavigate: () => void; compact?: boolean }) {
  const t = useT();
  return (
    <div className={cn("flex flex-col", compact ? "mt-3 gap-3" : "mt-6 gap-5")}>
      <Progress />
      <div className="flex justify-center">
        <Controls large={!compact} />
      </div>
      {!compact ? (
        <div className="flex items-center gap-2">
          <Volume className="hidden w-auto flex-1 md:flex" />
          <div className="ml-auto flex items-center gap-1">
            <VideoToggle />
            <SleepTimerButton />
            <Link
              href="/queue"
              onClick={onNavigate}
              aria-label={t("player.queue")}
              title={t("player.queue")}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-fg"
            >
              <ListMusic className="size-5" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
