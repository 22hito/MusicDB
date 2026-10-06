"use client";
import { endpoints, type ReleaseDetail } from "@musicdb/contracts/client";
import { formatLongDuration } from "@musicdb/i18n";
import { useEndpoint, useSaveRelease } from "@musicdb/sdk/react";
import { CheckCircle2, MoreHorizontal, PlusCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ReleaseCard, Shelf } from "@/components/music/cards";
import { PlayContextButton, useIsContextActive } from "@/components/music/common";
import { ActionBar, Dot, PageHeader } from "@/components/music/page-header";
import { TrackList } from "@/components/music/track-list";
import { IconButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { DropdownMenu } from "@/components/ui/menu";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";

export function AlbumView({ id, initial }: { id: string; initial: ReleaseDetail }) {
  const { t, locale } = useI18n();
  const { data = initial } = useEndpoint(
    endpoints.releases.get,
    { params: { id } },
    { initialData: initial, staleTime: 60_000 },
  );
  const save = useSaveRelease();
  const gate = useAuthGate();
  const context = { type: "album" as const, id: data.id, name: data.title };
  const here = useIsContextActive(context);
  const saved = !!data.viewer?.saved;
  const year = data.releaseDate?.slice(0, 4);
  const main = data.artists[0];
  const dateText = data.releaseDate
    ? new Date(data.releaseDate).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      <PageHeader
        disc={{ playing: here }}
        image={data.coverUrl}
        seed={data.id}
        kind={t(`release.${data.type}`)}
        title={data.title}
        meta={
          <>
            {main ? (
              <Link
                href={`/artist/${main.slug}`}
                className="flex items-center gap-1.5 font-bold hover:underline"
              >
                <Avatar src={null} name={main.name} size={24} />
                {data.artists.map((a) => a.name).join(", ")}
              </Link>
            ) : null}
            {year ? (
              <>
                <Dot />
                <span>{year}</span>
              </>
            ) : null}
            <Dot />
            <span>
              {t("release.songs", { count: data.tracks.length })},{" "}
              <span className="text-fg/70">{formatLongDuration(data.durationMs, t)}</span>
            </span>
          </>
        }
      />
      <div className="relative">
        <ActionBar>
          <PlayContextButton tracks={data.tracks} context={context} />
          <IconButton
            label={saved ? t("release.remove") : t("release.save")}
            size="lg"
            onClick={gate(() => save.mutate({ releaseId: data.id, save: !saved }))}
            className={saved ? "text-accent hover:text-accent-strong" : ""}
          >
            {saved ? (
              <CheckCircle2 className="size-8" fill="currentColor" stroke="var(--n-bg)" />
            ) : (
              <PlusCircle className="size-8" />
            )}
          </IconButton>
          <DropdownMenu
            align="start"
            items={[
              {
                label: t("track.addToQueue"),
                onSelect: () => playerStore.getState().addToQueue(data.tracks),
              },
              {
                label: t("common.copyLink"),
                icon: <Share2 />,
                onSelect: () => {
                  void navigator.clipboard.writeText(`${location.origin}/album/${data.id}`);
                  toast(t("common.linkCopied"));
                },
              },
            ]}
            trigger={
              <IconButton label={t("common.more")} size="lg">
                <MoreHorizontal className="size-7" />
              </IconButton>
            }
          />
        </ActionBar>
        <div className="px-2 sm:px-4">
          <TrackList
            items={data.tracks.map((track) => ({ track }))}
            context={context}
            showCover={false}
            showAlbum={false}
          />
        </div>
        <div className="space-y-1 px-4 pt-6 text-[13px] text-muted sm:px-6">
          {dateText ? <p>{dateText}</p> : null}
          {data.label ? <p>℗ {data.label}</p> : null}
        </div>
        {data.moreByArtist.length && main ? (
          <div className="px-4 pt-10 sm:px-6">
            <Shelf title={t("release.moreBy", { name: main.name })} href={`/artist/${main.slug}`}>
              {data.moreByArtist.map((r) => (
                <div key={r.id} className="snap-start">
                  <ReleaseCard release={r} />
                </div>
              ))}
            </Shelf>
          </div>
        ) : null}
      </div>
    </div>
  );
}
