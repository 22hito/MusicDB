"use client";
import { formatDuration } from "@musicdb/i18n";
import { FEATURES } from "@musicdb/tokens";
import {
  Expand,
  ListMusic,
  Maximize2,
  MicVocal,
  MonitorPlay,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Video,
  VideoOff,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ArtistLinks, LikeButton } from "@/components/music/common";
import { IconButton, Spinner } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Vinyl } from "@/components/ui/vinyl";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/ui-store";
import { playerStore, usePlayer } from "@/player/store";
import { enterVideoFullscreen, usePlayingSource } from "@/player/video-slot";
import { SleepTimerButton } from "./sleep-timer";

/**
 * Плаваючий док плеєра N'Owl (замість смуги на всю ширину): капсула над вмістом, обкладинка — платівка,
 * що обертається під час відтворення, тонка шкала прогресу вздовж верхнього краю.
 */
export function PlayerDock() {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.status === "playing");
  const track = current?.track;
  const rightPanel = useUi((s) => s.rightPanel);
  const toggleRight = useUi((s) => s.toggleRightPanel);
  const setFull = useUi((s) => s.setFullPlayer);
  const source = usePlayingSource((s) => s.kind);
  const isVideo = source === "youtube";
  const videoHidden = useUi((s) => s.videoHidden);
  const setVideoHidden = useUi((s) => s.setVideoHidden);

  return (
    <section
      className="pointer-events-none fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 justify-center [--right-eff:0px] xl:[--right-eff:var(--right-w)]"
      // По центру екрана, але не заходить на бічну й праву панелі.
      style={{ width: "min(1080px, calc(100vw - 2 * max(var(--sidebar-w), var(--right-eff)) - 32px))" }}
      aria-label={t("player.nowPlaying")}
    >
      <div className="pointer-events-auto relative w-full max-w-[1080px] overflow-hidden rounded-[22px] border border-line/80 bg-elevated/88 shadow-[0_22px_60px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <Scrubber />
        <div className="grid h-[72px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 pr-3 pl-2.5">
          <div className="flex min-w-0 items-center gap-3">
            {track ? (
              <>
                <Link
                  href={track.release ? `/album/${track.release.id}` : `/track/${track.id}`}
                  className="shrink-0"
                  aria-label={track.release?.title ?? track.title}
                >
                  <Vinyl
                    src={track.release?.coverUrl}
                    seed={track.release?.id ?? track.id}
                    playing={playing}
                    size={52}
                  />
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/track/${track.id}`}
                    className="block truncate text-sm font-semibold hover:underline"
                  >
                    {track.title}
                  </Link>
                  <ArtistLinks artists={track.artists} className="block text-xs text-muted" />
                </div>
                <LikeButton track={track} size="sm" className="ml-0.5" />
                {FEATURES.lyrics && track.hasLyrics ? (
                  <button
                    type="button"
                    onClick={() => toggleRight("lyrics")}
                    aria-pressed={rightPanel === "lyrics"}
                    className={cn(
                      "hidden h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold transition-colors lg:inline-flex",
                      rightPanel === "lyrics"
                        ? "border-accent/60 bg-accent-soft text-accent"
                        : "border-line text-muted hover:border-line-strong hover:text-fg",
                    )}
                  >
                    <MicVocal className="size-3.5" />
                    {t("player.lyrics")}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="flex items-center gap-3 pl-1 text-sm text-subtle">
                <Vinyl src={null} seed="idle" playing={false} size={52} />
                {t("player.nothingPlaying")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <TimeLabel kind="position" />
            <Controls />
            <TimeLabel kind="duration" />
          </div>

          <div className="flex items-center justify-end gap-0.5">
            <IconButton
              label={t("player.nowPlaying")}
              size="sm"
              active={!!track && rightPanel === "now-playing"}
              onClick={() => toggleRight("now-playing")}
              disabled={!track}
            >
              <MonitorPlay className="size-[18px]" />
            </IconButton>
            <IconButton
              label={t("player.queue")}
              size="sm"
              active={rightPanel === "queue"}
              onClick={() => toggleRight("queue")}
            >
              <ListMusic className="size-[18px]" />
            </IconButton>
            <SleepTimerButton />
            <Volume />
            {isVideo ? (
              <IconButton
                label={videoHidden ? t("player.showVideo") : t("player.hideVideo")}
                size="sm"
                active={!videoHidden}
                onClick={() => setVideoHidden(!videoHidden)}
              >
                {videoHidden ? <VideoOff className="size-[18px]" /> : <Video className="size-[18px]" />}
              </IconButton>
            ) : null}
            {isVideo ? (
              <IconButton label={t("player.videoFullscreen")} size="sm" onClick={enterVideoFullscreen}>
                <Expand className="size-4" />
              </IconButton>
            ) : null}
            <IconButton label={t("player.expand")} size="sm" onClick={() => setFull(true)} disabled={!track}>
              <Maximize2 className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimeLabel({ kind }: { kind: "position" | "duration" }) {
  const value = usePlayer((s) => (kind === "position" ? s.positionMs : s.durationMs));
  const has = usePlayer((s) => !!s.current);
  return (
    <span className="w-10 text-center text-[11px] text-muted tabular-nums">
      {has ? formatDuration(value) : "–:––"}
    </span>
  );
}

/** Тонка шкала прогресу вздовж верхнього краю дока: наведення — товщає, клік чи перетягування — перемотування. */
function Scrubber() {
  const t = useT();
  const position = usePlayer((s) => s.positionMs);
  const duration = usePlayer((s) => s.durationMs);
  const hasTrack = usePlayer((s) => !!s.current);
  const [drag, setDrag] = useState<number | null>(null);
  const ratio = duration ? Math.min(1, (drag ?? position) / duration) : 0;
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration;
  };
  return (
    <div
      role="slider"
      tabIndex={hasTrack ? 0 : -1}
      aria-label={t("player.seek")}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration / 1000)}
      aria-valuenow={Math.round(position / 1000)}
      className={cn(
        "group/scrub absolute inset-x-0 top-0 z-10 h-3 -translate-y-1",
        hasTrack && duration ? "cursor-pointer" : "pointer-events-none",
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(at(e));
      }}
      onPointerMove={(e) => drag !== null && setDrag(at(e))}
      onPointerUp={(e) => {
        if (drag !== null) playerStore.getState().seek(at(e));
        setDrag(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") playerStore.getState().seek(position + 5000);
        if (e.key === "ArrowLeft") playerStore.getState().seek(Math.max(0, position - 5000));
      }}
    >
      <span className="absolute inset-x-0 top-1 h-[3px] bg-line/80 transition-[height] group-hover/scrub:h-[5px]" />
      <span
        className="absolute top-1 left-0 h-[3px] bg-gradient-to-r from-accent-lo to-accent transition-[height] group-hover/scrub:h-[5px]"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export function Controls({ large }: { large?: boolean }) {
  const t = useT();
  const status = usePlayer((s) => s.status);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const hasTrack = usePlayer((s) => !!s.current);
  const st = playerStore.getState;
  const playing = status === "playing" || status === "loading";
  const iconSize = large ? "size-7" : "size-5";
  return (
    <div className={cn("flex items-center", large ? "gap-6" : "gap-2")}>
      <IconButton
        label={shuffle ? t("player.shuffleOn") : t("player.shuffleOff")}
        size={large ? "lg" : "sm"}
        active={shuffle}
        onClick={() => st().toggleShuffle()}
        disabled={!hasTrack}
      >
        <Shuffle className={large ? "size-6" : "size-4"} />
      </IconButton>
      <IconButton
        label={t("player.previous")}
        size={large ? "lg" : "sm"}
        onClick={() => st().previous()}
        disabled={!hasTrack}
        className="text-fg/80"
      >
        <SkipBack className={iconSize} fill="currentColor" />
      </IconButton>
      <button
        type="button"
        aria-label={playing ? t("player.pause") : t("player.play")}
        onClick={() => st().togglePlay()}
        disabled={!hasTrack}
        className={cn(
          "accent-grad flex items-center justify-center rounded-full hover:scale-105 active:scale-95 disabled:opacity-40",
          large ? "size-16" : "size-8",
        )}
      >
        {status === "loading" ? (
          <Spinner className={large ? "size-7" : "size-4"} />
        ) : playing ? (
          <Pause className={large ? "size-7" : "size-4"} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            className={cn(large ? "size-7" : "size-4", "translate-x-[1px]")}
            fill="currentColor"
            strokeWidth={0}
          />
        )}
      </button>
      <IconButton
        label={t("player.next")}
        size={large ? "lg" : "sm"}
        onClick={() => st().next()}
        disabled={!hasTrack}
        className="text-fg/80"
      >
        <SkipForward className={iconSize} fill="currentColor" />
      </IconButton>
      <IconButton
        label={
          repeat === "off"
            ? t("player.repeatOff")
            : repeat === "all"
              ? t("player.repeatAll")
              : t("player.repeatOne")
        }
        size={large ? "lg" : "sm"}
        active={repeat !== "off"}
        onClick={() => st().cycleRepeat()}
        disabled={!hasTrack}
      >
        {repeat === "one" ? (
          <Repeat1 className={large ? "size-6" : "size-4"} />
        ) : (
          <Repeat className={large ? "size-6" : "size-4"} />
        )}
      </IconButton>
    </div>
  );
}

export function Progress({ className }: { className?: string }) {
  const t = useT();
  const position = usePlayer((s) => s.positionMs);
  const duration = usePlayer((s) => s.durationMs);
  const hasTrack = usePlayer((s) => !!s.current);
  const [preview, setPreview] = useState<number | null>(null);
  return (
    <div className={cn("flex w-full items-center gap-2 text-xs text-muted tabular-nums", className)}>
      <span className="w-10 text-right">{formatDuration(preview ?? position)}</span>
      <Slider
        value={position}
        max={duration || 1}
        label={t("player.seek")}
        disabled={!hasTrack}
        onPreview={setPreview}
        onCommit={(v) => playerStore.getState().seek(v)}
        step={1000}
      />
      <span className="w-10">{formatDuration(duration)}</span>
    </div>
  );
}

export function Volume({ className }: { className?: string }) {
  const t = useT();
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shown = muted ? 0 : volume;
  const Icon = shown === 0 ? VolumeX : shown < 0.5 ? Volume1 : Volume2;
  return (
    <div className={cn("flex w-[140px] items-center gap-1", className)}>
      <IconButton
        label={muted ? t("player.unmute") : t("player.mute")}
        size="sm"
        onClick={() => playerStore.getState().toggleMute()}
      >
        <Icon className="size-[18px]" />
      </IconButton>
      <Slider
        value={Math.round(shown * 100)}
        max={100}
        label={t("player.volume")}
        onPreview={(v) => v !== null && playerStore.getState().setVolume(v / 100)}
        onCommit={(v) => playerStore.getState().setVolume(v / 100)}
      />
    </div>
  );
}
