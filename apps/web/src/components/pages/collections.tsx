"use client";
/** Вподобані пісні, жанр, бібліотека (телефон), чарти. */
import { endpoints, type Genre, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useInfiniteEndpoint, useLibrary, useMe } from "@musicdb/sdk/react";
import { placeholderGradient } from "@musicdb/tokens";
import { Heart, Shuffle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArtistCard, PlaylistCard, ReleaseCard, Shelf } from "@/components/music/cards";
import { PlayContextButton } from "@/components/music/common";
import { ActionBar, Dot, HeaderArt, PageHeader } from "@/components/music/page-header";
import { TrackList } from "@/components/music/track-list";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { useT } from "@/lib/i18n";
import { playerStore } from "@/player/store";

function InfiniteSentinel({ onVisible, enabled }: { onVisible: () => void; enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && onVisible(), {
      rootMargin: "800px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, enabled]);
  return <div ref={ref} className="h-px" />;
}

export function LikedSongsView() {
  const t = useT();
  const me = useMe().data;
  const list = useInfiniteEndpoint(
    endpoints.library.likedTracks,
    { query: { limit: 50 } },
    { enabled: !!me },
  );
  const items = useMemo(
    () =>
      list.data?.pages.flatMap((p) =>
        (p.items as { track: Track; likedAt: string }[]).map((i) => ({ track: i.track, addedAt: i.likedAt })),
      ) ?? [],
    [list.data],
  );
  const library = useLibrary().data;
  const context = { type: "liked" as const, name: t("nav.likedSongs") };
  if (!me) {
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-lg font-bold">{t("auth.signInToLike")}</p>
        <Button asChild>
          <Link href="/login?next=/collection/tracks">{t("common.signIn")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        image={null}
        seed="liked"
        glow="var(--n-accent-lo)"
        art={
          <HeaderArt from="var(--n-accent-lo)" to="var(--n-accent-2)">
            <Heart className="size-[40%] text-white" fill="currentColor" />
          </HeaderArt>
        }
        kind={t("playlist.playlist")}
        title={t("nav.likedSongs")}
        meta={
          <>
            <Avatar src={me.image} name={me.name} size={24} />
            <span className="font-bold">{me.name}</span>
            <Dot />
            <span>{t("library.likedCount", { count: library?.likedCount ?? items.length })}</span>
          </>
        }
      />
      <div className="relative">
        <ActionBar>
          <PlayContextButton tracks={items.map((i) => i.track)} context={context} />
          <IconButton
            label={t("common.shuffle")}
            size="lg"
            onClick={() =>
              playerStore.getState().playContext(
                items.map((i) => i.track),
                0,
                context,
                { shuffle: true },
              )
            }
          >
            <Shuffle className="size-7" />
          </IconButton>
        </ActionBar>
        <div className="px-2 sm:px-4">
          <TrackList items={items} context={context} showAddedAt />
          <InfiniteSentinel
            enabled={!!list.hasNextPage && !list.isFetchingNextPage}
            onVisible={() => list.fetchNextPage()}
          />
        </div>
      </div>
    </div>
  );
}

export function GenreView({
  slug,
  initial,
}: {
  slug: string;
  initial: Genre & { topArtists: import("@musicdb/contracts").Artist[]; related: Genre[] };
}) {
  const t = useT();
  const { data = initial } = useEndpoint(
    endpoints.genres.get,
    { params: { id: slug } },
    { initialData: initial },
  );
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { genre: slug, sort: "popular", limit: 50 },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const [a, b] = placeholderGradient(data.slug);
  const context = { type: "genre" as const, id: data.id, name: data.name };
  return (
    <div>
      <PageHeader
        image={null}
        seed={data.slug}
        glow={a}
        art={
          <HeaderArt from={a} to={b}>
            <span className="font-serif text-6xl font-semibold text-white/90">#</span>
          </HeaderArt>
        }
        kind={t("search.genres")}
        title={data.name}
        meta={<span>{t("release.songs", { count: data.trackCount })}</span>}
      />
      <div className="relative">
        <ActionBar>
          <PlayContextButton tracks={tracks} context={context} />
          <IconButton
            label={t("common.shuffle")}
            size="lg"
            onClick={() => playerStore.getState().playContext(tracks, 0, context, { shuffle: true })}
          >
            <Shuffle className="size-7" />
          </IconButton>
        </ActionBar>
        <div className="space-y-10 px-4 sm:px-6">
          {data.topArtists.length ? (
            <Shelf title={t("search.artists")}>
              {data.topArtists.map((x) => (
                <div key={x.id} className="snap-start">
                  <ArtistCard artist={x} />
                </div>
              ))}
            </Shelf>
          ) : null}
          {data.related.length ? (
            <div className="flex flex-wrap gap-2">
              {data.related.map((g) => (
                <Link
                  key={g.id}
                  href={`/genre/${g.slug}`}
                  className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-surface-3"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          ) : null}
          <section className="-mx-2 sm:-mx-2">
            <TrackList items={tracks.map((track) => ({ track }))} context={context} />
            <InfiniteSentinel
              enabled={!!list.hasNextPage && !list.isFetchingNextPage}
              onVisible={() => list.fetchNextPage()}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

export function LibraryView() {
  const t = useT();
  const me = useMe().data;
  const library = useLibrary().data;
  if (!me) {
    return (
      <div className="px-4 py-24 text-center">
        <p className="mb-2 text-xl font-bold">{t("library.emptyTitle")}</p>
        <p className="mb-6 text-muted">{t("library.emptyText")}</p>
        <Button asChild>
          <Link href="/login?next=/library">{t("common.signIn")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-8 px-4 pt-2 sm:px-6">
      <h1 className="serif-title text-2xl">{t("library.title")}</h1>
      <Link href="/collection/tracks" className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-2">
        <div className="accent-grad flex size-16 items-center justify-center rounded-md">
          <Heart className="size-7" fill="currentColor" />
        </div>
        <div>
          <div className="font-bold">{t("nav.likedSongs")}</div>
          <div className="text-sm text-muted">
            {t("library.likedCount", { count: library?.likedCount ?? 0 })}
          </div>
        </div>
      </Link>
      {library?.playlists.length ? (
        <Shelf title={t("library.playlists")}>
          {library.playlists.map((p) => (
            <div key={p.id} className="snap-start">
              <PlaylistCard playlist={p} />
            </div>
          ))}
        </Shelf>
      ) : null}
      {library?.artists.length ? (
        <Shelf title={t("library.artists")}>
          {library.artists.map((a) => (
            <div key={a.id} className="snap-start">
              <ArtistCard artist={a} />
            </div>
          ))}
        </Shelf>
      ) : null}
      {library?.releases.length ? (
        <Shelf title={t("library.albums")}>
          {library.releases.map((r) => (
            <div key={r.id} className="snap-start">
              <ReleaseCard release={r} />
            </div>
          ))}
        </Shelf>
      ) : null}
    </div>
  );
}
