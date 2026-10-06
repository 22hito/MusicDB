"use client";
import type { PlaybackSource, Track } from "@musicdb/contracts/client";
import { loudnessGain } from "@musicdb/player";
import { ApiError } from "@musicdb/sdk";
/**
 * Рушій відтворення сайту: стежить за станом плеєра й керує двома джерелами звуку —
 * HTMLAudioElement (власні файли, з вирівнюванням гучності) і вбудованим плеєром YouTube.
 * Також: Media Session (кнопки клавіатури/навушників, екран блокування) і гарячі клавіші.
 */
import { EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/ui-store";
import { playerStore, usePlayer } from "./store";
import { VideoFullscreenOverlay } from "./video-fullscreen";
import { activeSlot, setVideoHost, usePlayingSource, useVideoSlots } from "./video-slot";
import { loadYouTubeApi, type YTPlayer } from "./youtube";

// ─── Компонент ────────────────────────────────────────────────────────────

type Active =
  | { kind: "audio"; source: Extract<PlaybackSource, { type: "file" | "hls" }> }
  | { kind: "youtube"; videoId: string };

export function PlayerEngine() {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const ytReady = useRef<Promise<YTPlayer> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const ytMount = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Active | null>(null);
  const [kind, setKindState] = useState<"audio" | "youtube" | null>(null);
  const setKind = (k: "audio" | "youtube" | null) => {
    setKindState(k);
    usePlayingSource.setState({ kind: k });
  };
  const loadToken = useRef(0);

  const current = usePlayer((s) => s.current);
  const restartToken = usePlayer((s) => s.restartToken);

  // Аудіоелемент створюється один раз.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    const st = () => playerStore.getState();
    const onTime = () => {
      if (activeRef.current?.kind === "audio")
        st().onTime(audio.currentTime * 1000, audio.duration * 1000 || undefined);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", () => st().onLoaded(audio.duration * 1000));
    audio.addEventListener("playing", () => activeRef.current?.kind === "audio" && st().onPlaying());
    audio.addEventListener(
      "pause",
      () => activeRef.current?.kind === "audio" && !audio.ended && st().onPaused(),
    );
    audio.addEventListener("ended", () => activeRef.current?.kind === "audio" && st().onEnded());
    audio.addEventListener("error", () => {
      if (activeRef.current?.kind === "audio" && audio.src) st().onError("audio_error");
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const ensureYouTube = () => {
    ytReady.current ??= loadYouTubeApi().then(
      () =>
        new Promise<YTPlayer>((resolve) => {
          const player = new window.YT!.Player(ytMount.current!, {
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              controls: 0,
              playsinline: 1,
              rel: 0,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              origin: location.origin,
            },
            events: {
              onReady: () => {
                ytRef.current = player;
                resolve(player);
              },
              onStateChange: (e: { data: number }) => {
                if (activeRef.current?.kind !== "youtube") return;
                const st = playerStore.getState();
                if (e.data === 1) {
                  st.onPlaying();
                  st.onLoaded(player.getDuration() * 1000);
                } else if (e.data === 2) st.onPaused();
                else if (e.data === 0) st.onEnded();
              },
              onError: () => {
                if (activeRef.current?.kind === "youtube") playerStore.getState().onError("youtube_error");
              },
            },
          });
        }),
    );
    return ytReady.current;
  };

  // Новий трек або повтор: визначаємо джерело й запускаємо.
  // biome-ignore lint/correctness/useExhaustiveDependencies: перезапуск саме за current/restartToken
  useEffect(() => {
    const token = ++loadToken.current;
    const audio = audioRef.current;
    if (!current) {
      audio?.pause();
      ytRef.current?.stopVideo();
      activeRef.current = null;
      setKind(null);
      return;
    }
    const track = current.track;
    void (async () => {
      let source: PlaybackSource;
      try {
        source = await resolveSource(track);
      } catch (err) {
        if (token !== loadToken.current) return;
        const code = err instanceof ApiError ? err.code : "generic";
        toast.error(code === "not_playable" ? t("errors.not_playable") : t("errors.generic"));
        playerStore.getState().onError(code);
        return;
      }
      if (token !== loadToken.current) return;
      const wantPlay = playerStore.getState().status !== "paused";
      if (source.type === "youtube") {
        audio?.pause();
        activeRef.current = { kind: "youtube", videoId: source.videoId };
        setKind("youtube");
        const yt = await ensureYouTube();
        if (token !== loadToken.current) return;
        applyVolume();
        yt.loadVideoById(source.videoId, 0);
        if (!wantPlay) yt.pauseVideo();
      } else {
        ytRef.current?.pauseVideo();
        activeRef.current = { kind: "audio", source };
        setKind("audio");
        if (audio) {
          audio.src = source.url;
          applyVolume();
          if (wantPlay) audio.play().catch(() => playerStore.getState().onPaused());
        }
      }
    })();
  }, [current?.uid, restartToken]);

  const applyVolume = () => {
    const { volume, muted, normalize } = playerStore.getState();
    const a = activeRef.current;
    if (a?.kind === "audio" && audioRef.current) {
      audioRef.current.volume = muted
        ? 0
        : Math.min(1, volume * (normalize ? loudnessGain(a.source.loudnessLufs) : 1));
    }
    if (ytRef.current) {
      ytRef.current.setVolume(Math.round(volume * 100));
      if (muted) ytRef.current.mute();
      else ytRef.current.unMute();
    }
  };

  // Пауза/відтворення, перемотування, гучність. Підписка одна на весь час життя рушія.
  // biome-ignore lint/correctness/useExhaustiveDependencies: applyVolume читає лише ref-и й стор
  useEffect(
    () =>
      playerStore.subscribe((s, prev) => {
        const a = activeRef.current;
        if (s.status !== prev.status && a) {
          if (s.status === "playing" && prev.status === "paused") {
            if (a.kind === "audio") void audioRef.current?.play().catch(() => {});
            else ytRef.current?.playVideo();
          } else if (s.status === "paused") {
            if (a.kind === "audio") audioRef.current?.pause();
            else ytRef.current?.pauseVideo();
          }
        }
        if (s.seekRequest && s.seekRequest !== prev.seekRequest && a) {
          if (a.kind === "audio" && audioRef.current) audioRef.current.currentTime = s.seekRequest.ms / 1000;
          else ytRef.current?.seekTo(s.seekRequest.ms / 1000, true);
        }
        if (s.volume !== prev.volume || s.muted !== prev.muted || s.normalize !== prev.normalize)
          applyVolume();
      }),
    [],
  );

  // YouTube не має події timeupdate — опитуємо час під час відтворення.
  useEffect(() => {
    if (kind !== "youtube") return;
    const id = setInterval(() => {
      const yt = ytRef.current;
      if (!yt || playerStore.getState().status !== "playing") return;
      playerStore.getState().onTime(yt.getCurrentTime() * 1000, yt.getDuration() * 1000 || undefined);
    }, 250);
    return () => clearInterval(id);
  }, [kind]);

  useMediaSession(current?.track ?? null);
  useHotkeys();

  return <VideoHost hostRef={hostRef} mountRef={ytMount} visible={kind === "youtube"} />;
}

async function resolveSource(track: Track): Promise<PlaybackSource> {
  if (!track.playback.audio && track.playback.youtubeVideoId)
    return { type: "youtube", videoId: track.playback.youtubeVideoId };
  return api.tracks.playback({ params: { id: track.id }, query: { prefer: "audio" } });
}

// ─── Контейнер відео ──────────────────────────────────────────────────────

function VideoHost({
  hostRef,
  mountRef,
  visible,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  mountRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const [floating, setFloating] = useState(true);

  useEffect(() => {
    setVideoHost(hostRef.current);
    return () => setVideoHost(null);
  }, [hostRef]);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    // Пишемо в DOM і стан лише при зміні — інакше кожен кадр смикав би стилі й React.
    let last = "";
    let lastFloating: boolean | null = null;
    const place = (host: HTMLElement, x: number, y: number, w: number, h: number, isFloating: boolean) => {
      const key = `${x}|${y}|${w}|${h}`;
      if (key !== last) {
        last = key;
        host.style.transform = `translate(${x}px, ${y}px)`;
        host.style.width = `${w}px`;
        host.style.height = `${h}px`;
      }
      if (isFloating !== lastFloating) {
        lastFloating = isFloating;
        setFloating(isFloating);
      }
    };
    const tick = () => {
      const host = hostRef.current;
      if (host) {
        const slot = activeSlot(useVideoSlots.getState().slots);
        if (slot) {
          const r = slot.el.getBoundingClientRect();
          place(host, r.left, r.top, r.width, r.height, false);
        } else if (useUi.getState().videoHidden) {
          // Сховане: плеєр лишається відмальованим (звук грає), але поза екраном.
          place(host, -10000, 0, 200, 200, false);
        } else {
          // Плаваюча картка над плеєром (мін. 200 px).
          const w = Math.min(400, window.innerWidth - 32);
          const h = Math.max(200, Math.round((w * 9) / 16));
          const bottom = window.innerWidth < 768 ? 140 : 100;
          place(host, window.innerWidth - w - 16, window.innerHeight - h - bottom, w, h, true);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, hostRef]);

  return (
    <div
      ref={hostRef}
      aria-hidden={!visible}
      className={cn(
        "fixed top-0 left-0 z-40 overflow-hidden bg-black will-change-transform",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        floating ? "rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10" : "rounded-md",
      )}
      style={visible ? undefined : { width: 1, height: 1, transform: "translate(-9999px, 0)" }}
    >
      <div ref={mountRef} className="h-full w-full" />
      {floating && visible ? (
        <button
          type="button"
          onClick={() => useUi.getState().setVideoHidden(true)}
          title="Сховати відео"
          aria-label="Сховати відео"
          className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur transition-colors hover:bg-black/80"
        >
          <EyeOff className="size-4" />
        </button>
      ) : null}
      <VideoFullscreenOverlay hostRef={hostRef} visible={visible} />
    </div>
  );
}

// ─── Media Session ────────────────────────────────────────────────────────

function useMediaSession(track: Track | null) {
  const status = usePlayer((s) => s.status);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!track) {
      ms.metadata = null;
      return;
    }
    const cover = track.release?.coverUrl;
    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.release?.title ?? "",
      artwork: cover ? [{ src: cover, sizes: "1000x1000", type: "image/jpeg" }] : [],
    });
  }, [track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState =
      status === "playing" ? "playing" : status === "paused" ? "paused" : "none";
  }, [status]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const st = () => playerStore.getState();
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => st().play()],
      ["pause", () => st().pause()],
      ["previoustrack", () => st().previous()],
      ["nexttrack", () => st().next()],
      ["seekto", (d) => d.seekTime != null && st().seek(d.seekTime * 1000)],
      ["seekbackward", () => st().seek(st().positionMs - 10_000)],
      ["seekforward", () => st().seek(st().positionMs + 10_000)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // дія не підтримується браузером
      }
    }
  }, []);
}

// ─── Гарячі клавіші ───────────────────────────────────────────────────────

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const st = playerStore.getState();
      switch (e.key) {
        case " ":
          if (!st.current) return;
          e.preventDefault();
          st.togglePlay();
          break;
        case "ArrowRight":
          if (e.shiftKey) st.next();
          else st.seek(st.positionMs + 5000);
          break;
        case "ArrowLeft":
          if (e.shiftKey) st.previous();
          else st.seek(st.positionMs - 5000);
          break;
        case "ArrowUp":
          if (e.shiftKey) {
            e.preventDefault();
            st.setVolume(st.volume + 0.05);
          }
          break;
        case "ArrowDown":
          if (e.shiftKey) {
            e.preventDefault();
            st.setVolume(st.volume - 0.05);
          }
          break;
        case "m":
        case "ь":
          st.toggleMute();
          break;
        case "s":
        case "і":
          st.toggleShuffle();
          break;
        case "r":
        case "к":
          st.cycleRepeat();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
