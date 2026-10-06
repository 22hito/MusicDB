"use client";
/**
 * Список треків у стилі стрімінгових сервісів: номер → кнопка відтворення при наведенні,
 * еквалайзер на поточному треку, подвійний клік — відтворити, правий клік — меню.
 * Довгі списки (від 80 рядків) віртуалізуються: у DOM лише видимі рядки.
 */
import type { Track } from "@musicdb/contracts/client";
import { formatDuration, formatRelative } from "@musicdb/i18n";
import type { ContextInfo } from "@musicdb/player";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock3, MoreHorizontal, Play } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode, useMemo, useState } from "react";
import { Cover } from "@/components/ui/cover";
import { ContextMenu, DropdownMenu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { useScrollElement } from "@/lib/scroll";
import { playerStore, usePlayer } from "@/player/store";
import { ArtistLinks, Equalizer, ExplicitBadge, LikeButton } from "./common";
import { useTrackMenu } from "./track-actions";

export type TrackListItem = { track: Track; key?: string; itemId?: string; addedAt?: string };

type Props = {
  items: TrackListItem[];
  context: ContextInfo;
  showCover?: boolean;
  showAlbum?: boolean;
  showAddedAt?: boolean;
  showArtists?: boolean;
  showPlays?: boolean;
  numbering?: "index" | "track";
  playlist?: { id: string; canEdit: boolean };
  header?: boolean;
  className?: string;
};

const isPlayable = (t: Track) => t.playback.audio || !!t.playback.youtubeVideoId || t.playback.resolvable;

export function TrackList({
  items,
  context,
  showCover = true,
  showAlbum = true,
  showAddedAt = false,
  showArtists = true,
  showPlays = false,
  numbering = "index",
  playlist,
  header = false,
  className,
}: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const tracks = useMemo(() => items.map((i) => i.track), [items]);
  const scrollEl = useScrollElement();
  const virtual = items.length > 80;

  const play = (index: number) => {
    const st = playerStore.getState();
    const same = st.context?.type === context.type && (st.context?.id ?? null) === (context.id ?? null);
    if (same && st.current?.track.id === tracks[index]?.id) st.togglePlay();
    else st.playContext(tracks, index, context);
  };

  const cols = cn(
    "grid items-center gap-4 px-4",
    "grid-cols-[28px_minmax(0,1fr)_minmax(72px,auto)]",
    showAlbum && "@[640px]:grid-cols-[28px_minmax(0,6fr)_minmax(0,4fr)_minmax(72px,auto)]",
    showAlbum &&
      showAddedAt &&
      "@[860px]:grid-cols-[28px_minmax(0,6fr)_minmax(0,4fr)_minmax(0,3fr)_minmax(72px,auto)]",
    !showAlbum && showPlays && "@[640px]:grid-cols-[28px_minmax(0,6fr)_minmax(0,2fr)_minmax(72px,auto)]",
  );

  const rowFor = (item: TrackListItem, index: number) => (
    <TrackRow
      key={item.key ?? item.itemId ?? `${item.track.id}-${index}`}
      item={item}
      index={index}
      cols={cols}
      context={context}
      showCover={showCover}
      showAlbum={showAlbum}
      showAddedAt={showAddedAt}
      showArtists={showArtists}
      showPlays={showPlays}
      numbering={numbering}
      playlist={playlist}
      selected={selected === (item.itemId ?? item.track.id)}
      onSelect={() => setSelected(item.itemId ?? item.track.id)}
      onPlay={() => play(index)}
    />
  );

  return (
    <div className={cn("@container", className)} role="grid" aria-rowcount={items.length}>
      {header ? (
        <div
          className={cn(
            cols,
            "sticky top-16 z-10 mb-2 h-9 border-b border-line bg-surface-1/95 text-[13px] font-medium text-muted backdrop-blur-md",
          )}
          role="row"
          tabIndex={-1}
        >
          <span className="text-center">#</span>
          <span>{t("track.title")}</span>
          {showAlbum ? <span className="hidden truncate @[640px]:block">{t("track.album")}</span> : null}
          {showAlbum && showAddedAt ? (
            <span className="hidden @[860px]:block">{t("track.dateAdded")}</span>
          ) : null}
          {!showAlbum && showPlays ? (
            <span className="hidden text-right @[640px]:block">{t("track.playsColumn")}</span>
          ) : null}
          <span className="flex justify-end pr-8">
            <Clock3 className="size-4" aria-label={t("track.duration")} />
          </span>
        </div>
      ) : null}
      {virtual && scrollEl ? (
        <VirtualRows count={items.length} scrollEl={scrollEl} render={(i) => rowFor(items[i]!, i)} />
      ) : (
        items.map((item, i) => rowFor(item, i))
      )}
    </div>
  );
}

function VirtualRows({
  count,
  scrollEl,
  render,
}: {
  count: number;
  scrollEl: HTMLElement;
  render: (i: number) => ReactNode;
}) {
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollEl,
    estimateSize: () => 56,
    overscan: 12,
    scrollMargin: 0,
  });
  const offset = virtualizer.options.scrollMargin;
  return (
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualizer.getVirtualItems().map((v) => (
        <div
          key={v.key}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${v.start - offset}px)`,
          }}
        >
          {render(v.index)}
        </div>
      ))}
    </div>
  );
}

type RowProps = {
  item: TrackListItem;
  index: number;
  cols: string;
  context: ContextInfo;
  showCover: boolean;
  showAlbum: boolean;
  showAddedAt: boolean;
  showArtists: boolean;
  showPlays: boolean;
  numbering: "index" | "track";
  playlist: { id: string; canEdit: boolean } | undefined;
  selected: boolean;
  onSelect: () => void;
  onPlay: () => void;
};

const TrackRow = memo(function TrackRow({
  item,
  index,
  cols,
  context,
  showCover,
  showAlbum,
  showAddedAt,
  showArtists,
  showPlays,
  numbering,
  playlist,
  selected,
  onSelect,
  onPlay,
}: RowProps) {
  const { t, locale } = useI18n();
  const track = item.track;
  const isCurrent = usePlayer(
    (s) =>
      s.current?.track.id === track.id &&
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null),
  );
  const isPlaying = usePlayer((s) => s.status === "playing" || s.status === "loading");
  const menu = useTrackMenu(track, {
    ...(playlist ? { playlistId: playlist.id, canEdit: playlist.canEdit } : {}),
    ...(item.itemId ? { itemId: item.itemId } : {}),
  });
  const playable = isPlayable(track);
  const number =
    numbering === "track"
      ? ((track as Track & { trackNumber?: number }).trackNumber ?? index + 1)
      : index + 1;

  return (
    <ContextMenu items={menu}>
      <div
        role="row"
        tabIndex={0}
        aria-selected={selected}
        onClick={(e) => {
          onSelect();
          if (window.matchMedia("(pointer: coarse)").matches || e.detail === 2) onPlay();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onPlay();
        }}
        className={cn(
          cols,
          "group relative h-14 rounded-lg text-sm text-muted transition-colors outline-none hover:bg-surface-2/60 focus-visible:bg-surface-2/60",
          "before:absolute before:top-3.5 before:bottom-3.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity hover:before:opacity-60",
          isCurrent && "before:opacity-100 hover:before:opacity-100",
          selected && "bg-surface-2 hover:bg-surface-2",
          !playable && "opacity-50",
        )}
      >
        <div className="relative flex h-8 w-7 items-center justify-center font-serif text-[16px] tabular-nums">
          {isCurrent && isPlaying ? (
            <span className="group-hover:hidden">
              <Equalizer />
            </span>
          ) : (
            <span className={cn("group-hover:hidden", isCurrent && "text-accent")}>{number}</span>
          )}
          <button
            type="button"
            aria-label={`${t("common.play")} ${track.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute inset-0 hidden items-center justify-center text-fg group-hover:flex"
          >
            {isCurrent && isPlaying ? (
              <PauseGlyph />
            ) : (
              <Play className="size-4" fill="currentColor" strokeWidth={0} />
            )}
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {showCover ? (
            <Cover
              src={track.release?.coverUrl}
              alt=""
              size={40}
              seed={track.release?.id ?? track.id}
              rounded="sm"
              className="size-10 shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <Link
              href={`/track/${track.id}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "block truncate text-[15px] font-medium text-fg hover:underline",
                isCurrent && "text-accent",
              )}
            >
              {track.title}
            </Link>
            {showArtists ? (
              <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
                {track.explicit ? <ExplicitBadge /> : null}
                <ArtistLinks artists={track.artists} className="group-hover:text-fg/80" />
              </div>
            ) : null}
          </div>
        </div>

        {showAlbum ? (
          <div className="hidden min-w-0 truncate @[640px]:block">
            {track.release ? (
              <Link
                href={`/album/${track.release.id}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-fg hover:underline"
              >
                {track.release.title}
              </Link>
            ) : null}
          </div>
        ) : null}
        {showAlbum && showAddedAt ? (
          <div className="hidden truncate @[860px]:block">
            {item.addedAt ? formatRelative(item.addedAt, t, locale) : ""}
          </div>
        ) : null}
        {!showAlbum && showPlays ? (
          <div className="hidden text-right tabular-nums @[640px]:block">
            {track.playCount ? track.playCount.toLocaleString(locale) : ""}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-1">
          <LikeButton
            track={track}
            size="sm"
            className="opacity-0 group-hover:opacity-100 aria-pressed:opacity-100 focus-visible:opacity-100"
          />
          <span className="w-11 text-right tabular-nums">
            {track.durationMs ? formatDuration(track.durationMs) : "—"}
          </span>
          <DropdownMenu
            items={menu()}
            trigger={
              <button
                type="button"
                aria-label={t("common.more")}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-5" />
              </button>
            }
          />
        </div>
      </div>
    </ContextMenu>
  );
});

function PauseGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <rect x="3" y="2" width="3.5" height="12" rx="1" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
    </svg>
  );
}
