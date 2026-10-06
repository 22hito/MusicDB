"use client";
/** Сторінки з v1: «Що послухати», «Топ 100», «Всі виконавці», «Рекомендовано для вас». */
import { type Artist, type ChartEntry, endpoints, type Track } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import { useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { MEDALS } from "@musicdb/tokens";
import { Crown, Play, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArtistCard } from "@/components/music/cards";
import { ArtistLinks, Equalizer, LikeButton, PlayContextButton } from "@/components/music/common";
import { useTrackMenu } from "@/components/music/track-actions";
import { TrackList } from "@/components/music/track-list";
import { Button } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { PageTitle, Segmented } from "@/components/ui/heading";
import { ContextMenu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { useI18n, useT } from "@/lib/i18n";
import { exploreTiles } from "@/lib/nav";
import { playerStore, usePlayer } from "@/player/store";

// ─── Що послухати ─────────────────────────────────────────────────────────

export function ExploreView() {
  const t = useT();
  return (
    <div className="pb-10">
      <PageTitle pre={t("explore.headingPre")} accent={t("explore.headingAccent")} />
      <div className="grid gap-3 px-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-3 2xl:grid-cols-4">
        {exploreTiles(t).map((tile, i) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group relative flex animate-rise items-center gap-4 overflow-hidden rounded-lg border border-line bg-surface-2/60 p-4 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform group-hover:scale-110">
              <tile.icon className="size-6" />
            </span>
            <span className="min-w-0">
              <strong className="block font-serif text-lg font-semibold">{tile.title}</strong>
              <span className="mt-0.5 block text-sm text-muted">{tile.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Топ 100 ──────────────────────────────────────────────────────────────

type ChartTrack = ChartEntry;
const periods = ["day", "week", "month", "all"] as const;
const chartSources = ["all", "catalog", "community"] as const;

export function TopView() {
  const t = useT();
  const [period, setPeriod] = useState<(typeof periods)[number]>("week");
  const [source, setSource] = useState<(typeof chartSources)[number]>("all");
  const [genre, setGenre] = useState<{ slug: string; name: string } | null>(null);
  const genres = useEndpoint(endpoints.genres.list);
  const topGenres = useMemo(
    () => [...(genres.data?.items ?? [])].sort((a, b) => b.trackCount - a.trackCount).slice(0, 14),
    [genres.data],
  );
  const { data, isLoading } = useEndpoint(endpoints.discover.charts, {
    query: {
      period,
      limit: 100,
      ...(source !== "all" ? { source } : {}),
      ...(genre ? { genre: genre.slug } : {}),
    },
  });
  const tracks = (data?.items ?? []) as ChartTrack[];
  const context = {
    type: "chart" as const,
    id: `${period}-${source}-${genre?.slug ?? "all"}`,
    name: [t("nav.top"), t(`top.${period}`), genre?.name].filter(Boolean).join(" · "),
  };
  const leader = Math.max(1, tracks[0]?.listeners ?? 0, tracks[0]?.plays ?? 0);
  const value = (x: ChartTrack) => x.listeners || x.plays;
  const play = (i: number) => playerStore.getState().playContext(tracks, i, context);
  return (
    <div className="pb-10">
      <PageTitle
        pre={t("top.headingPre")}
        accent={t("top.headingAccent")}
        sub={t("top.sub")}
        actions={
          <>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={periods.map((p) => ({ value: p, label: t(`top.${p}`) }))}
            />
            <PlayContextButton tracks={tracks} context={context} size="md" />
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-4 pb-5 sm:px-6">
        <Segmented
          value={source}
          onChange={setSource}
          options={chartSources.map((x) => ({
            value: x,
            label:
              x === "all"
                ? t("top.sourceAll")
                : t(x === "catalog" ? "catalog.sourceCatalog" : "catalog.sourceCommunity"),
          }))}
        />
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-[13px] font-semibold transition-colors",
              !genre
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-fg-2 hover:border-accent/60",
            )}
          >
            {t("top.allGenres")}
          </button>
          {topGenres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGenre(genre?.slug === g.slug ? null : g)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                genre?.slug === g.slug
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-fg-2 hover:border-accent/60",
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="mx-4 h-72 animate-pulse rounded-xl bg-surface-2/60 sm:mx-6" />
      ) : tracks.length === 0 ? (
        <p className="px-6 py-16 text-center text-muted">{t("top.empty")}</p>
      ) : (
        <>
          <Podium tracks={tracks.slice(0, 3)} onPlay={play} context={context} />
          <ol className="mt-6 space-y-1 px-2 sm:px-4">
            {tracks.slice(3).map((x, i) => (
              <TopRow
                key={x.id}
                track={x}
                share={value(x) / leader}
                onPlay={() => play(i + 3)}
                context={context}
              />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function useCurrent(trackId: string, context: { type: string; id?: string }) {
  return usePlayer(
    (s) =>
      s.current?.track.id === trackId &&
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null),
  );
}

/** П'єдестал 2 · 1 · 3: обкладинки, медалі, кількість слухачів. */
function Podium({
  tracks,
  onPlay,
  context,
}: {
  tracks: ChartTrack[];
  onPlay: (i: number) => void;
  context: { type: string; id?: string };
}) {
  const order = [1, 0, 2].filter((i) => tracks[i]);
  return (
    <div className="grid grid-cols-3 items-end gap-2 px-4 sm:gap-5 sm:px-6 lg:mx-auto lg:max-w-4xl">
      {order.map((i) => (
        <PodiumPlace
          key={tracks[i]!.id}
          track={tracks[i]!}
          place={i}
          onPlay={() => onPlay(i)}
          context={context}
        />
      ))}
    </div>
  );
}

function PodiumPlace({
  track,
  place,
  onPlay,
  context,
}: {
  track: ChartTrack;
  place: number;
  onPlay: () => void;
  context: { type: string; id?: string };
}) {
  const t = useT();
  const current = useCurrent(track.id, context);
  const medal = MEDALS[place]!;
  const heights = ["h-28 sm:h-36", "h-20 sm:h-24", "h-14 sm:h-16"];
  return (
    <div
      className="flex min-w-0 animate-rise flex-col items-center"
      style={{ animationDelay: `${place * 90}ms` }}
    >
      <button
        type="button"
        onClick={onPlay}
        className={cn(
          "group relative w-full max-w-[220px] overflow-hidden rounded-lg shadow-xl shadow-black/40 ring-2 transition-transform hover:-translate-y-1",
          place === 0 && "max-w-[240px]",
        )}
        style={{ ["--tw-ring-color" as string]: medal }}
        aria-label={`${t("common.play")} ${track.title}`}
      >
        <Cover
          src={track.release?.coverUrl}
          alt=""
          size={240}
          seed={track.id}
          rounded="none"
          className="w-full"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="accent-grad flex size-12 items-center justify-center rounded-full">
            <Play className="size-5 translate-x-[1px]" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
        {place === 0 ? (
          <Crown
            className="absolute top-2 left-2 size-6 drop-shadow"
            style={{ color: medal }}
            fill="currentColor"
            aria-hidden
          />
        ) : null}
      </button>
      <div className="mt-2 w-full min-w-0 text-center">
        <Link
          href={`/track/${track.id}`}
          className={cn(
            "block truncate text-sm font-bold hover:underline sm:text-base",
            current && "text-accent",
          )}
        >
          {track.title}
        </Link>
        <ArtistLinks artists={track.artists} className="block truncate text-xs text-muted sm:text-sm" />
      </div>
      <div
        className={cn(
          "mt-2 flex w-full flex-col items-center justify-start rounded-t-lg pt-2",
          heights[place],
        )}
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${medal} 34%, transparent), color-mix(in srgb, ${medal} 6%, transparent))`,
        }}
      >
        <span className="font-serif text-2xl font-bold sm:text-4xl" style={{ color: medal }}>
          {place + 1}
        </span>
        <span className="text-[11px] text-fg-2 sm:text-xs">
          {t("top.listeners", { count: track.listeners || track.plays })}
        </span>
        <Movement track={track} />
      </div>
    </div>
  );
}

/** Рух у чарті відносно попереднього періоду (як у Billboard / Last.fm). */
function Movement({ track, className }: { track: ChartTrack; className?: string }) {
  const t = useT();
  if (track.isNew)
    return (
      <span
        className={cn(
          "mt-1 rounded bg-accent px-1 text-[9px] font-black tracking-wide text-on-accent",
          className,
        )}
      >
        {t("top.isNew")}
      </span>
    );
  if (track.previousRank === null) return null;
  const delta = track.previousRank - track.rank;
  if (delta === 0)
    return (
      <span title={t("top.same")} className={cn("mt-1 text-[10px] text-subtle", className)}>
        —
      </span>
    );
  const up = delta > 0;
  return (
    <span
      title={t(up ? "top.up" : "top.down", { count: Math.abs(delta) })}
      className={cn(
        "mt-1 flex items-center text-[10px] font-bold tabular-nums",
        up ? "text-success" : "text-danger",
        className,
      )}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

function TopRow({
  track,
  share,
  onPlay,
  context,
}: {
  track: ChartTrack;
  share: number;
  onPlay: () => void;
  context: { type: string; id?: string };
}) {
  const t = useT();
  const current = useCurrent(track.id, context);
  const playing = usePlayer((s) => s.status === "playing");
  const menu = useTrackMenu(track);
  return (
    <ContextMenu items={menu}>
      <li
        className="group grid grid-cols-[32px_48px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2/70"
        onDoubleClick={onPlay}
      >
        <span className="flex flex-col items-center leading-none">
          <span className="font-serif text-lg font-semibold text-muted tabular-nums">
            {current && playing ? <Equalizer /> : track.rank}
          </span>
          <Movement track={track} />
        </span>
        <button
          type="button"
          onClick={onPlay}
          className="relative"
          aria-label={`${t("common.play")} ${track.title}`}
        >
          <Cover src={track.release?.coverUrl} alt="" size={48} seed={track.id} className="w-12" />
          <span className="absolute inset-0 hidden items-center justify-center rounded-md bg-black/50 group-hover:flex">
            <Play className="size-4 text-white" fill="currentColor" strokeWidth={0} />
          </span>
        </button>
        <div className="min-w-0">
          <Link
            href={`/track/${track.id}`}
            className={cn("block truncate text-[15px] font-medium hover:underline", current && "text-accent")}
          >
            {track.title}
          </Link>
          <ArtistLinks artists={track.artists} className="block truncate text-[13px] text-muted" />
          {/* Смужка — частка слухачів відносно лідера. */}
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-lo to-accent"
              style={{ width: `${Math.max(3, share * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-[13px] text-muted">
          {track.listeners || track.plays ? (
            <span className="hidden tabular-nums sm:inline">
              {t("top.listeners", { count: track.listeners || track.plays })}
            </span>
          ) : null}
          <LikeButton track={track} size="sm" />
          <span className="hidden w-10 text-right tabular-nums md:inline">
            {formatDuration(track.durationMs)}
          </span>
        </div>
      </li>
    </ContextMenu>
  );
}

// ─── Всі виконавці ────────────────────────────────────────────────────────

const artistSorts = ["popular", "tracks", "followers", "name", "name_desc", "newest"] as const;

export function ArtistsView() {
  const t = useT();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const [sort, setSort] = useState<(typeof artistSorts)[number]>("popular");
  const list = useInfiniteEndpoint(endpoints.artists.list, {
    query: { sort, limit: 48, ...(query ? { q: query } : {}) },
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Artist[]) ?? [], [list.data]);
  return (
    <div className="pb-10">
      <PageTitle pre={t("artists.headingPre")} accent={t("artists.headingAccent")} />
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-6">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("artists.search")}
            className="h-10 w-full rounded-full border border-line bg-surface-2/70 pr-3 pl-9 text-sm outline-none focus:border-accent"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label={t("catalog.sort")}
          className="h-10 rounded-full border border-line bg-surface-2/70 px-3 text-sm outline-none focus:border-accent"
        >
          {artistSorts.map((s) => (
            <option key={s} value={s}>
              {t(`artists.${s}`)}
            </option>
          ))}
        </select>
      </div>
      {!list.isLoading && items.length === 0 ? (
        <p className="px-6 py-16 text-center text-muted">{t("artists.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 px-2.5 sm:grid-cols-3 sm:px-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {items.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      )}
      {list.hasNextPage ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
            {t("wheel.more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Рекомендовано для вас ────────────────────────────────────────────────

export function RecommendationsView() {
  const { t } = useI18n();
  const me = useMe().data;
  const { data, isLoading } = useEndpoint(
    endpoints.discover.recommendations,
    { query: { limit: 50 } },
    {
      enabled: !!me,
    },
  );
  const items = (data?.items ?? []) as (Track & { reason: string })[];
  const context = { type: "recommendations" as const, name: t("nav.recommendations") };
  return (
    <div className="pb-10">
      <PageTitle
        pre={t("rec.headingPre")}
        accent={t("rec.headingAccent")}
        actions={items.length ? <PlayContextButton tracks={items} context={context} size="md" /> : null}
      />
      {!me ? (
        <div className="px-6 py-16 text-center">
          <p className="mb-4 text-muted">{t("taste.loginHint")}</p>
          <Button asChild>
            <Link href="/login?next=/recommendations">{t("common.signIn")}</Link>
          </Button>
        </div>
      ) : isLoading ? (
        <div className="mx-4 h-64 animate-pulse rounded-xl bg-surface-2/60 sm:mx-6" />
      ) : items.length === 0 ? (
        <p className="px-6 py-16 text-center text-muted">{t("rec.empty")}</p>
      ) : (
        <div className="px-2 sm:px-4">
          <TrackList items={items.map((track) => ({ track }))} context={context} />
        </div>
      )}
    </div>
  );
}
