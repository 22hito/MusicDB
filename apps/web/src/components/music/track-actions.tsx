"use client";
import type { Track } from "@musicdb/contracts/client";
import { useLibrary, useLikedIds, useMe, usePlaylistActions, useToggleLike } from "@musicdb/sdk/react";
import {
  Disc3,
  Flag,
  Heart,
  ListEnd,
  ListPlus,
  ListStart,
  MicVocal,
  Pencil,
  Plus,
  Radio,
  Share2,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { openTrackEditor } from "@/components/admin/track-editor";
import type { MenuItem } from "@/components/ui/menu";
import { useT } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";
import { useReportDialog } from "../report-dialog";

export function useTrackMenu(
  track: Track,
  opts: { playlistId?: string; itemId?: string; canEdit?: boolean } = {},
): () => MenuItem[] {
  const t = useT();
  const router = useRouter();
  const me = useMe().data;
  const library = useLibrary().data;
  const liked = useLikedIds().has(track.id);
  const toggleLike = useToggleLike();
  const actions = usePlaylistActions();
  const gate = useAuthGate();
  const report = useReportDialog();

  return () => {
    const own = (library?.playlists ?? []).filter((p) => p.owner.id === me?.id || p.collaborative);
    const items: MenuItem[] = [
      {
        label: t("track.addToQueue"),
        icon: <ListEnd />,
        onSelect: () => {
          playerStore.getState().addToQueue([track]);
          toast(t("track.addToQueue"));
        },
      },
      {
        label: t("track.playNext"),
        icon: <ListStart />,
        onSelect: () => playerStore.getState().playNext([track]),
      },
      { type: "separator" },
      me
        ? {
            type: "submenu",
            label: t("track.addToPlaylist"),
            icon: <ListPlus />,
            items: [
              {
                label: t("nav.createPlaylist"),
                icon: <Plus />,
                onSelect: () =>
                  actions.create.mutate(
                    { title: track.title, trackIds: [track.id], visibility: "private" },
                    {
                      onSuccess: (p) => {
                        toast(t("playlist.created"));
                        router.push(`/playlist/${p.id}`);
                      },
                    },
                  ),
              },
              ...(own.length ? [{ type: "separator" as const }] : []),
              ...own.map((p) => ({
                label: p.title,
                onSelect: () =>
                  actions.addTracks.mutate(
                    { id: p.id, trackIds: [track.id] },
                    { onSuccess: () => toast(t("playlist.added", { title: p.title })) },
                  ),
              })),
            ],
          }
        : {
            label: t("track.addToPlaylist"),
            icon: <ListPlus />,
            onSelect: gate(() => {}, t("auth.signInToPlaylist")),
          },
      {
        label: liked ? t("track.unlike") : t("track.like"),
        icon: <Heart />,
        onSelect: gate(() => toggleLike.mutate({ trackId: track.id, liked: !liked }), t("auth.signInToLike")),
      },
    ];
    if (opts.playlistId && opts.itemId && opts.canEdit) {
      items.push({
        label: t("track.removeFromPlaylist"),
        icon: <Trash2 />,
        onSelect: () =>
          actions.removeItem.mutate(
            { id: opts.playlistId!, itemId: opts.itemId! },
            { onSuccess: () => toast(t("playlist.removed")) },
          ),
      });
    }
    items.push(
      { type: "separator" },
      {
        label: t("track.startRadio"),
        icon: <Radio />,
        onSelect: async () => {
          const { api } = await import("@/lib/api");
          const radio = await api.tracks.radio({ params: { id: track.id }, query: { limit: 40 } });
          playerStore
            .getState()
            .playContext([track, ...radio.items], 0, { type: "radio", id: track.id, name: track.title });
        },
      },
    );
    if (track.artists[0]) {
      const artist = track.artists[0];
      items.push({
        label: t("track.goToArtist"),
        icon: <User />,
        onSelect: () => router.push(`/artist/${artist.slug || artist.id}`),
      });
    }
    if (track.release) {
      const releaseId = track.release.id;
      items.push({
        label: t("track.goToAlbum"),
        icon: <Disc3 />,
        onSelect: () => router.push(`/album/${releaseId}`),
      });
    }
    items.push(
      { label: t("track.goToTrack"), icon: <MicVocal />, onSelect: () => router.push(`/track/${track.id}`) },
      { type: "separator" },
      {
        label: t("common.copyLink"),
        icon: <Share2 />,
        onSelect: () => {
          void navigator.clipboard.writeText(`${location.origin}/track/${track.id}`);
          toast(t("common.linkCopied"));
        },
      },
    );
    if (me) {
      items.push({
        label: t("common.report"),
        icon: <Flag />,
        onSelect: () => report.open({ targetType: "track", targetId: track.id }),
      });
    }
    if (me?.role === "admin") {
      items.push({ label: t("admin.edit"), icon: <Pencil />, onSelect: () => openTrackEditor(track.id) });
    }
    return items;
  };
}
