import { endpoints } from "@musicdb/contracts/client";
import { formatLongDuration } from "@musicdb/i18n";
import { useEndpoint, usePlaylistActions } from "@musicdb/sdk/react";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, PlusCircle, Shuffle } from "lucide-react-native";
import { HeroHeader, PlayButton, playList, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { IconButton, Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";
import { playerStore } from "@/player/store";

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { data, isLoading, error } = useEndpoint(endpoints.playlists.get, { params: { id } });
  const actions = usePlaylistActions();
  if (!data) return <DetailScreen loading={isLoading} error={error ? t("common.notFound") : null} />;
  const tracks = data.items.map((i) => i.track);
  const context = { type: "playlist" as const, id: data.id, name: data.title };
  const viewer = data.viewer;
  return (
    <DetailScreen>
      <HeroHeader
        image={data.coverUrl ?? data.mosaic[0]}
        seed={data.id}
        kind={t("playlist.playlist")}
        title={data.title}
        meta={`${data.owner.name} · ${t("release.songs", { count: data.trackCount })} · ${formatLongDuration(data.durationMs, t)}`}
      />
      {data.description ? (
        <Text muted style={{ paddingHorizontal: 16 }}>
          {data.description}
        </Text>
      ) : null}
      <ActionRow>
        {viewer && !viewer.isOwner ? (
          <IconButton
            label="save"
            onPress={() => actions.follow.mutate({ id: data.id, follow: !viewer.following })}
          >
            {viewer.following ? (
              <CheckCircle2 size={28} color={c.accent} />
            ) : (
              <PlusCircle size={28} color={c.textMuted} />
            )}
          </IconButton>
        ) : !viewer ? (
          <IconButton label="save" onPress={() => router.push("/login")}>
            <PlusCircle size={28} color={c.textMuted} />
          </IconButton>
        ) : null}
        <IconButton
          label={t("common.shuffle")}
          onPress={() => playerStore.getState().playContext(tracks, 0, context, { shuffle: true })}
        >
          <Shuffle size={26} color={c.textMuted} />
        </IconButton>
        {tracks.length ? <PlayButton tracks={tracks} context={context} /> : null}
      </ActionRow>
      {data.items.map((item, i) => (
        <TrackRow
          key={item.id}
          track={item.track}
          context={context}
          onPress={() => playList(tracks, i, context)}
        />
      ))}
      {!data.items.length ? (
        <Text muted style={{ textAlign: "center", marginTop: 32 }}>
          {t("playlist.emptyText")}
        </Text>
      ) : null}
    </DetailScreen>
  );
}
