"use client";
import { endpoints, type TrackDetail } from "@musicdb/contracts/client";
import { formatDuration, formatRelative } from "@musicdb/i18n";
import { invalidate, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Clock3, MoreHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReleaseCard, Shelf, TrackCard } from "@/components/music/cards";
import { LikeButton, PlayContextButton } from "@/components/music/common";
import { ActionBar, Dot, PageHeader } from "@/components/music/page-header";
import { useTrackMenu } from "@/components/music/track-actions";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { DropdownMenu } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { usePlayer } from "@/player/store";

export function TrackView({ id, initial }: { id: string; initial: TrackDetail }) {
  const { t } = useI18n();
  const { data = initial } = useEndpoint(endpoints.tracks.get, { params: { id } }, { initialData: initial });
  const lyrics = useEndpoint(
    endpoints.tracks.lyrics,
    { params: { id } },
    { enabled: FEATURES.lyrics && data.hasLyrics, staleTime: 10 * 60_000 },
  );
  const radio = useEndpoint(
    endpoints.tracks.radio,
    { params: { id }, query: { limit: 12 } },
    { staleTime: 5 * 60_000 },
  );
  const menu = useTrackMenu(data);
  const main = data.artists[0];
  const context = { type: "radio" as const, id: data.id, name: data.title };
  const here = usePlayer((s) => s.current?.track.id === data.id);
  const year = (data.releaseDate ?? data.release?.releaseDate)?.slice(0, 4);

  return (
    <div>
      <PageHeader
        disc={{ playing: here }}
        image={data.release?.coverUrl}
        seed={data.release?.id ?? data.id}
        kind={data.source === "community" ? t("track.community") : t("track.song")}
        title={data.title}
        meta={
          <>
            {data.artists.map((a, i) => (
              <span key={a.id} className="flex items-center gap-1.5">
                {i > 0 ? <Dot /> : null}
                <Link href={`/artist/${a.slug}`} className="font-bold hover:underline">
                  {a.name}
                </Link>
              </span>
            ))}
            {data.release ? (
              <>
                <Dot />
                <Link href={`/album/${data.release.id}`} className="hover:underline">
                  {data.release.title}
                </Link>
              </>
            ) : null}
            {data.releaseDate ? (
              <>
                <Dot />
                <span>{data.releaseDate.slice(0, 4)}</span>
              </>
            ) : null}
            <Dot />
            <span>{formatDuration(data.durationMs)}</span>
            {data.playCount ? (
              <>
                <Dot />
                <span>{t("track.plays", { count: data.playCount })}</span>
              </>
            ) : null}
          </>
        }
      />
      <div className="relative">
        <ActionBar>
          <PlayContextButton
            trackId={data.id}
            tracks={async () => [data, ...(radio.data?.items ?? [])]}
            context={context}
          />
          <LikeButton track={data} className="size-10 [&_svg]:size-7" />
          <DropdownMenu
            align="start"
            items={menu()}
            trigger={
              <IconButton label={t("common.more")} size="lg">
                <MoreHorizontal className="size-7" />
              </IconButton>
            }
          />
          {year ? (
            <Button variant="outline" size="sm" asChild className="ml-auto">
              <Link href={`/time-machine?year=${year}`}>
                <Clock3 className="size-4" /> {t("timeMachine.fromTrack", { year })}
              </Link>
            </Button>
          ) : null}
        </ActionBar>

        <div className="grid gap-10 px-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-10">
            {FEATURES.lyrics ? (
              <section>
                <h2 className="serif-title mb-4 text-[24px]">{t("track.lyrics")}</h2>
                {data.hasLyrics ? (
                  lyrics.data ? (
                    <p className="max-w-2xl text-lg leading-relaxed font-semibold whitespace-pre-line text-fg/85">
                      {lyrics.data.plain ?? lyrics.data.synced?.map((l) => l.text).join("\n")}
                    </p>
                  ) : (
                    <div className="skeleton h-48 max-w-2xl rounded-lg" />
                  )
                ) : (
                  <p className="text-muted">{t("track.noLyrics")}</p>
                )}
              </section>
            ) : null}
            <Ratings trackId={data.id} myRating={data.viewer?.rating ?? null} />
          </div>
          <aside className="space-y-4">
            {main ? (
              <Link
                href={`/artist/${main.slug}`}
                className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface-2"
              >
                <Avatar src={null} name={main.name} size={64} />
                <div>
                  <div className="text-xs font-semibold text-muted">{t("library.artist")}</div>
                  <div className="font-bold">{main.name}</div>
                </div>
              </Link>
            ) : null}
            {data.genres.length ? (
              <div className="flex flex-wrap gap-2 px-3">
                {data.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.slug}`}
                    className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold hover:bg-surface-3"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </aside>
        </div>

        {radio.data?.items.length ? (
          <div className="px-4 pt-10 sm:px-6">
            <Shelf title={t("track.startRadio")}>
              {radio.data.items.map((x) => (
                <div key={x.id} className="snap-start">
                  <TrackCard track={x} />
                </div>
              ))}
            </Shelf>
          </div>
        ) : null}
        {data.releases.length > 1 ? (
          <div className="px-4 pt-6 sm:px-6">
            <Shelf title={t("artist.appearsOn")}>
              {data.releases.map((r) => (
                <div key={r.id} className="snap-start">
                  <ReleaseCard release={{ ...r, artists: data.artists, trackCount: 0, durationMs: 0 }} />
                </div>
              ))}
            </Shelf>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Оцінки 0–100 і рецензії: середнє, розподіл, своя оцінка. */
function Ratings({ trackId, myRating }: { trackId: string; myRating: number | null }) {
  const { t, locale } = useI18n();
  const me = useMe().data;
  const qc = useQueryClient();
  const gate = useAuthGate();
  const list = useInfiniteEndpoint(endpoints.ratings.list, { params: { id: trackId }, query: { limit: 20 } });
  const [score, setScore] = useState<number>(myRating ?? 70);
  const [review, setReview] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const first = list.data?.pages[0];
  const summary =
    first && "summary" in first
      ? (first as unknown as { summary: { average: number | null; count: number; histogram: number[] } })
          .summary
      : null;
  const items =
    list.data?.pages.flatMap(
      (p) =>
        p.items as {
          user: { id: string; name: string; image: string | null; username: string | null };
          score: number;
          review: string | null;
          updatedAt: string;
        }[],
    ) ?? [];
  const max = Math.max(1, ...(summary?.histogram ?? [1]));

  const submit = async () => {
    setBusy(true);
    try {
      await api.ratings.put({ params: { id: trackId }, body: { score, review: review.trim() || null } });
      await invalidate(qc, endpoints.ratings.list, endpoints.tracks.get);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="serif-title mb-4 text-[24px]">{t("track.reviews")}</h2>
      <div className="flex flex-wrap items-end gap-8 rounded-xl bg-surface-2 p-5">
        <div>
          <div className="text-5xl font-black tracking-tight">{summary?.average ?? "—"}</div>
          <div className="mt-1 text-sm text-muted">{summary?.count ?? 0} ★</div>
        </div>
        <div className="flex h-16 flex-1 items-end gap-1" aria-hidden>
          {(summary?.histogram ?? Array(10).fill(0)).map((n, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-accent/70"
              style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
            />
          ))}
        </div>
        {me ? (
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            <Star className="size-4" /> {myRating != null ? `${myRating}` : t("track.rate")}
          </Button>
        ) : (
          <Button variant="outline" onClick={gate(() => {})}>
            <Star className="size-4" /> {t("track.rate")}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-5">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="flex-1 accent-[var(--n-accent)]"
            />
            <span className="w-12 text-right text-2xl font-black tabular-nums">{score}</span>
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={t("track.reviews")}
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex justify-end">
            <Button variant="accent" onClick={submit} loading={busy}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : null}
      <ul className="mt-4 space-y-3">
        {items.map((r) => (
          <li key={r.user.id} className="flex gap-3 rounded-lg p-3 hover:bg-surface-2/60">
            <Avatar src={r.user.image} name={r.user.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Link href={`/user/${r.user.username ?? r.user.id}`} className="font-bold hover:underline">
                  {r.user.name}
                </Link>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    r.score >= 70
                      ? "bg-success/20 text-success"
                      : r.score >= 40
                        ? "bg-warning/20 text-warning"
                        : "bg-danger/20 text-danger",
                  )}
                >
                  {r.score}
                </span>
                <span className="text-xs text-subtle">{formatRelative(r.updatedAt, t, locale)}</span>
              </div>
              {r.review ? (
                <p className="mt-1 text-[15px] whitespace-pre-line text-fg/90">{r.review}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {list.hasNextPage ? (
        <Button variant="ghost" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
          {t("common.more")}
        </Button>
      ) : null}
    </section>
  );
}
