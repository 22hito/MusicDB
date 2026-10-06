import { endpoints, type Track } from "@musicdb/contracts/client";
import { useInfiniteEndpoint, useLibrary } from "@musicdb/sdk/react";
import { LinearGradient } from "expo-linear-gradient";
import { Heart } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { PlayButton, playList, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { Button, Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";

export default function LikedScreen() {
  const t = useT();
  const library = useLibrary().data;
  const list = useInfiniteEndpoint(endpoints.library.likedTracks, { query: { limit: 50 } });
  const tracks = useMemo(
    () => list.data?.pages.flatMap((p) => (p.items as { track: Track }[]).map((i) => i.track)) ?? [],
    [list.data],
  );
  const c = useColors();
  const context = { type: "liked" as const, name: t("nav.likedSongs") };
  return (
    <DetailScreen loading={list.isLoading}>
      <LinearGradient colors={[c.accentLo, "transparent"]} style={styles.hero}>
        <View style={styles.icon}>
          <Heart size={64} color="#fff" fill="#fff" />
        </View>
        <Text variant="display" style={{ marginTop: 16 }}>
          {t("nav.likedSongs")}
        </Text>
        <Text variant="small" muted>
          {t("library.likedCount", { count: library?.likedCount ?? tracks.length })}
        </Text>
      </LinearGradient>
      <ActionRow>
        <View style={{ flex: 1 }} />
        <PlayButton tracks={tracks} context={context} />
      </ActionRow>
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          context={context}
          onPress={() => playList(tracks, i, context)}
        />
      ))}
      {list.hasNextPage ? (
        <Button variant="ghost" title={t("common.more")} onPress={() => list.fetchNextPage()} />
      ) : null}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 80, paddingBottom: 12 },
  icon: {
    width: 180,
    height: 180,
    borderRadius: 8,
    backgroundColor: "#6a4ce0",
    alignItems: "center",
    justifyContent: "center",
  },
});
