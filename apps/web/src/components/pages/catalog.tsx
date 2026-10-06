"use client";
/**
 * Головна таблиця з v1: статистика, три джерела (каталог, ком'юніті, «у фоні»), пошук, жанр, десятиліття,
 * сортування колонок, перемішування й нескінченне підвантаження. Усі фільтри — в адресі сторінки,
 * тож відфільтрованою таблицею можна поділитися посиланням.
 */
import { endpoints, type Track } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import { useEndpoint, useInfiniteEndpoint } from "@musicdb/sdk/react";
import {
  ArrowDown,
  ArrowUp,
  Disc3,
  Headphones,
  MoreHorizontal,
  Plus,
  Search,
  Shuffle,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArtistLinks, Equalizer, ExplicitBadge, LikeButton } from "@/components/music/common";
import { useTrackMenu } from "@/components/music/track-actions";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Cover } from "@/components/ui/cover";
import { CountUp, PageTitle, Segmented } from "@/components/ui/heading";
import { ContextMenu, DropdownMenu } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n, useT } from "@/lib/i18n";
import { useScrollElement } from "@/lib/scroll";
import { useTouchDevice } from "@/lib/use-touch-device";
import { playerStore, usePlayer } from "@/player/store";

type Source = "catalog" | "community" | "background";
type Column = "title" | "artist" | "release" | "duration" | "album" | "plays" | "rating";

const sources: Source[] = ["catalog", "community", "background"];
const columns: Column[] = ["title", "artist", "release", "duration", "album", "plays", "rating"];

function filtersFor(source: Source) {
  return source === "background" ? ({ playable: "audio" } as const) : ({ source, playable: "any" } as const);
}

export function CatalogView() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // «У фоні» має сенс лише на телефоні/планшеті: на комп'ютері у фоні грає все.
  const touch = useTouchDevice();
  const requested = (sources as string[]).includes(params.get("source") ?? "")
    ? (params.get("source") as Source)
    : "catalog";
  const source: Source = requested === "background" && !touch ? "catalog" : requested;
  const genre = params.get("genre") ?? "";
  const decadeParam = Number(params.get("decade"));
  const decade = decadeParam >= 1900 && decadeParam % 10 === 0 ? decadeParam : null;
  const sortParam = params.get("sort")?.split(":") ?? [];
  const sort =
    (columns as string[]).includes(sortParam[0] ?? "") && (sortParam[1] === "asc" || sortParam[1] === "desc")
      ? { column: sortParam[0] as Column, dir: sortParam[1] as "asc" | "desc" }
      : null;

  /** Оновлює параметри адреси (порожнє значення — прибрати), без прокрутки нагору. */
  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const setSource = (s: Source) => setParams({ source: s === "catalog" ? null : s });
  const setGenre = (g: string) => setParams({ genre: g || null });
  const setSort = (s: { column: Column; dir: "asc" | "desc" } | null) =>
    setParams({ sort: s ? `${s.column}:${s.dir}` : null });

  // Пошук — у полі одразу, в адресі — із затримкою.
  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q.trim());
  const urlQ = params.get("q") ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: синхронізуємо лише текст пошуку
  useEffect(() => {
    if (query === urlQ) return;
    const id = setTimeout(() => setParams({ q: query || null }), 350);
    return () => clearTimeout(id);
  }, [query, urlQ]);
  const timeline = useEndpoint(endpoints.discover.timeline);

  const stats = useEndpoint(endpoints.discover.stats, { query: filtersFor(source) });
  const genres = useEndpoint(endpoints.genres.list);
  const genreOptions = useMemo(
    () =>
      [...(genres.data?.items ?? [])]
        .filter((g) => g.trackCount > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [genres.data],
  );

  const baseQuery = {
    ...filtersFor(source),
    ...(genre ? { genre } : {}),
    ...(query ? { q: query } : {}),
    ...(decade ? { decade } : {}),
  };
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: {
      ...baseQuery,
      limit: 50,
      ...(sort ? { column: sort.column, dir: sort.dir } : { sort: "popular" }),
    },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const context = {
    type: "catalog" as const,
    id: source,
    name: t(`catalog.source${source[0]!.toUpperCase()}${source.slice(1)}` as "catalog.sourceCatalog"),
  };

  const toggleSort = (column: Column) => {
    const first = column === "plays" || column === "rating" ? "desc" : "asc";
    setSort(
      sort?.column !== column
        ? { column, dir: first }
        : sort.dir === first
          ? { column, dir: first === "asc" ? "desc" : "asc" }
          : null,
    );
  };

  const shuffle = async () => {
    const seed = Math.random().toString(36).slice(2, 10);
    const res = await api.tracks.browse({ query: { ...baseQuery, sort: "random", seed, limit: 100 } });
    if (res.items.length) playerStore.getState().playContext(res.items, 0, context);
  };

  // Нескінченне підвантаження: сторожовий елемент біля кінця таблиці.
  const sentinel = useRef<HTMLDivElement>(null);
  const root = useScrollElement();
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && list.hasNextPage && !list.isFetchingNextPage)
          void list.fetchNextPage();
      },
      { root, rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root, list.hasNextPage, list.isFetchingNextPage, list.fetchNextPage]);

  const heading = {
    catalog: [t("catalog.headingPre"), t("catalog.headingAccent")],
    community: [t("catalog.communityPre"), t("catalog.communityAccent")],
    background: [t("catalog.backgroundPre"), t("catalog.backgroundAccent")],
  }[source];

  const statCards = [
    { label: t("catalog.statSongs"), value: stats.data?.tracks, kind: "songs" },
    { label: t("catalog.statGenres"), value: stats.data?.genres, kind: "genres" },
    { label: t("catalog.statAlbums"), value: stats.data?.albums, kind: "albums" },
    { label: t("catalog.statSingles"), value: stats.data?.singles, kind: "singles" },
  ];

  return (
    <div className="pb-10">
      <div className="grid grid-cols-2 gap-3 px-4 pt-4 sm:px-6 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <div
            key={s.kind}
            className="animate-rise rounded-lg border border-line bg-surface-2/60 px-4 py-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="text-[13px] font-medium text-muted">{s.label}</div>
            <div className="stat-num mt-0.5 text-3xl">
              {s.value === undefined ? <span className="text-subtle">—</span> : <CountUp value={s.value} />}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pt-5 sm:px-6">
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            {
              value: "catalog",
              label: (
                <>
                  <Disc3 className="size-4" /> {t("catalog.sourceCatalog")}
                </>
              ),
            },
            {
              value: "community",
              label: (
                <>
                  <Users className="size-4" /> {t("catalog.sourceCommunity")}
                </>
              ),
            },
            ...(touch
              ? [
                  {
                    value: "background" as const,
                    label: (
                      <>
                        <Headphones className="size-4" /> {t("catalog.sourceBackground")}
                      </>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <PageTitle
        pre={heading[0]!}
        accent={heading[1]!}
        {...(source !== "catalog"
          ? { sub: source === "community" ? t("catalog.communityHint") : t("catalog.backgroundHint") }
          : {})}
        className="pt-3 pb-3"
      />

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
        <label className="relative min-w-[240px] flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="h-10 w-full rounded-full border border-line bg-surface-2/70 pr-9 pl-9 text-sm outline-none focus:border-accent"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("common.close")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          aria-label={t("catalog.genres")}
          className="h-10 max-w-[220px] flex-1 rounded-full border border-line bg-surface-2/70 px-3 text-sm outline-none focus:border-accent"
        >
          <option value="">{t("catalog.allGenres")}</option>
          {genreOptions.map((g) => (
            <option key={g.id} value={g.slug}>
              {g.name} ({g.trackCount})
            </option>
          ))}
        </select>
        <select
          value={decade ?? ""}
          onChange={(e) => setParams({ decade: e.target.value || null })}
          aria-label={t("catalog.decade")}
          className="h-10 max-w-[160px] flex-1 rounded-full border border-line bg-surface-2/70 px-3 text-sm outline-none focus:border-accent"
        >
          <option value="">{t("catalog.allDecades")}</option>
          {(timeline.data?.decades ?? [])
            .slice()
            .reverse()
            .map((d) => (
              <option key={d.decade} value={d.decade}>
                {t("catalog.decadeShort", { decade: String(d.decade) })} ({d.tracks})
              </option>
            ))}
        </select>
        <Button variant="outline" onClick={shuffle}>
          <Shuffle className="size-4" /> {t("common.shuffle")}
        </Button>
        <Button asChild className="ml-auto">
          <Link href="/upload">
            <Plus className="size-4" /> {source === "community" ? t("catalog.addOwn") : t("catalog.request")}
          </Link>
        </Button>
      </div>

      {genre || decade ? (
        <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-6">
          {genre ? (
            <button
              type="button"
              onClick={() => setGenre("")}
              className="inline-flex h-7 animate-pop items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent"
            >
              {genreOptions.find((g) => g.slug === genre)?.name ?? genre} <X className="size-3.5" />
            </button>
          ) : null}
          {decade ? (
            <button
              type="button"
              onClick={() => setParams({ decade: null })}
              className="inline-flex h-7 animate-pop items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent"
            >
              {t("catalog.decadeShort", { decade: String(decade) })} <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="px-2 sm:px-4">
        <div className="overflow-x-auto rounded-lg border border-line bg-surface-1/60">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface-1/95 backdrop-blur">
              <tr className="border-b border-line text-left text-[12px] font-semibold tracking-wide text-muted uppercase">
                <th className="w-12 px-3 py-2.5 text-center">{t("catalog.number")}</th>
                <SortTh
                  label={t("catalog.title")}
                  column="title"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-auto"
                />
                <SortTh
                  label={t("catalog.artist")}
                  column="artist"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden w-[13%] md:table-cell"
                />
                <SortTh
                  label={t("catalog.album")}
                  column="album"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden w-[12%] xl:table-cell"
                />
                <th className="hidden w-[14%] px-3 py-2.5 lg:table-cell">{t("catalog.genres")}</th>
                <SortTh
                  label={t("catalog.release")}
                  column="release"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden w-28 2xl:table-cell"
                />
                <SortTh
                  label={t("catalog.plays")}
                  column="plays"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden w-24 sm:table-cell"
                  align="right"
                />
                <SortTh
                  label={t("catalog.rating")}
                  column="rating"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden w-24 md:table-cell"
                  align="right"
                />
                {source === "community" ? (
                  <th className="hidden w-[13%] px-3 py-2.5 lg:table-cell">{t("catalog.submittedBy")}</th>
                ) : null}
                <SortTh
                  label={t("catalog.duration")}
                  column="duration"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-24"
                  align="right"
                />
                <th className="w-20 px-2" />
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, i) => (
                <CatalogRow
                  key={track.id}
                  track={track}
                  index={i}
                  context={context}
                  showUploader={source === "community"}
                  showBackground={touch}
                  onGenre={setGenre}
                  onPlay={() => playerStore.getState().playContext(tracks, i, context)}
                />
              ))}
              {list.isLoading
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="px-3 py-2">
                        <div className="skeleton h-9 rounded-md" />
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
          {!list.isLoading && tracks.length === 0 ? (
            <p className="px-6 py-14 text-center text-muted">{t("search.noResults", { query: q || "…" })}</p>
          ) : null}
        </div>
        <div ref={sentinel} className="h-8" />
        {list.isFetchingNextPage ? <div className="skeleton mx-2 h-9 rounded-md" /> : null}
      </div>
    </div>
  );
}

function SortTh({
  label,
  column,
  sort,
  onSort,
  className,
  align,
}: {
  label: string;
  column: Column;
  sort: { column: Column; dir: "asc" | "desc" } | null;
  onSort: (c: Column) => void;
  className?: string;
  align?: "right";
}) {
  const active = sort?.column === column;
  return (
    <th
      className={cn("px-3 py-2.5", align === "right" && "text-right", className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 uppercase transition-colors hover:text-fg",
          active && "text-accent",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : null}
      </button>
    </th>
  );
}

/** Оцінка 0–100 кольоровим чипом, як у v1. */
function RatingChip({ value, count }: { value: number | null; count: number }) {
  if (value === null || count === 0) return <span className="text-subtle">—</span>;
  const v = Math.round(value);
  const tone =
    v >= 80
      ? "text-success bg-success/12"
      : v >= 60
        ? "text-accent bg-accent-soft"
        : v >= 40
          ? "text-warning bg-warning/12"
          : "text-danger bg-danger/12";
  return (
    <span
      title={`${count}`}
      className={cn(
        "inline-flex min-w-9 justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
        tone,
      )}
    >
      {v}
    </span>
  );
}

function CatalogRow({
  track,
  index,
  context,
  showUploader,
  showBackground,
  onGenre,
  onPlay,
}: {
  track: Track;
  index: number;
  context: { type: string; id?: string };
  showUploader: boolean;
  showBackground: boolean;
  onGenre: (slug: string) => void;
  onPlay: () => void;
}) {
  const { t, locale } = useI18n();
  const menu = useTrackMenu(track);
  const current = usePlayer(
    (s) =>
      s.current?.track.id === track.id &&
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null),
  );
  const playing = usePlayer((s) => s.status === "playing");
  return (
    <ContextMenu items={menu}>
      <tr
        className="group border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2/70"
        onDoubleClick={onPlay}
      >
        <td className="px-3 py-1.5 text-center text-muted tabular-nums">
          <span className="group-hover:hidden">{current && playing ? <Equalizer /> : index + 1}</span>
          <button
            type="button"
            onClick={onPlay}
            aria-label={`${t("common.play")} ${track.title}`}
            className="hidden text-fg group-hover:inline"
          >
            ▶
          </button>
        </td>
        <td className="max-w-0 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-3">
            <Cover src={track.release?.coverUrl} alt="" size={40} seed={track.id} className="w-10 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/track/${track.id}`}
                  className={cn("truncate font-medium text-fg hover:underline", current && "text-accent")}
                >
                  {track.title}
                </Link>
                {track.explicit ? <ExplicitBadge /> : null}
                {showBackground && track.playback.audio ? (
                  <Headphones
                    className="size-3.5 shrink-0 text-success"
                    aria-label={t("track.backgroundPlayable")}
                  />
                ) : null}
              </div>
              <ArtistLinks
                artists={track.artists}
                className="block truncate text-[13px] text-muted md:hidden"
              />
            </div>
          </div>
        </td>
        <td className="hidden max-w-0 px-3 py-1.5 text-muted md:table-cell">
          <ArtistLinks artists={track.artists} className="block truncate" />
        </td>
        <td className="hidden max-w-0 px-3 py-1.5 text-muted xl:table-cell">
          {track.release ? (
            <Link
              href={`/album/${track.release.id}`}
              className="block truncate hover:text-fg hover:underline"
            >
              {track.release.title}
            </Link>
          ) : (
            <span className="text-subtle">—</span>
          )}
        </td>
        <td className="hidden px-3 py-1.5 lg:table-cell">
          <div className="flex gap-1 overflow-hidden">
            {track.genres.slice(0, 2).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGenre(g.slug)}
                className="max-w-full shrink-0 truncate rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-2 transition-colors hover:border-accent hover:text-accent"
              >
                {g.name}
              </button>
            ))}
          </div>
        </td>
        <td className="hidden px-3 py-1.5 text-muted tabular-nums 2xl:table-cell">
          {track.releaseDate
            ? new Date(track.releaseDate).toLocaleDateString(locale === "en" ? "en-GB" : "uk-UA")
            : "—"}
        </td>
        <td className="hidden px-3 py-1.5 text-right text-muted tabular-nums sm:table-cell">
          {track.playCount.toLocaleString("uk-UA")}
        </td>
        <td className="hidden px-3 py-1.5 text-right md:table-cell">
          <RatingChip value={track.rating.average} count={track.rating.count} />
        </td>
        {showUploader ? (
          <td className="hidden max-w-0 px-3 py-1.5 lg:table-cell">
            {track.uploader ? (
              <Link
                href={`/user/${track.uploader.username ?? track.uploader.id}`}
                className="flex min-w-0 items-center gap-2 text-muted hover:text-fg"
              >
                <Avatar src={track.uploader.image} name={track.uploader.name} size={22} />
                <span className="truncate">{track.uploader.name}</span>
              </Link>
            ) : null}
          </td>
        ) : null}
        <td className="px-3 py-1.5 text-right text-muted tabular-nums">{formatDuration(track.durationMs)}</td>
        <td className="px-2 py-1.5">
          <div className="flex items-center justify-end gap-1">
            <LikeButton track={track} size="sm" />
            <DropdownMenu
              items={menu()}
              trigger={
                <IconButton label={t("common.more")} size="sm" className="opacity-60 group-hover:opacity-100">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
            />
          </div>
        </td>
      </tr>
    </ContextMenu>
  );
}
