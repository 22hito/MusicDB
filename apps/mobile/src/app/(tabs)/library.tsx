import { useLibrary, useMe, usePlaylistActions } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { Heart, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, Cover, IconButton, Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";

type Filter = "all" | "playlists" | "artists" | "albums";

export default function LibraryScreen() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const library = useLibrary().data;
  const actions = usePlaylistActions();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (!library) return [];
    const list = [
      ...library.playlists.map((p) => ({
        key: `p${p.id}`,
        kind: "playlists" as const,
        title: p.title,
        subtitle: t("library.playlistBy", { name: p.owner.name }),
        image: p.coverUrl ?? p.mosaic[0] ?? null,
        round: false,
        go: () => router.push({ pathname: "/playlist/[id]", params: { id: p.id } }),
      })),
      ...library.artists.map((a) => ({
        key: `a${a.id}`,
        kind: "artists" as const,
        title: a.name,
        subtitle: t("library.artist"),
        image: a.imageUrl,
        round: true,
        go: () => router.push({ pathname: "/artist/[id]", params: { id: a.slug } }),
      })),
      ...library.releases.map((r) => ({
        key: `r${r.id}`,
        kind: "albums" as const,
        title: r.title,
        subtitle: r.artists.map((x) => x.name).join(", "),
        image: r.coverUrl,
        round: false,
        go: () => router.push({ pathname: "/album/[id]", params: { id: r.id } }),
      })),
    ];
    return list.filter((r) => filter === "all" || r.kind === filter);
  }, [library, filter, t]);

  if (!me) {
    return (
      <View style={[styles.empty, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Text variant="heading">{t("library.emptyTitle")}</Text>
        <Text muted style={{ marginTop: 6 }}>
          {t("library.emptyText")}
        </Text>
        <Button title={t("common.signIn")} onPress={() => router.push("/login")} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Text variant="display" style={{ flex: 1 }}>
          {t("library.title")}
        </Text>
        <IconButton
          label={t("nav.createPlaylist")}
          onPress={() =>
            actions.create.mutate(
              {
                title: t("playlist.newTitle", { n: (library?.playlists.length ?? 0) + 1 }),
                visibility: "private",
                trackIds: [],
              },
              { onSuccess: (p) => router.push({ pathname: "/playlist/[id]", params: { id: p.id } }) },
            )
          }
        >
          <Plus size={26} color={c.text} />
        </IconButton>
      </View>
      <View style={styles.chips}>
        {(["playlists", "artists", "albums"] as const).map((f) => (
          <Chip
            key={f}
            label={t(`library.${f}`)}
            active={filter === f}
            onPress={() => setFilter(filter === f ? "all" : f)}
          />
        ))}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ paddingBottom: 160 }}
        ListHeaderComponent={
          filter === "all" || filter === "playlists" ? (
            <Pressable onPress={() => router.push("/collection")} style={styles.row}>
              <View style={[styles.liked, { backgroundColor: "#6a4ce0" }]}>
                <Heart size={24} color="#fff" fill="#fff" />
              </View>
              <View>
                <Text variant="bodyStrong">{t("nav.likedSongs")}</Text>
                <Text variant="small" muted>
                  {t("library.likedCount", { count: library?.likedCount ?? 0 })}
                </Text>
              </View>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={item.go}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
          >
            <Cover src={item.image} size={64} seed={item.key} round={item.round} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="small" muted numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  liked: { width: 64, height: 64, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});
