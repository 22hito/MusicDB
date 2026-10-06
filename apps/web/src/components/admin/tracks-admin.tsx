"use client";
/**
 * Адмінка → «Пісні»: пошук, статус, джерело, «чого бракує», сортування; клік — редагування.
 */
import { type AdminTrackRow, endpoints } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import { useInfiniteEndpoint } from "@musicdb/sdk/react";
import { EyeOff, FileText, MicVocal, Plus, Search, Tags, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { Segmented } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { openTrackEditor } from "./track-editor";

type Missing = "video" | "genres" | "duration" | "lyrics" | "release" | "date";
const MISSING: Missing[] = ["video", "genres", "duration", "lyrics", "release", "date"];

export function TracksAdmin() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "hidden">("all");
  const [source, setSource] = useState<"all" | "catalog" | "community">("all");
  const [missing, setMissing] = useState<Missing | null>(null);
  const [check, setCheck] = useState<"conflict" | "unchecked" | "unmatched" | null>(null);
  const [sort, setSort] = useState<"recent" | "popular" | "title">("recent");

  // Пошук — після паузи в наборі.
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const list = useInfiniteEndpoint(endpoints.admin.tracks, {
    query: {
      limit: 40,
      status,
      source,
      sort,
      ...(q ? { q } : {}),
      ...(missing ? { missing } : {}),
      ...(check ? { check } : {}),
    },
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as AdminTrackRow[]) ?? [], [list.data]);
  const total = (list.data?.pages[0] as { total?: number } | undefined)?.total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("admin.searchSongs")}
            className="h-10 w-full rounded-full bg-surface-2 pr-4 pl-9 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("admin.filter.all") },
            { value: "published", label: t("admin.filter.published") },
            { value: "hidden", label: t("admin.filter.hidden") },
          ]}
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className="h-10 rounded-full bg-surface-2 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">{t("admin.filter.allSources")}</option>
          <option value="catalog">{t("admin.filter.catalog")}</option>
          <option value="community">{t("admin.filter.community")}</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-10 rounded-full bg-surface-2 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="recent">{t("admin.sort.recent")}</option>
          <option value="popular">{t("admin.sort.popular")}</option>
          <option value="title">{t("admin.sort.title")}</option>
        </select>
        <Button onClick={() => openTrackEditor(null)}>
          <Plus className="size-4" /> {t("admin.addSong")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("admin.missingLabel")}</span>
        {MISSING.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMissing(missing === m ? null : m)}
            aria-pressed={missing === m}
            className={cn(
              "h-8 rounded-full border px-3 font-semibold transition-colors",
              missing === m
                ? "border-accent/60 bg-accent-soft text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {t(`admin.miss.${m}`)}
          </button>
        ))}
        <span className="ml-2 text-muted">{t("admin.check.filterLabel")}</span>
        {(
          [
            ["conflict", t("admin.check.fConflict")],
            ["unmatched", t("admin.check.fUnmatched")],
            ["unchecked", t("admin.check.fUnchecked")],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setCheck(check === k ? null : k)}
            aria-pressed={check === k}
            className={cn(
              "h-8 rounded-full border px-3 font-semibold transition-colors",
              check === k
                ? "border-accent/60 bg-accent-soft text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
        {total !== undefined ? (
          <span className="ml-auto text-muted tabular-nums">{t("admin.found", { count: total })}</span>
        ) : null}
      </div>

      <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70">
        {list.isLoading
          ? Array.from({ length: 8 }, (_, i) => (
              <li key={`sk-${i.toString()}`} className="flex items-center gap-3 p-3">
                <div className="skeleton size-11 rounded-md" />
                <div className="skeleton h-4 w-1/3 rounded" />
              </li>
            ))
          : items.map((x) => <Row key={x.id} track={x} />)}
        {!list.isLoading && !items.length ? (
          <li className="py-12 text-center text-muted">{t("common.empty")}</li>
        ) : null}
      </ul>
      {list.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            loading={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {t("wheel.more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Row({ track: x }: { track: AdminTrackRow }) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        onClick={() => openTrackEditor(x.id)}
        className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/70"
      >
        <Cover src={x.coverUrl} alt="" size={44} seed={x.id} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold group-hover:text-accent">{x.title}</span>
            {x.status === "hidden" ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-muted">
                <EyeOff className="size-3" /> {t("admin.f.hidden")}
              </span>
            ) : null}
            {x.source === "community" ? (
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                {t("admin.filter.community")}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[13px] text-muted">
            {x.artists.join(", ")}
            {x.releaseTitle ? ` · ${x.releaseTitle}` : ""}
            {x.releaseDate ? ` · ${x.releaseDate.slice(0, 4)}` : ""}
          </div>
        </div>
        <div className="hidden max-w-[220px] flex-wrap justify-end gap-1 lg:flex">
          {x.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-muted">
              {g}
            </span>
          ))}
        </div>
        {/* Що є в пісні: відео/аудіо, жанри, текст */}
        <div className="flex shrink-0 items-center gap-1.5 text-subtle">
          <Flag ok={!!x.youtubeVideoId || x.hasAudio} label={t("player.video")}>
            <Video className="size-4" />
          </Flag>
          <Flag ok={x.genres.length > 0} label={t("admin.f.genres")}>
            <Tags className="size-4" />
          </Flag>
          <Flag ok={x.hasLyrics} label={t("admin.f.lyrics")}>
            {x.hasLyrics ? <MicVocal className="size-4" /> : <FileText className="size-4" />}
          </Flag>
        </div>
        <span className="w-12 shrink-0 text-right text-[13px] text-muted tabular-nums">
          {x.durationMs ? formatDuration(x.durationMs) : "—"}
        </span>
      </button>
    </li>
  );
}

function Flag({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <span title={label} className={cn("inline-flex", ok ? "text-accent" : "text-subtle/50")}>
      {children}
    </span>
  );
}
