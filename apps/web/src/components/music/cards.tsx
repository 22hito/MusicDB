"use client";
import type { Artist, Genre, Playlist, Release, Shelf as ShelfData, Track } from "@musicdb/contracts/client";
import { placeholderGradient } from "@musicdb/tokens";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Cover } from "@/components/ui/cover";
import { ContextMenu } from "@/components/ui/menu";
import { Vinyl } from "@/components/ui/vinyl";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { usePlayer } from "@/player/store";
import { PlayContextButton, SectionHeader, useIsContextActive } from "./common";
import { useTrackMenu } from "./track-actions";

type CardKind = "record" | "stack" | "person";

/**
 * Картка N'Owl. Без «підсвіченої плашки»: обкладинка — головна. Для альбомів і треків з-під конверта
 * висувається платівка (а якщо це зараз грає — вона висунута й обертається); плейлисти лежать «стосом»;
 * виконавці — у кільці. Кнопка відтворення — по центру обкладинки.
 */
function CardShell({
  href,
  cover,
  title,
  subtitle,
  play,
  active,
  kind = "record",
  disc,
}: {
  href: string;
  cover: ReactNode;
  title: string;
  subtitle: ReactNode;
  play?: ReactNode;
  active?: boolean;
  kind?: CardKind;
  disc?: { src: string | null | undefined; seed: string };
}) {
  const playing = useIsAnyPlaying() && !!active;
  return (
    <Link
      href={href}
      className="group relative flex min-w-0 flex-col gap-2.5 rounded-xl p-2.5 outline-none sm:p-3"
      data-active={active || undefined}
    >
      <div className="relative">
        {kind === "record" && disc ? (
          <Vinyl
            src={disc.src}
            seed={disc.seed}
            imageSize={200}
            playing={playing}
            className={cn(
              "absolute top-[5%] right-0 h-[90%] w-[90%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-[13%] group-focus-visible:translate-x-[13%]",
              active && "translate-x-[13%]",
            )}
          />
        ) : null}
        {kind === "stack" ? (
          <>
            <span
              className="absolute inset-x-[12%] top-0 h-full -translate-y-2.5 rounded-md bg-surface-3/50 transition-transform duration-300 group-hover:-translate-y-3"
              aria-hidden
            />
            <span
              className="absolute inset-x-[6%] top-0 h-full -translate-y-1.5 rounded-md bg-surface-3/80 transition-transform duration-300 group-hover:-translate-y-2"
              aria-hidden
            />
          </>
        ) : null}
        <div
          className={cn(
            "relative transition-transform duration-500 ease-[var(--ease-out-expo)]",
            kind === "record" &&
              disc &&
              "group-hover:-translate-x-[4%] group-focus-visible:-translate-x-[4%]",
            kind === "record" && disc && active && "-translate-x-[4%]",
            kind === "person" &&
              "rounded-full ring-2 ring-transparent ring-offset-4 ring-offset-bg transition-[box-shadow] group-hover:ring-accent/70",
            kind === "person" && active && "ring-accent",
          )}
        >
          {cover}
          {play ? (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25",
                kind === "person" ? "rounded-full" : "rounded-md",
              )}
            >
              <div
                className={cn(
                  "scale-75 opacity-0 transition-all duration-200 ease-[var(--ease-emphasized)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100",
                  active && "scale-100 opacity-100",
                )}
              >
                {play}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 px-0.5">
        <div
          className={cn(
            "truncate text-[14.5px] font-semibold transition-colors group-hover:text-accent",
            active && "text-accent",
          )}
        >
          {title}
        </div>
        <div className="line-clamp-2 text-[12.5px] leading-snug text-muted">{subtitle}</div>
      </div>
    </Link>
  );
}

function useIsAnyPlaying() {
  return usePlayer((s) => s.status === "playing");
}

export function ReleaseCard({ release }: { release: Release }) {
  const t = useT();
  const context = { type: "album" as const, id: release.id, name: release.title };
  const active = useIsContextActive(context);
  const year = release.releaseDate?.slice(0, 4);
  return (
    <CardShell
      href={`/album/${release.id}`}
      active={active}
      disc={{ src: release.coverUrl, seed: release.id }}
      cover={
        <Cover
          src={release.coverUrl}
          alt={release.title}
          size={200}
          seed={release.id}
          className="w-full shadow-[0_10px_28px_-12px_rgba(0,0,0,0.8)]"
        />
      }
      title={release.title}
      subtitle={
        <>
          {year ? `${year} · ` : ""}
          {release.type === "album"
            ? release.artists.map((a) => a.name).join(", ")
            : t(`release.${release.type}`)}
        </>
      }
      play={
        <PlayContextButton
          size="md"
          context={context}
          tracks={async () => (await api.releases.get({ params: { id: release.id } })).tracks}
        />
      }
    />
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const t = useT();
  const context = { type: "playlist" as const, id: playlist.id, name: playlist.title };
  const active = useIsContextActive(context);
  return (
    <CardShell
      href={`/playlist/${playlist.id}`}
      active={active}
      kind="stack"
      cover={
        <Cover
          src={playlist.coverUrl}
          mosaic={playlist.mosaic}
          alt={playlist.title}
          size={200}
          seed={playlist.id}
          className="w-full shadow-[0_10px_28px_-12px_rgba(0,0,0,0.8)]"
        />
      }
      title={playlist.title}
      subtitle={playlist.description || t("library.playlistBy", { name: playlist.owner.name })}
      play={
        playlist.trackCount > 0 ? (
          <PlayContextButton
            size="md"
            context={context}
            tracks={async () =>
              (await api.playlists.get({ params: { id: playlist.id } })).items.map((i) => i.track)
            }
          />
        ) : undefined
      }
    />
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  const t = useT();
  const context = { type: "artist" as const, id: artist.id, name: artist.name };
  const active = useIsContextActive(context);
  return (
    <CardShell
      href={`/artist/${artist.slug || artist.id}`}
      active={active}
      kind="person"
      cover={
        <Cover
          src={artist.imageUrl}
          alt={artist.name}
          size={200}
          seed={artist.id}
          rounded="full"
          className="w-full shadow-[0_10px_28px_-12px_rgba(0,0,0,0.8)]"
        />
      }
      title={artist.name}
      subtitle={t("library.artist")}
      play={
        <PlayContextButton
          size="md"
          context={context}
          tracks={async () => (await api.artists.get({ params: { id: artist.id } })).topTracks}
        />
      }
    />
  );
}

export function TrackCard({ track }: { track: Track }) {
  const menu = useTrackMenu(track);
  const ctx = { type: "radio" as const, id: track.id, name: track.title };
  // Картка пісні світиться, лише поки грає саме ця пісня (а не наступні з її радіо).
  const active = usePlayer((s) => s.current?.track.id === track.id);
  return (
    <ContextMenu items={menu}>
      <div>
        <CardShell
          href={`/track/${track.id}`}
          active={active}
          disc={{ src: track.release?.coverUrl, seed: track.release?.id ?? track.id }}
          cover={
            <Cover
              src={track.release?.coverUrl}
              alt={track.title}
              size={200}
              seed={track.release?.id ?? track.id}
              className="w-full shadow-[0_10px_28px_-12px_rgba(0,0,0,0.8)]"
            />
          }
          title={track.title}
          subtitle={track.artists.map((a) => a.name).join(", ")}
          play={
            <PlayContextButton
              size="md"
              context={ctx}
              trackId={track.id}
              tracks={async () => [
                track,
                ...(await api.tracks.radio({ params: { id: track.id }, query: { limit: 30 } })).items,
              ]}
            />
          }
        />
      </div>
    </ContextMenu>
  );
}

export function GenreCard({
  genre,
  className,
}: {
  genre: Pick<Genre, "id" | "name" | "slug">;
  className?: string;
}) {
  const [a, b] = placeholderGradient(genre.slug);
  return (
    <Link
      href={`/genre/${genre.slug}`}
      className={cn(
        "relative block aspect-[16/9] overflow-hidden rounded-lg p-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]",
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <span className="relative z-10 text-xl font-extrabold tracking-tight text-white first-letter:uppercase">
        {genre.name}
      </span>
      <span className="absolute -right-4 -bottom-6 size-24 rotate-[25deg] rounded-md bg-white/15 shadow-xl" />
    </Link>
  );
}

/** Горизонтальна полиця з прокруткою й стрілками (на телефоні — свайп). */
export function Shelf({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="group/shelf relative">
      <SectionHeader title={title} {...(href ? { href, action: t("common.seeAll") } : {})} />
      <div className="relative -mx-2.5 sm:-mx-3">
        <div
          ref={ref}
          className="no-scrollbar grid snap-x snap-mandatory auto-cols-[minmax(150px,1fr)] grid-flow-col overflow-x-auto scroll-smooth sm:auto-cols-[minmax(170px,1fr)] lg:auto-cols-[calc((100%-0px)/5)] xl:auto-cols-[calc((100%-0px)/6)] 2xl:auto-cols-[calc((100%-0px)/7)]"
        >
          {children}
        </div>
        {!edges.start ? (
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={() => scroll(-1)}
            className="absolute top-[38%] left-1 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-elevated/90 text-fg opacity-0 shadow-lg transition-opacity group-hover/shelf:opacity-100 md:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        {!edges.end ? (
          <button
            type="button"
            aria-label={t("common.forward")}
            onClick={() => scroll(1)}
            className="absolute top-[38%] right-1 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-elevated/90 text-fg opacity-0 shadow-lg transition-opacity group-hover/shelf:opacity-100 md:flex"
          >
            <ChevronRight className="size-5" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function ShelfView({ shelf }: { shelf: ShelfData }) {
  switch (shelf.kind) {
    case "tracks":
      return (
        <Shelf title={shelf.title}>
          {shelf.items.map((x) => (
            <div key={x.id} className="snap-start">
              <TrackCard track={x} />
            </div>
          ))}
        </Shelf>
      );
    case "releases":
      return (
        <Shelf title={shelf.title}>
          {shelf.items.map((x) => (
            <div key={x.id} className="snap-start">
              <ReleaseCard release={x} />
            </div>
          ))}
        </Shelf>
      );
    case "artists":
      return (
        <Shelf title={shelf.title}>
          {shelf.items.map((x) => (
            <div key={x.id} className="snap-start">
              <ArtistCard artist={x} />
            </div>
          ))}
        </Shelf>
      );
    case "playlists":
      return (
        <Shelf title={shelf.title}>
          {shelf.items.map((x) => (
            <div key={x.id} className="snap-start">
              <PlaylistCard playlist={x} />
            </div>
          ))}
        </Shelf>
      );
    case "genres":
      return (
        <section>
          <SectionHeader title={shelf.title} href="/search" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {shelf.items.slice(0, 12).map((g) => (
              <GenreCard key={g.id} genre={g} />
            ))}
          </div>
        </section>
      );
  }
}

/** Швидкий доступ на головній (нещодавнє): капсула з круглою обкладинкою; наведення — кнопка відтворення на ній. */
export function QuickTile({
  href,
  title,
  cover,
  onPlay,
}: {
  href: string;
  title: string;
  cover: ReactNode;
  onPlay?: () => void;
}) {
  const t = useT();
  return (
    <Link
      href={href}
      className="group flex h-12 max-w-[300px] min-w-0 items-center gap-2.5 rounded-full border border-line/70 bg-surface-1/60 py-1 pr-4 pl-1 backdrop-blur transition-colors hover:border-accent/50 hover:bg-surface-2/70"
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
        {cover}
        {onPlay ? (
          <button
            type="button"
            aria-label={t("common.play")}
            onClick={(e) => {
              e.preventDefault();
              onPlay();
            }}
            className="absolute inset-0 hidden items-center justify-center bg-black/55 text-accent opacity-0 transition-opacity group-hover:opacity-100 md:flex"
          >
            <svg viewBox="0 0 16 16" className="size-4 translate-x-[1px]" fill="currentColor" aria-hidden>
              <path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          </button>
        ) : null}
      </span>
      <span className="truncate text-[13.5px] font-semibold">{title}</span>
    </Link>
  );
}
