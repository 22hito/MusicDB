"use client";
import { endpoints, type Track } from "@musicdb/contracts/client";
import type { QueueItem } from "@musicdb/player";
import { useEndpoint, useFollowArtist, useMe } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import { EyeOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArtistLinks, Equalizer, LikeButton } from "@/components/music/common";
import { Button, IconButton } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Cover } from "@/components/ui/cover";
import { cn } from "@/lib/cn";
import { useI18n, useT } from "@/lib/i18n";
import { type RightPanel as Panel, useUi } from "@/lib/ui-store";
import { playerStore, usePlayer } from "@/player/store";
import { usePlayingSource, VideoSlot } from "@/player/video-slot";

export function RightPanel({ panel: requested }: { panel: Exclude<Panel, null> }) {
  const t = useT();
  // Текст сховано (FEATURES.lyrics) — збережена панель «текст» показує «Зараз грає».
  const panel = requested === "lyrics" && !FEATURES.lyrics ? "now-playing" : requested;
  const setPanel = useUi((s) => s.setRightPanel);
  const videoHidden = useUi((s) => s.videoHidden);
  const setVideoHidden = useUi((s) => s.setVideoHidden);
  const source = usePlayingSource((s) => s.kind);
  // Відео над чергою/текстом — власне місце, щоб не закривало список.
  const topVideo = source === "youtube" && panel !== "now-playing" && !videoHidden;
  const context = usePlayer((s) => s.context);
  const title =
    panel === "queue"
      ? t("player.queue")
      : panel === "lyrics"
        ? t("player.lyrics")
        : (context?.name ?? t("player.nowPlaying"));
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden" aria-label={title}>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
        <h2 className="truncate font-bold">{title}</h2>
        <IconButton label={t("common.close")} size="sm" onClick={() => setPanel(null)}>
          <X className="size-5" />
        </IconButton>
      </div>
      {topVideo ? (
        <div className="relative shrink-0 px-4 pb-3">
          <VideoSlot priority={2} className="aspect-video w-full overflow-hidden rounded-lg bg-black" />
          <button
            type="button"
            onClick={() => setVideoHidden(true)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <EyeOff className="size-3.5" /> {t("player.hideVideo")}
          </button>
        </div>
      ) : null}
      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {panel === "queue" ? <QueueView /> : panel === "lyrics" ? <LyricsView /> : <NowPlayingView />}
      </div>
    </aside>
  );
}

function NowPlayingView() {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const next = usePlayer((s) => s.upcoming(1)[0]);
  const setPanel = useUi((s) => s.setRightPanel);
  const source = usePlayingSource((s) => s.kind);
  if (!current) return <p className="pt-10 text-center text-sm text-muted">{t("player.nothingPlaying")}</p>;
  const track = current.track;
  const isVideo = source === "youtube" || (!track.playback.audio && !!track.playback.youtubeVideoId);
  return (
    <div className="space-y-5">
      {isVideo ? (
        <VideoSlot priority={1} className="aspect-video w-full overflow-hidden rounded-lg bg-black" />
      ) : (
        <Cover
          src={track.release?.coverUrl}
          alt=""
          size={500}
          seed={track.release?.id ?? track.id}
          rounded="lg"
          className="w-full shadow-xl shadow-black/40"
        />
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/track/${track.id}`}
            className="block truncate text-2xl font-extrabold tracking-tight hover:underline"
          >
            {track.title}
          </Link>
          <ArtistLinks artists={track.artists} className="block text-[15px] text-muted" />
        </div>
        <LikeButton track={track} />
      </div>
      {track.artists[0] ? <ArtistAbout artistId={track.artists[0].id} /> : null}
      {next ? (
        <section className="rounded-lg bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{t("player.nextUp")}</h3>
            <button
              type="button"
              onClick={() => setPanel("queue")}
              className="text-[13px] font-bold text-muted hover:text-fg hover:underline"
            >
              {t("player.queue")}
            </button>
          </div>
          <QueueRow item={next} />
        </section>
      ) : null}
    </div>
  );
}

function ArtistAbout({ artistId }: { artistId: string }) {
  const { t, locale } = useI18n();
  const me = useMe().data;
  const { data } = useEndpoint(
    endpoints.artists.get,
    { params: { id: artistId } },
    { staleTime: 5 * 60_000 },
  );
  const follow = useFollowArtist();
  if (!data) return null;
  const bio = data.bio?.[locale] ?? data.bio?.uk ?? data.bio?.en;
  return (
    <section className="overflow-hidden rounded-lg bg-surface-2">
      <Link href={`/artist/${data.slug}`} className="relative block aspect-[4/3]">
        <Cover
          src={data.imageUrl}
          alt={data.name}
          size={500}
          seed={data.id}
          rounded="none"
          className="absolute inset-0 aspect-auto size-full"
        />
        <span className="absolute top-3 left-4 text-[13px] font-bold text-white drop-shadow">
          {t("artist.about")}
        </span>
      </Link>
      <div className="space-y-3 p-4">
        <Link href={`/artist/${data.slug}`} className="block text-lg font-bold hover:underline">
          {data.name}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {t("artist.monthlyListeners", { count: data.monthlyListeners })}
          </span>
          {me ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => follow.mutate({ artistId: data.id, follow: !data.viewer?.following })}
            >
              {data.viewer?.following ? t("common.following") : t("common.follow")}
            </Button>
          ) : null}
        </div>
        {bio ? <p className="line-clamp-4 text-sm text-muted">{bio}</p> : null}
      </div>
    </section>
  );
}

function QueueView() {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const priority = usePlayer((s) => s.priority);
  const items = usePlayer((s) => s.items);
  const index = usePlayer((s) => s.index);
  const context = usePlayer((s) => s.context);
  const autoplay = usePlayer((s) => s.autoplay);
  const rest = items.slice(index + 1, index + 101);
  if (!current) return <p className="pt-10 text-center text-sm text-muted">{t("player.emptyQueue")}</p>;
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-bold">{t("player.nowPlaying")}</h3>
        <QueueRow item={current} current />
      </section>
      {priority.length ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">{t("player.nextUp")}</h3>
            <button
              type="button"
              onClick={async () => {
                if (await confirm({ title: t("confirm.clearQueue"), confirmLabel: t("player.clearQueue") }))
                  playerStore.getState().clearPriority();
              }}
              className="text-[13px] font-bold text-muted hover:text-fg"
            >
              {t("player.clearQueue")}
            </button>
          </div>
          {priority.map((item) => (
            <QueueRow key={item.uid} item={item} removable />
          ))}
        </section>
      ) : null}
      {rest.length ? (
        <section>
          <h3 className="mb-2 font-bold">
            {t("player.nextFrom", { name: context?.name ?? t("player.queue") })}
          </h3>
          {rest.map((item) => (
            <QueueRow key={item.uid} item={item} removable />
          ))}
        </section>
      ) : null}
      <label className="flex items-center justify-between gap-3 rounded-md bg-surface-2 p-3 text-sm">
        <span>{t("player.autoplay")}</span>
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(e) => playerStore.getState().setAutoplay(e.target.checked)}
          className="size-4 accent-[var(--n-accent)]"
        />
      </label>
    </div>
  );
}

function QueueRow({ item, current, removable }: { item: QueueItem; current?: boolean; removable?: boolean }) {
  const t = useT();
  const playing = usePlayer((s) => s.status === "playing");
  const track: Track = item.track;
  return (
    <div className="group flex items-center gap-3 rounded-md p-2 hover:bg-surface-2">
      <button
        type="button"
        onClick={() => !current && playerStore.getState().jumpTo(item.uid)}
        className="relative shrink-0"
        aria-label={t("common.play")}
      >
        <Cover
          src={track.release?.coverUrl}
          alt=""
          size={48}
          seed={track.release?.id ?? track.id}
          rounded="sm"
          className="size-12"
        />
        {current ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/50">
            <Equalizer paused={!playing} />
          </span>
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[15px] font-medium", current && "text-accent")}>{track.title}</div>
        <ArtistLinks artists={track.artists} className="block text-[13px] text-muted" />
      </div>
      {removable ? (
        <IconButton
          label={t("common.delete")}
          size="xs"
          className="opacity-0 group-hover:opacity-100"
          onClick={() => playerStore.getState().removeFromQueue(item.uid)}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </div>
  );
}

export function LyricsView({ large }: { large?: boolean }) {
  const t = useT();
  const current = usePlayer((s) => s.current);
  const trackId = current?.track.id ?? "";
  const { data, isLoading } = useEndpoint(
    endpoints.tracks.lyrics,
    { params: { id: trackId } },
    { enabled: !!current?.track.hasLyrics },
  );
  const position = usePlayer((s) => s.positionMs);
  const activeRef = useRef<HTMLButtonElement>(null);
  const synced = data?.synced ?? null;
  let active = -1;
  if (synced) for (let i = 0; i < synced.length; i++) if (synced[i]!.timeMs <= position + 300) active = i;

  // biome-ignore lint/correctness/useExhaustiveDependencies: прокрутка при зміні активного рядка
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active]);

  if (!current) return null;
  if (!current.track.hasLyrics) return <p className="pt-10 text-center text-muted">{t("track.noLyrics")}</p>;
  if (isLoading) return <div className="skeleton mt-6 h-40 rounded-lg" />;
  if (synced) {
    return (
      <div
        className={cn(
          "space-y-3 py-6 font-extrabold tracking-tight",
          large ? "text-3xl sm:text-4xl" : "text-xl",
        )}
      >
        {synced.map((line, i) => (
          <button
            key={`${line.timeMs}-${i}`}
            ref={i === active ? activeRef : undefined}
            type="button"
            onClick={() => playerStore.getState().seek(line.timeMs)}
            className={cn(
              "block text-left transition-colors duration-300",
              i === active ? "text-fg" : i < active ? "text-fg/50" : "text-fg/30 hover:text-fg/60",
            )}
          >
            {line.text || "♪"}
          </button>
        ))}
      </div>
    );
  }
  return (
    <p
      className={cn(
        "py-6 font-bold whitespace-pre-line text-fg/90",
        large ? "text-2xl leading-relaxed" : "text-lg leading-relaxed",
      )}
    >
      {data?.plain}
    </p>
  );
}
