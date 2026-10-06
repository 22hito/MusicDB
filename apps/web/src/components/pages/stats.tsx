"use client";
/**
 * «Моя статистика» (у дусі Last.fm і stats.fm): підсумки за період, топи виконавців, пісень і жанрів зі смужками,
 * години доби, дні тижня й теплова карта активності за рік. Часовий пояс — з браузера.
 */
import { endpoints, type MyStats } from "@musicdb/contracts/client";
import { useEndpoint, useMe } from "@musicdb/sdk/react";
import { Flame, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArtistLinks } from "@/components/music/common";
import { Button } from "@/components/ui/button";
import { Avatar, Cover } from "@/components/ui/cover";
import { CountUp, PageTitle, Segmented } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { playerStore } from "@/player/store";

const periods = ["week", "month", "year", "all"] as const;

export function StatsView() {
  const { t, locale } = useI18n();
  const me = useMe();
  const [period, setPeriod] = useState<(typeof periods)[number]>("month");
  const tz = useMemo(
    () => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"),
    [],
  );
  const { data, isLoading } = useEndpoint(
    endpoints.me.stats,
    { query: { period, tz } },
    { enabled: !!me.data },
  );
  const stats = data as MyStats | undefined;

  if (!me.isLoading && !me.data) {
    return (
      <div className="pb-10">
        <PageTitle pre={t("stats.headingPre")} accent={t("stats.headingAccent")} sub={t("stats.sub")} />
        <div className="px-6 py-16 text-center">
          <p className="mb-4 text-muted">{t("stats.loginHint")}</p>
          <Button asChild>
            <Link href="/login?next=/stats">{t("common.signIn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: t("stats.plays"), value: stats?.totals.plays },
    { label: t("stats.minutes"), value: stats?.totals.minutes },
    { label: t("stats.tracks"), value: stats?.totals.tracks },
    { label: t("stats.artists"), value: stats?.totals.artists },
  ];
  const empty = stats && stats.totals.plays === 0;

  return (
    <div className="pb-10">
      <PageTitle
        pre={t("stats.headingPre")}
        accent={t("stats.headingAccent")}
        sub={t("stats.sub")}
        actions={
          <Segmented
            value={period}
            onChange={setPeriod}
            options={periods.map((p) => ({ value: p, label: t(`stats.${p}`) }))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-5">
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className="animate-rise rounded-2xl border border-line bg-surface-2/60 px-4 py-3"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="text-[13px] font-medium text-muted">{tile.label}</div>
            <div className="stat-num mt-1 text-3xl sm:text-4xl">
              {tile.value === undefined ? (
                <span className="text-subtle">—</span>
              ) : (
                <CountUp value={tile.value} />
              )}
            </div>
          </div>
        ))}
        <div
          className="col-span-2 animate-rise rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 lg:col-span-1"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-accent">
            <Flame className="size-4" /> {t("stats.streak")}
          </div>
          <div className="stat-num mt-1 text-3xl sm:text-4xl">
            {stats ? <CountUp value={stats.streakDays} /> : "—"}
          </div>
        </div>
      </div>

      {isLoading ? <div className="skeleton mx-4 mt-6 h-64 rounded-2xl sm:mx-6" /> : null}
      {empty ? <p className="px-6 py-14 text-center text-muted">{t("stats.empty")}</p> : null}

      {stats && !empty ? (
        <div className="mt-6 grid gap-6 px-4 sm:px-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface-2/40 p-4">
            <h2 className="serif-title mb-3 text-xl">{t("stats.topArtists")}</h2>
            <ol className="space-y-1.5">
              {stats.topArtists.map(({ artist, plays }, i) => (
                <li key={artist.id}>
                  <Link
                    href={`/artist/${artist.slug}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-2 py-1.5"
                  >
                    <Bar share={plays / stats.topArtists[0]!.plays} delay={i} />
                    <span className="relative w-5 text-right font-serif text-sm text-muted">{i + 1}</span>
                    <span className="relative">
                      <Avatar src={artist.imageUrl} name={artist.name} size={36} />
                    </span>
                    <span className="relative min-w-0 flex-1 truncate font-medium group-hover:underline">
                      {artist.name}
                    </span>
                    <span className="relative text-xs text-muted tabular-nums">
                      {t("stats.playsShort", { count: plays })}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-line bg-surface-2/40 p-4">
            <h2 className="serif-title mb-3 text-xl">{t("stats.topTracks")}</h2>
            <ol className="space-y-1.5">
              {stats.topTracks.map(({ track, plays }, i) => (
                <li
                  key={track.id}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-2 py-1.5"
                >
                  <Bar share={plays / stats.topTracks[0]!.plays} delay={i} />
                  <span className="relative w-5 text-right font-serif text-sm text-muted">{i + 1}</span>
                  <button
                    type="button"
                    className="relative shrink-0"
                    aria-label={`${t("common.play")} ${track.title}`}
                    onClick={() =>
                      playerStore.getState().playContext(
                        stats.topTracks.map((x) => x.track),
                        i,
                        { type: "profile", name: t("stats.topTracks") },
                      )
                    }
                  >
                    <Cover src={track.release?.coverUrl} alt="" size={40} seed={track.id} className="w-9" />
                    <span className="absolute inset-0 hidden items-center justify-center rounded-md bg-black/50 group-hover:flex">
                      <Play className="size-3.5 text-white" fill="currentColor" strokeWidth={0} />
                    </span>
                  </button>
                  <span className="relative min-w-0 flex-1">
                    <Link
                      href={`/track/${track.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {track.title}
                    </Link>
                    <ArtistLinks artists={track.artists} className="block truncate text-xs text-muted" />
                  </span>
                  <span className="relative text-xs text-muted tabular-nums">
                    {t("stats.playsShort", { count: plays })}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-line bg-surface-2/40 p-4">
            <h2 className="serif-title mb-1 text-xl">{t("stats.byHour")}</h2>
            <HourChart byHour={stats.byHour} />
          </section>

          <section className="rounded-2xl border border-line bg-surface-2/40 p-4">
            <h2 className="serif-title mb-3 text-xl">{t("stats.byWeekday")}</h2>
            <WeekdayChart byWeekday={stats.byWeekday} locale={locale} />
            {stats.topGenres.length ? (
              <>
                <h2 className="serif-title mt-5 mb-3 text-xl">{t("stats.topGenres")}</h2>
                <div className="flex flex-wrap gap-2">
                  {stats.topGenres.map(({ genre, plays }) => (
                    <Link
                      key={genre.id}
                      href={`/genre/${genre.slug}`}
                      className="rounded-full border border-line px-3 py-1 text-sm transition-colors hover:border-accent hover:text-accent"
                      style={{
                        fontSize: `${12 + (plays / stats.topGenres[0]!.plays) * 5}px`,
                      }}
                    >
                      {genre.name} <span className="text-xs text-subtle">{plays}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-surface-2/40 p-4 xl:col-span-2">
            <h2 className="serif-title mb-3 text-xl">{t("stats.activity")}</h2>
            <Heatmap daily={stats.daily} locale={locale} />
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Смужка частки відносно лідера — під рядком топу, як на Last.fm. */
function Bar({ share, delay }: { share: number; delay: number }) {
  return (
    <span
      className="absolute inset-y-0 left-0 origin-left animate-[grow_700ms_var(--ease-out-expo)_both] rounded-lg bg-accent-soft"
      style={{ width: `${Math.max(4, share * 100)}%`, animationDelay: `${delay * 40}ms` }}
    />
  );
}

/** Години доби: 24 стовпчики, найактивніша година підсвічена. */
function HourChart({ byHour }: { byHour: number[] }) {
  const { t } = useI18n();
  const max = Math.max(1, ...byHour);
  const peak = byHour.indexOf(Math.max(...byHour));
  return (
    <>
      <p className="mb-3 text-sm text-muted">{t("stats.peak", { hour: String(peak).padStart(2, "0") })}</p>
      <div className="flex h-36 items-end gap-[3px]">
        {byHour.map((n, h) => (
          <div
            key={h}
            className="group flex h-full flex-1 flex-col items-center justify-end"
            title={`${h}:00 — ${n}`}
          >
            <span
              className={cn(
                "w-full origin-bottom animate-[grow-y_700ms_var(--ease-out-expo)_both] rounded-t-sm",
                h === peak
                  ? "bg-gradient-to-t from-accent-lo to-accent-strong"
                  : "bg-accent/35 group-hover:bg-accent/60",
              )}
              style={{ height: `${n ? Math.max(4, (n / max) * 100) : 2}%`, animationDelay: `${h * 15}ms` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-subtle tabular-nums">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}</span>
        ))}
      </div>
    </>
  );
}

function WeekdayChart({ byWeekday, locale }: { byWeekday: number[]; locale: string }) {
  const max = Math.max(1, ...byWeekday);
  // Назви днів — з Intl (понеділок першим; 2024-01-01 — понеділок).
  const names = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "uk-UA", { weekday: "short" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );
  return (
    <div className="space-y-1.5">
      {byWeekday.map((n, i) => (
        <div key={names[i]} className="flex items-center gap-3 text-sm">
          <span className="w-8 text-muted capitalize">{names[i]}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full origin-left animate-[grow_700ms_var(--ease-out-expo)_both] rounded-full bg-gradient-to-r from-accent-lo to-accent"
              style={{ width: `${(n / max) * 100}%`, animationDelay: `${i * 40}ms` }}
            />
          </span>
          <span className="w-8 text-right text-xs text-muted tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

/** Теплова карта за рік: тижні стовпчиками, дні рядками (понеділок угорі). */
function Heatmap({ daily, locale }: { daily: { date: string; plays: number }[]; locale: string }) {
  const { t } = useI18n();
  const max = Math.max(1, ...daily.map((d) => d.plays));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  // Вирівнюємо початок на понеділок.
  const first = new Date(`${daily[0]?.date ?? "2024-01-01"}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: ({ date: string; plays: number } | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...daily,
  ];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "uk-UA", {
    day: "numeric",
    month: "short",
  });
  const shades = ["bg-surface-3", "bg-accent/25", "bg-accent/45", "bg-accent/70", "bg-accent"];
  return (
    <div>
      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((d, i) =>
                d ? (
                  <span
                    key={d.date}
                    title={`${fmt.format(new Date(`${d.date}T00:00:00Z`))}: ${d.plays}`}
                    className={cn(
                      "size-3 rounded-[3px] transition-transform hover:scale-125",
                      shades[level(d.plays)],
                    )}
                  />
                ) : (
                  <span key={`e${i}`} className="size-3" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-subtle">
        {t("stats.less")}
        {shades.map((c) => (
          <span key={c} className={cn("size-3 rounded-[3px]", c)} />
        ))}
        {t("stats.more")}
      </div>
    </div>
  );
}
