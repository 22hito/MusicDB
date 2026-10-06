"use client";
/**
 * «Машина часу» (замість графа схожості): десятиліття й роки на шкалі, як на радіотюнері — висота поділки
 * показує, скільки пісень того року. Для обраного року чи десятиліття — головні пісні, альбоми, виконавці
 * й жанри; «Слухати» й «Радіо десятиліття». Рік і десятиліття — в адресі сторінки.
 */
import { type Era, endpoints, type Timeline, type Track } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { ChevronLeft, ChevronRight, Play, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArtistCard, ReleaseCard } from "@/components/music/cards";
import { TrackList } from "@/components/music/track-list";
import { Button, IconButton } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/heading";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { playerStore } from "@/player/store";

export function TimeMachineView() {
  return (
    <Suspense>
      <TimeMachine />
    </Suspense>
  );
}

type Selection = { decade: number; year: number | null };

function TimeMachine() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data } = useEndpoint(endpoints.discover.timeline);
  const timeline = data as Timeline | undefined;

  // Початковий вибір: з адреси, інакше — рік, у якому найбільше пісень.
  const selection = useMemo<Selection | null>(() => {
    if (!timeline?.decades.length) return null;
    const year = Number(params.get("year"));
    if (year >= 1900) return { decade: Math.floor(year / 10) * 10, year };
    const decade = Number(params.get("decade"));
    if (decade >= 1900 && decade % 10 === 0) return { decade, year: null };
    const best = timeline.decades
      .flatMap((d) => d.years)
      .reduce((a, b) => (b.tracks > a.tracks ? b : a), { year: 0, tracks: -1 });
    return { decade: Math.floor(best.year / 10) * 10, year: best.year };
  }, [timeline, params]);

  const select = (s: Selection) =>
    router.replace(`${pathname}?${s.year ? `year=${s.year}` : `decade=${s.decade}`}`, { scroll: false });

  const decadeInfo = timeline?.decades.find((d) => d.decade === selection?.decade);
  const allYears = useMemo(
    () => timeline?.decades.flatMap((d) => d.years.map((y) => y.year)) ?? [],
    [timeline],
  );
  const step = (dir: 1 | -1) => {
    if (!selection?.year) return;
    const i = allYears.indexOf(selection.year);
    const next = allYears[i + dir];
    if (next) select({ decade: Math.floor(next / 10) * 10, year: next });
  };

  const from = selection ? (selection.year ?? selection.decade) : null;
  const to = selection ? (selection.year ?? selection.decade + 9) : null;
  const era = useEndpoint(
    endpoints.discover.era,
    { params: { from: from ?? 2000, to: to ?? 2000 } },
    { enabled: from !== null },
  );
  const info = era.data as Era | undefined;
  const label = selection?.year
    ? String(selection.year)
    : t("timeMachine.decade", { decade: String(selection?.decade ?? "") });

  return (
    <div className="pb-10">
      <PageTitle
        pre={t("timeMachine.headingPre")}
        accent={t("timeMachine.headingAccent")}
        sub={t("timeMachine.sub")}
      />

      {/* Десятиліття */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
        {timeline?.decades.map((d) => (
          <button
            key={d.decade}
            type="button"
            onClick={() => select({ decade: d.decade, year: null })}
            className={cn(
              "flex shrink-0 flex-col items-start rounded-xl border px-4 py-2 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5",
              selection?.decade === d.decade
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface-2/60 hover:border-accent/50",
            )}
          >
            <span
              className={cn(
                "font-serif text-xl font-bold",
                selection?.decade === d.decade ? "text-accent" : "text-fg",
              )}
            >
              {t("timeMachine.decade", { decade: String(d.decade) })}
            </span>
            <span className="text-xs text-muted">{t("release.songs", { count: d.tracks })}</span>
          </button>
        ))}
      </div>

      {/* Шкала років — як на радіотюнері */}
      {decadeInfo && selection ? (
        <Dial decade={decadeInfo} selection={selection} onSelect={select} />
      ) : (
        <div className="skeleton mx-4 h-40 rounded-2xl sm:mx-6" />
      )}

      {/* Рік */}
      {selection ? (
        <section className="mt-6 flex flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-end gap-3">
            {selection.year ? (
              <IconButton
                label={t("timeMachine.prev")}
                onClick={() => step(-1)}
                className="mb-3 bg-surface-2/70"
              >
                <ChevronLeft className="size-5" />
              </IconButton>
            ) : null}
            <div key={label} className="animate-rise">
              <div className="font-serif text-6xl leading-none font-bold text-fg sm:text-8xl">{label}</div>
              <div className="mt-2 text-sm text-muted">
                {info ? t("release.songs", { count: info.trackCount }) : "…"}
              </div>
            </div>
            {selection.year ? (
              <IconButton
                label={t("timeMachine.next")}
                onClick={() => step(1)}
                className="mb-3 bg-surface-2/70"
              >
                <ChevronRight className="size-5" />
              </IconButton>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={!info?.tracks.length}
              onClick={() =>
                info &&
                playerStore
                  .getState()
                  .playContext(
                    info.tracks,
                    0,
                    { type: "era", id: `${from}-${to}`, name: label },
                    { shuffle: true },
                  )
              }
            >
              <Play className="size-4" fill="currentColor" /> {t("timeMachine.playYear", { period: label })}
            </Button>
            <RadioButton decade={selection.decade} />
          </div>
        </section>
      ) : null}

      {info && info.trackCount === 0 ? (
        <p className="px-6 py-14 text-center text-muted">{t("timeMachine.empty")}</p>
      ) : null}

      {info?.tracks.length ? (
        <section className="mt-8 px-2 sm:px-4">
          <h2 className="serif-title mb-2 px-2 text-2xl">{t("timeMachine.top", { period: label })}</h2>
          <TrackList
            items={info.tracks.slice(0, 20).map((track) => ({ track }))}
            context={{ type: "era", id: `${from}-${to}`, name: label }}
          />
        </section>
      ) : null}

      {info?.genres.length ? (
        <section className="mt-8 px-4 sm:px-6">
          <h2 className="serif-title mb-3 text-2xl">{t("timeMachine.genres")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {info.genres.map((g, i) => (
              <Link
                key={g.id}
                href={`/catalog?genre=${g.slug}&decade=${Math.floor((from ?? 0) / 10) * 10}`}
                className="group relative overflow-hidden rounded-lg border border-line bg-surface-2/50 px-3 py-2 transition-colors hover:border-accent/50"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-accent-soft transition-[width] duration-700 ease-[var(--ease-out-expo)]"
                  style={{ width: `${(g.tracks / Math.max(1, info.genres[0]!.tracks)) * 100}%` }}
                />
                <span className="relative flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">
                    <span className="mr-2 text-subtle tabular-nums">{i + 1}</span>
                    {g.name}
                  </span>
                  <span className="text-muted tabular-nums">{g.tracks}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {info?.releases.length ? (
        <section className="mt-8">
          <h2 className="serif-title mb-1 px-4 text-2xl sm:px-6">{t("timeMachine.albums")}</h2>
          <div className="grid grid-cols-2 px-2.5 sm:grid-cols-3 sm:px-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {info.releases.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>
        </section>
      ) : null}

      {info?.artists.length ? (
        <section className="mt-8">
          <h2 className="serif-title mb-1 px-4 text-2xl sm:px-6">{t("timeMachine.artists")}</h2>
          <div className="grid grid-cols-2 px-2.5 sm:grid-cols-3 sm:px-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {info.artists.slice(0, 6).map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Шкала десятиліття: 10 поділок-стовпчиків (висота — кількість пісень) і «Усе десятиліття». */
function Dial({
  decade,
  selection,
  onSelect,
}: {
  decade: Timeline["decades"][number];
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const t = useT();
  const counts = new Map(decade.years.map((y) => [y.year, y.tracks]));
  const max = Math.max(1, ...decade.years.map((y) => y.tracks));
  const [ready, setReady] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: перезапуск «виростання» стовпчиків на нове десятиліття
  useEffect(() => {
    setReady(false);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [decade.decade]);
  return (
    <div className="mx-4 rounded-2xl border border-line bg-[linear-gradient(180deg,var(--n-surface-2),var(--n-surface-1))] px-3 pt-4 pb-3 sm:mx-6 sm:px-5">
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
        <span>{t("timeMachine.scale")}</span>
        <button
          type="button"
          onClick={() => onSelect({ decade: decade.decade, year: null })}
          className={cn(
            "rounded-full px-2.5 py-1 normal-case tracking-normal transition-colors",
            selection.year === null ? "bg-accent text-on-accent" : "text-fg-2 hover:text-accent",
          )}
        >
          {t("timeMachine.wholeDecade")}
        </button>
      </div>
      <div className="grid grid-cols-10 items-end gap-1.5 sm:gap-3" style={{ height: 150 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const year = decade.decade + i;
          const n = counts.get(year) ?? 0;
          const active = selection.year === year || (selection.year === null && n > 0);
          return (
            <button
              key={year}
              type="button"
              disabled={n === 0}
              onClick={() => onSelect({ decade: decade.decade, year })}
              className="group flex h-full flex-col items-center justify-end gap-1.5 disabled:cursor-default"
              title={`${year}: ${n}`}
            >
              <span
                className={cn("text-[10px] tabular-nums transition-opacity", n ? "text-subtle" : "opacity-0")}
              >
                {n}
              </span>
              <span
                className={cn(
                  "w-full max-w-10 rounded-t-md transition-[height,background-color] duration-700 ease-[var(--ease-out-expo)]",
                  selection.year === year
                    ? "bg-gradient-to-t from-accent-lo to-accent-strong shadow-[0_0_18px_color-mix(in_srgb,var(--n-accent)_45%,transparent)]"
                    : active
                      ? "bg-accent/45 group-hover:bg-accent/70"
                      : "bg-surface-3 group-hover:bg-line-strong",
                )}
                style={{
                  height: ready ? `${n ? Math.max(6, (n / max) * 100) : 3}%` : "3%",
                  transitionDelay: `${i * 30}ms`,
                }}
              />
            </button>
          );
        })}
      </div>
      {/* Поділки й підписи — як шкала тюнера */}
      <div className="mt-1 grid grid-cols-10 gap-1.5 border-t border-line-strong pt-1.5 sm:gap-3">
        {Array.from({ length: 10 }, (_, i) => {
          const year = decade.decade + i;
          return (
            <span
              key={year}
              className={cn(
                "text-center text-[11px] tabular-nums transition-colors sm:text-xs",
                selection.year === year ? "font-bold text-accent" : "text-muted",
              )}
            >
              {i === 0 || selection.year === year ? year : `'${String(year).slice(2)}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RadioButton({ decade }: { decade: number }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const seed = Math.random().toString(36).slice(2, 10);
          const res = await api.tracks.browse({ query: { decade, sort: "random", seed, limit: 100 } });
          if (res.items.length)
            playerStore.getState().playContext(res.items as Track[], 0, {
              type: "era",
              id: `radio-${decade}`,
              name: t("timeMachine.radioDecade", { decade: String(decade) }),
            });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Radio className="size-4" /> {t("timeMachine.radioDecade", { decade: String(decade) })}
    </Button>
  );
}
