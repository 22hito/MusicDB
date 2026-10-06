"use client";
import { endpoints, type SearchResults, type TopResult } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { ArtistCard, GenreCard, PlaylistCard, ReleaseCard, Shelf } from "@/components/music/cards";
import { ArtistLinks, PlayContextButton } from "@/components/music/common";
import { TrackList } from "@/components/music/track-list";
import { Avatar, Cover } from "@/components/ui/cover";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

type Filter = "all" | "track" | "artist" | "release" | "playlist" | "user";

export function SearchView() {
  const t = useT();
  const params = useSearchParams();
  const q = useDeferredValue(params.get("q")?.trim() ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const results = useEndpoint(
    endpoints.discover.search,
    { query: { q, limit: filter === "all" ? 10 : 50, ...(filter !== "all" ? { types: [filter] } : {}) } },
    { enabled: q.length > 0, placeholderData: keepPreviousData, staleTime: 60_000 },
  );

  if (!q) return <BrowseAll />;

  const data = results.data;
  const nothing =
    data &&
    !data.top &&
    !data.tracks.length &&
    !data.artists.length &&
    !data.releases.length &&
    !data.playlists.length &&
    !data.users.length;
  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("search.all") },
    { key: "track", label: t("search.songs") },
    { key: "artist", label: t("search.artists") },
    { key: "release", label: t("search.albums") },
    { key: "playlist", label: t("search.playlists") },
    { key: "user", label: t("search.profiles") },
  ];

  return (
    <div className="space-y-6 px-4 pt-2 sm:px-6">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-sm font-semibold transition-colors",
              filter === f.key ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {nothing ? (
        <div className="py-20 text-center">
          <p className="text-2xl font-bold">{t("search.noResults", { query: q })}</p>
          <p className="mt-2 text-muted">{t("search.noResultsHint")}</p>
        </div>
      ) : null}

      {data && filter === "all" ? <AllResults data={data} /> : null}
      {data && filter === "track" ? (
        <TrackList
          items={data.tracks.map((track) => ({ track }))}
          context={{ type: "search", id: q, name: q }}
        />
      ) : null}
      {data && filter !== "all" && filter !== "track" ? (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {filter === "artist" && data.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
          {filter === "release" && data.releases.map((r) => <ReleaseCard key={r.id} release={r} />)}
          {filter === "playlist" && data.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
          {filter === "user" &&
            data.users.map((u) => (
              <Link
                key={u.id}
                href={`/user/${u.username ?? u.id}`}
                className="flex flex-col items-center gap-3 rounded-lg p-4 hover:bg-surface-2"
              >
                <Avatar src={u.image} name={u.name} size={140} />
                <span className="truncate font-semibold">{u.name}</span>
              </Link>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function AllResults({ data }: { data: SearchResults }) {
  const t = useT();
  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {data.top ? (
          <section>
            <h2 className="mb-3 serif-title text-[24px]">{t("search.topResult")}</h2>
            <TopCard top={data.top} />
          </section>
        ) : null}
        {data.tracks.length ? (
          <section className="min-w-0">
            <h2 className="mb-3 serif-title text-[24px]">{t("search.songs")}</h2>
            <div className="-mx-4">
              <TrackList
                items={data.tracks.slice(0, 4).map((track) => ({ track }))}
                context={{ type: "search", id: data.query, name: data.query }}
                showAlbum={false}
                header={false}
              />
            </div>
          </section>
        ) : null}
      </div>
      {data.artists.length ? (
        <Shelf title={t("search.artists")}>
          {data.artists.map((a) => (
            <div key={a.id} className="snap-start">
              <ArtistCard artist={a} />
            </div>
          ))}
        </Shelf>
      ) : null}
      {data.releases.length ? (
        <Shelf title={t("search.albums")}>
          {data.releases.map((r) => (
            <div key={r.id} className="snap-start">
              <ReleaseCard release={r} />
            </div>
          ))}
        </Shelf>
      ) : null}
      {data.playlists.length ? (
        <Shelf title={t("search.playlists")}>
          {data.playlists.map((p) => (
            <div key={p.id} className="snap-start">
              <PlaylistCard playlist={p} />
            </div>
          ))}
        </Shelf>
      ) : null}
      {data.genres.length ? (
        <section>
          <h2 className="mb-3 serif-title text-[24px]">{t("search.genres")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
            {data.genres.slice(0, 6).map((g) => (
              <GenreCard key={g.id} genre={g} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TopCard({ top }: { top: TopResult }) {
  const t = useT();
  const shell =
    "group relative flex h-[calc(100%-44px)] min-h-[220px] flex-col gap-4 rounded-lg bg-surface-2 p-5 transition-colors hover:bg-surface-3";
  switch (top.type) {
    case "artist":
      return (
        <Link href={`/artist/${top.item.slug}`} className={shell}>
          <Cover
            src={top.item.imageUrl}
            alt=""
            size={96}
            seed={top.item.id}
            rounded="full"
            className="size-24 shadow-xl"
          />
          <div>
            <div className="text-3xl font-extrabold tracking-tight">{top.item.name}</div>
            <span className="mt-1 inline-block rounded-full bg-bg/60 px-3 py-1 text-xs font-bold">
              {t("library.artist")}
            </span>
          </div>
          <div className="absolute right-5 bottom-5 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <PlayContextButton
              size="md"
              context={{ type: "artist", id: top.item.id, name: top.item.name }}
              tracks={async () => (await api.artists.get({ params: { id: top.item.id } })).topTracks}
            />
          </div>
        </Link>
      );
    case "track":
      return (
        <Link href={`/track/${top.item.id}`} className={shell}>
          <Cover
            src={top.item.release?.coverUrl}
            alt=""
            size={96}
            seed={top.item.id}
            className="size-24 shadow-xl"
          />
          <div className="min-w-0">
            <div className="truncate text-3xl font-extrabold tracking-tight">{top.item.title}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted">
              <ArtistLinks artists={top.item.artists} />
              <span className="rounded-full bg-bg/60 px-3 py-1 text-xs font-bold text-fg">
                {t("search.songs")}
              </span>
            </div>
          </div>
          <div className="absolute right-5 bottom-5 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <PlayContextButton
              size="md"
              context={{ type: "search", id: top.item.id, name: top.item.title }}
              trackId={top.item.id}
              tracks={[top.item]}
            />
          </div>
        </Link>
      );
    case "release":
      return (
        <Link href={`/album/${top.item.id}`} className={shell}>
          <Cover src={top.item.coverUrl} alt="" size={96} seed={top.item.id} className="size-24 shadow-xl" />
          <div>
            <div className="text-3xl font-extrabold tracking-tight">{top.item.title}</div>
            <div className="mt-1 text-sm text-muted">{top.item.artists.map((a) => a.name).join(", ")}</div>
          </div>
        </Link>
      );
    case "playlist":
      return (
        <Link href={`/playlist/${top.item.id}`} className={shell}>
          <Cover
            src={top.item.coverUrl}
            mosaic={top.item.mosaic}
            alt=""
            size={96}
            seed={top.item.id}
            className="size-24 shadow-xl"
          />
          <div className="text-3xl font-extrabold tracking-tight">{top.item.title}</div>
        </Link>
      );
    case "user":
      return (
        <Link href={`/user/${top.item.username ?? top.item.id}`} className={shell}>
          <Avatar src={top.item.image} name={top.item.name} size={96} />
          <div className="text-3xl font-extrabold tracking-tight">{top.item.name}</div>
        </Link>
      );
    case "genre":
      return <GenreCard genre={top.item} className="h-[calc(100%-44px)] min-h-[220px]" />;
  }
}

function BrowseAll() {
  const t = useT();
  const { data } = useEndpoint(endpoints.genres.list, undefined, { staleTime: 10 * 60_000 });
  return (
    <div className="px-4 pt-2 sm:px-6">
      <h1 className="mb-4 serif-title text-2xl">{t("search.browseAll")}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {(data?.items ?? []).slice(0, 60).map((g) => (
          <GenreCard key={g.id} genre={g} />
        ))}
      </div>
    </div>
  );
}
