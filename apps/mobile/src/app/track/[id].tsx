import { endpoints } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import { useEndpoint, useLibrary, useMe, usePlaylistActions } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import { router, useLocalSearchParams } from "expo-router";
import { Clock3, Disc3, Flag, ListEnd, ListPlus, ListStart, Pencil, Radio, User } from "lucide-react-native";
import type { ReactNode } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { HeroHeader, LikeButton, PlayButton, Shelf, TrackCard } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const me = useMe().data;
  const library = useLibrary().data;
  const actions = usePlaylistActions();
  const { data, isLoading, error } = useEndpoint(endpoints.tracks.get, { params: { id } });
  const lyrics = useEndpoint(
    endpoints.tracks.lyrics,
    { params: { id } },
    { enabled: FEATURES.lyrics && !!data?.hasLyrics },
  );
  const radio = useEndpoint(endpoints.tracks.radio, { params: { id }, query: { limit: 12 } });
  // Платівка в шапці обертається, поки грає саме ця пісня.
  const here = usePlayer((s) => s.status === "playing" && s.current?.track.id === id);
  if (!data) return <DetailScreen loading={isLoading} error={error ? t("common.notFound") : null} />;
  const year = (data.releaseDate ?? data.release?.releaseDate)?.slice(0, 4);
  const context = { type: "radio" as const, id: data.id, name: data.title };
  const mainArtist = data.artists[0];
  const release = data.release;

  const addToPlaylist = () => {
    if (!me) {
      router.push("/login");
      return;
    }
    const own = (library?.playlists ?? []).filter((p) => p.owner.id === me.id);
    Alert.alert(t("track.addToPlaylist"), undefined, [
      ...own.slice(0, 6).map((p) => ({
        text: p.title,
        onPress: () => actions.addTracks.mutate({ id: p.id, trackIds: [data.id] }),
      })),
      {
        text: t("nav.createPlaylist"),
        onPress: () =>
          actions.create.mutate({ title: data.title, trackIds: [data.id], visibility: "private" }),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <DetailScreen>
      <HeroHeader
        disc={{ playing: here }}
        image={release?.coverUrl}
        seed={release?.id ?? data.id}
        kind={t("track.song")}
        title={data.title}
        meta={`${data.artists.map((a) => a.name).join(", ")} · ${formatDuration(data.durationMs)}`}
      />
      <ActionRow>
        <LikeButton track={data} size={28} />
        <View style={{ flex: 1 }} />
        <PlayButton
          trackId={data.id}
          tracks={async () => [data, ...(radio.data?.items ?? [])]}
          context={context}
        />
      </ActionRow>
      <View style={[styles.menu, { backgroundColor: c.surface1 }]}>
        <MenuItem
          icon={<ListEnd size={20} color={c.textMuted} />}
          label={t("track.addToQueue")}
          onPress={() => playerStore.getState().addToQueue([data])}
        />
        {year ? (
          <MenuItem
            icon={<Clock3 size={20} color={c.textMuted} />}
            label={t("timeMachine.fromTrack", { year })}
            onPress={() => router.push({ pathname: "/time-machine", params: { year } })}
          />
        ) : null}
        <MenuItem
          icon={<ListStart size={20} color={c.textMuted} />}
          label={t("track.playNext")}
          onPress={() => playerStore.getState().playNext([data])}
        />
        <MenuItem
          icon={<ListPlus size={20} color={c.textMuted} />}
          label={t("track.addToPlaylist")}
          onPress={addToPlaylist}
        />
        <MenuItem
          icon={<Radio size={20} color={c.textMuted} />}
          label={t("track.startRadio")}
          onPress={async () => {
            const r = await api.tracks.radio({ params: { id: data.id }, query: { limit: 40 } });
            playerStore.getState().playContext([data, ...r.items], 0, context);
          }}
        />
        {mainArtist ? (
          <MenuItem
            icon={<User size={20} color={c.textMuted} />}
            label={t("track.goToArtist")}
            onPress={() => router.push({ pathname: "/artist/[id]", params: { id: mainArtist.slug } })}
          />
        ) : null}
        {me ? (
          <MenuItem
            icon={<Flag size={20} color={c.textMuted} />}
            label={t("common.report")}
            onPress={() => router.push({ pathname: "/report", params: { type: "track", id: data.id } })}
          />
        ) : null}
        {release ? (
          <MenuItem
            icon={<Disc3 size={20} color={c.textMuted} />}
            label={t("track.goToAlbum")}
            onPress={() => router.push({ pathname: "/album/[id]", params: { id: release.id } })}
          />
        ) : null}
        {me?.role === "admin" ? (
          <MenuItem
            icon={<Pencil size={20} color={c.textMuted} />}
            label={t("admin.edit")}
            onPress={() => router.push({ pathname: "/admin-track", params: { id: data.id } })}
          />
        ) : null}
      </View>
      {FEATURES.lyrics && lyrics.data?.plain ? (
        <View style={[styles.lyrics, { backgroundColor: c.surface2 }]}>
          <Text variant="heading" style={{ marginBottom: 10 }}>
            {t("track.lyrics")}
          </Text>
          <Text variant="title" style={{ lineHeight: 28 }}>
            {lyrics.data.plain}
          </Text>
        </View>
      ) : null}
      <Shelf
        title={t("track.startRadio")}
        data={radio.data?.items ?? []}
        keyOf={(x) => x.id}
        render={(x) => <TrackCard track={x} />}
      />
    </DetailScreen>
  );
}

function MenuItem({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.surface2 }]}
    >
      {icon}
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: { marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  lyrics: { margin: 16, marginTop: 24, padding: 18, borderRadius: 14 },
});
