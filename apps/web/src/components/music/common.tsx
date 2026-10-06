"use client";
import type { ArtistRef, Track } from "@musicdb/contracts/client";
import type { ContextInfo } from "@musicdb/player";
import { useLikedIds, useToggleLike } from "@musicdb/sdk/react";
import { Heart, Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Fragment, type MouseEvent } from "react";
import { HlText } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore, usePlayer } from "@/player/store";

export function ArtistLinks({ artists, className }: { artists: ArtistRef[]; className?: string }) {
  return (
    <span className={cn("truncate", className)}>
      {artists.map((a, i) => (
        <Fragment key={a.id}>
          {i > 0 ? ", " : null}
          <Link
            href={`/artist/${a.slug || a.id}`}
            className="hover:text-fg hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {a.name}
          </Link>
        </Fragment>
      ))}
    </span>
  );
}

export function ExplicitBadge() {
  const t = useT();
  return (
    <span
      title="Explicit"
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-muted/30 text-[9px] font-bold text-muted"
    >
      {t("common.explicit")}
    </span>
  );
}

/** Чи зараз грає саме цей контекст (альбом, плейлист…). */
export function useIsContextPlaying(context: ContextInfo | null) {
  return usePlayer(
    (s) =>
      !!context &&
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null) &&
      (s.status === "playing" || s.status === "loading"),
  );
}

export function useIsContextActive(context: ContextInfo | null) {
  return usePlayer(
    (s) => !!context && s.context?.type === context.type && (s.context?.id ?? null) === (context.id ?? null),
  );
}

/** Велика кнопка «Відтворити/Пауза» для контексту: продовжує, якщо контекст уже активний. */
export function PlayContextButton({
  tracks,
  context,
  size = "lg",
  className,
  shuffle,
  trackId,
}: {
  tracks: Track[] | (() => Promise<Track[]>);
  context: ContextInfo;
  size?: "md" | "lg";
  className?: string;
  shuffle?: boolean;
  /** Кнопка однієї пісні (картка, сторінка треку): «активна», лише коли грає саме ця пісня, а не її радіо. */
  trackId?: string;
}) {
  const t = useT();
  const contextPlaying = useIsContextPlaying(context);
  const contextActive = useIsContextActive(context);
  const isCurrent = usePlayer((s) => !!trackId && s.current?.track.id === trackId);
  const isCurrentPlaying = usePlayer(
    (s) => !!trackId && s.current?.track.id === trackId && (s.status === "playing" || s.status === "loading"),
  );
  const active = trackId ? isCurrent : contextActive;
  const playing = trackId ? isCurrentPlaying : contextPlaying;
  const onClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const st = playerStore.getState();
    if (active) {
      st.togglePlay();
      return;
    }
    const list = typeof tracks === "function" ? await tracks() : tracks;
    if (list.length) st.playContext(list, 0, context, shuffle ? { shuffle: true } : {});
  };
  const label = playing ? t("common.pause") : t("common.play");
  // Велика — пігулка з підписом (рядок дій сторінки), середня — кружечок на картці.
  if (size === "lg") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "accent-grad inline-flex h-11 shrink-0 items-center gap-2 rounded-full pr-5 pl-4 text-[14.5px] font-semibold active:scale-[0.97]",
          className,
        )}
      >
        {playing ? (
          <Pause className="size-[18px]" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="size-[18px]" fill="currentColor" strokeWidth={0} />
        )}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "accent-grad inline-flex size-12 shrink-0 items-center justify-center rounded-full hover:scale-105 active:scale-95",
        className,
      )}
    >
      {playing ? (
        <Pause className="size-5" fill="currentColor" strokeWidth={0} />
      ) : (
        <Play className="size-5 translate-x-[1px]" fill="currentColor" strokeWidth={0} />
      )}
    </button>
  );
}

export function LikeButton({
  track,
  size = "md",
  className,
}: {
  track: Pick<Track, "id">;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useT();
  const liked = useLikedIds().has(track.id);
  const toggle = useToggleLike();
  const gate = useAuthGate();
  const onClick = gate((e: MouseEvent) => {
    e.stopPropagation();
    toggle.mutate({ trackId: track.id, liked: !liked });
  }, t("auth.signInToLike"));
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.8 }}
      aria-label={liked ? t("track.unlike") : t("track.like")}
      aria-pressed={liked}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
        liked ? "text-accent" : "text-muted hover:text-fg",
        size === "sm" ? "size-7" : "size-8",
        className,
      )}
    >
      <motion.span
        key={String(liked)}
        initial={liked ? { scale: 0.4 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
      >
        <Heart className={size === "sm" ? "size-4" : "size-[18px]"} fill={liked ? "currentColor" : "none"} />
      </motion.span>
    </motion.button>
  );
}

export function Equalizer({ paused }: { paused?: boolean }) {
  return (
    <span className="eq" data-paused={paused ? "true" : "false"} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export function SectionHeader({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      {href ? (
        <Link href={href} className="serif-title text-[24px] leading-tight hover:underline">
          <HlText text={title} />
        </Link>
      ) : (
        <h2 className="serif-title text-[24px] leading-tight">
          <HlText text={title} />
        </h2>
      )}
      {href && action ? (
        <Link href={href} className="shrink-0 text-[13px] font-bold text-muted hover:text-fg hover:underline">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
