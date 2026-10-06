"use client";
import { endpoints, type PlaylistDetail, type SearchResults } from "@musicdb/contracts/client";
import { formatLongDuration } from "@musicdb/i18n";
import { useEndpoint, usePlaylistActions } from "@musicdb/sdk/react";
import {
  CheckCircle2,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Search,
  Share2,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArtistLinks, PlayContextButton } from "@/components/music/common";
import { ActionBar, Dot, PageHeader } from "@/components/music/page-header";
import { TrackList } from "@/components/music/track-list";
import { Button, IconButton } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar, Cover } from "@/components/ui/cover";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu, type MenuItem } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";

export function PlaylistView({ id, initial }: { id: string; initial: PlaylistDetail }) {
  const { t } = useI18n();
  const router = useRouter();
  const { data = initial } = useEndpoint(
    endpoints.playlists.get,
    { params: { id } },
    { initialData: initial },
  );
  const actions = usePlaylistActions();
  const gate = useAuthGate();
  const [editing, setEditing] = useState(false);
  const context = { type: "playlist" as const, id: data.id, name: data.title };
  const tracks = data.items.map((i) => i.track);
  const viewer = data.viewer;

  const menu: MenuItem[] = [
    { label: t("track.addToQueue"), onSelect: () => playerStore.getState().addToQueue(tracks) },
    {
      label: t("common.copyLink"),
      icon: <Share2 />,
      onSelect: () => {
        void navigator.clipboard.writeText(`${location.origin}/playlist/${data.id}`);
        toast(t("common.linkCopied"));
      },
    },
  ];
  if (viewer?.isOwner) {
    menu.unshift(
      { label: t("playlist.edit"), icon: <Pencil />, onSelect: () => setEditing(true) },
      {
        label: data.visibility === "public" ? t("playlist.makePrivate") : t("playlist.makePublic"),
        icon: data.visibility === "public" ? <Lock /> : <Globe />,
        onSelect: () =>
          actions.update.mutate({
            id: data.id,
            visibility: data.visibility === "public" ? "private" : "public",
          }),
      },
      {
        label: t("playlist.collaborative"),
        icon: <Users />,
        checked: data.collaborative,
        onSelect: () => actions.update.mutate({ id: data.id, collaborative: !data.collaborative }),
      },
      { type: "separator" },
    );
    menu.push(
      { type: "separator" },
      {
        label: t("common.delete"),
        icon: <Trash2 />,
        danger: true,
        onSelect: async () => {
          const ok = await confirm({
            title: t("playlist.deleteConfirm", { title: data.title }),
            description: t("confirm.irreversible"),
            confirmLabel: t("common.delete"),
            danger: true,
          });
          if (ok) actions.remove.mutate(data.id, { onSuccess: () => router.push("/") });
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        image={data.coverUrl}
        imageMosaic={data.mosaic}
        seed={data.id}
        kind={
          data.visibility === "public"
            ? t("playlist.public")
            : data.visibility === "unlisted"
              ? t("playlist.unlisted")
              : t("playlist.private")
        }
        title={data.title}
        meta={
          <>
            {data.description ? <p className="mb-1 w-full text-sm text-fg/70">{data.description}</p> : null}
            <Link
              href={`/user/${data.owner.username ?? data.owner.id}`}
              className="flex items-center gap-1.5 font-bold hover:underline"
            >
              <Avatar src={data.owner.image} name={data.owner.name} size={24} />
              {data.owner.name}
            </Link>
            {data.followerCount ? (
              <>
                <Dot />
                <span>{t("playlist.likes", { count: data.followerCount })}</span>
              </>
            ) : null}
            {data.trackCount ? (
              <>
                <Dot />
                <span>
                  {t("release.songs", { count: data.trackCount })},{" "}
                  <span className="text-fg/70">{formatLongDuration(data.durationMs, t)}</span>
                </span>
              </>
            ) : null}
          </>
        }
      />
      <div className="relative">
        <ActionBar>
          {tracks.length ? <PlayContextButton tracks={tracks} context={context} /> : null}
          {tracks.length ? (
            <IconButton
              label={t("common.shuffle")}
              size="lg"
              onClick={() => playerStore.getState().playContext(tracks, 0, context, { shuffle: true })}
            >
              <Shuffle className="size-7" />
            </IconButton>
          ) : null}
          {viewer && !viewer.isOwner ? (
            <IconButton
              label={viewer.following ? t("release.remove") : t("playlist.save")}
              size="lg"
              onClick={gate(() => actions.follow.mutate({ id: data.id, follow: !viewer.following }))}
              className={viewer.following ? "text-accent" : ""}
            >
              {viewer.following ? (
                <CheckCircle2 className="size-8" fill="currentColor" stroke="var(--n-bg)" />
              ) : (
                <PlusCircle className="size-8" />
              )}
            </IconButton>
          ) : null}
          <DropdownMenu
            align="start"
            items={menu}
            trigger={
              <IconButton label={t("common.more")} size="lg">
                <MoreHorizontal className="size-7" />
              </IconButton>
            }
          />
        </ActionBar>
        <div className="px-2 sm:px-4">
          {data.items.length ? (
            <TrackList
              items={data.items.map((i) => ({ track: i.track, itemId: i.id, addedAt: i.addedAt, key: i.id }))}
              context={context}
              showAddedAt
              playlist={{ id: data.id, canEdit: !!viewer?.canEdit }}
            />
          ) : null}
        </div>
        {viewer?.canEdit ? (
          <FindSongs
            playlistId={data.id}
            existing={new Set(tracks.map((x) => x.id))}
            empty={!data.items.length}
          />
        ) : null}
      </div>
      {viewer?.isOwner ? (
        <EditPlaylistDialog open={editing} onOpenChange={setEditing} playlist={data} />
      ) : null}
    </div>
  );
}

/** «Додамо щось у плейлист»: пошук пісень прямо на сторінці плейлиста. */
function FindSongs({
  playlistId,
  existing,
  empty,
}: {
  playlistId: string;
  existing: Set<string>;
  empty: boolean;
}) {
  const { t } = useI18n();
  const actions = usePlaylistActions();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(empty);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api.discover
        .search({ query: { q: term, types: ["track"], limit: 10 } }, { signal: ctrl.signal })
        .then(setResults, () => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  if (!open) {
    return (
      <div className="flex justify-end px-6 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-bold text-muted hover:text-fg"
        >
          {t("playlist.findSongs")}
        </button>
      </div>
    );
  }

  return (
    <section className="mx-4 mt-8 border-t border-line pt-8 sm:mx-6">
      <h2 className="serif-title text-2xl">{t("playlist.emptyTitle")}</h2>
      <div className="relative mt-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="h-10 w-full rounded-md bg-surface-3 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-fg/40"
        />
      </div>
      <div className="mt-4 space-y-1">
        {results?.tracks.map((track) => (
          <div key={track.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-2">
            <Cover
              src={track.release?.coverUrl}
              alt=""
              size={40}
              seed={track.release?.id ?? track.id}
              rounded="sm"
              className="size-10"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{track.title}</div>
              <ArtistLinks artists={track.artists} className="block text-[13px] text-muted" />
            </div>
            <div className="hidden min-w-0 flex-1 truncate text-sm text-muted md:block">
              {track.release?.title}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={existing.has(track.id)}
              onClick={() => actions.addTracks.mutate({ id: playlistId, trackIds: [track.id] })}
            >
              {existing.has(track.id) ? t("common.saved") : t("common.add")}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditPlaylistDialog({
  open,
  onOpenChange,
  playlist,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  playlist: PlaylistDetail;
}) {
  const { t } = useI18n();
  const actions = usePlaylistActions();
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? "");
  useEffect(() => {
    if (open) {
      setTitle(playlist.title);
      setDescription(playlist.description ?? "");
    }
  }, [open, playlist]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("playlist.edit")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          actions.update.mutate(
            {
              id: playlist.id,
              title: title.trim() || playlist.title,
              description: description.trim() || null,
            },
            { onSuccess: () => onOpenChange(false) },
          );
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("playlist.titleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="h-11 w-full rounded-md bg-surface-3 px-3 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("playlist.descriptionLabel")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={4}
            className="w-full resize-none rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="flex justify-end">
          <Button type="submit" loading={actions.update.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
