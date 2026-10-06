import { router } from "expo-router";
import { X } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Cover, IconButton, Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";

export default function QueueScreen() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const current = usePlayer((s) => s.current);
  const priority = usePlayer((s) => s.priority);
  const items = usePlayer((s) => s.items);
  const index = usePlayer((s) => s.index);
  const upcoming = [...priority, ...items.slice(index + 1, index + 200)];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Text variant="heading" style={{ flex: 1 }}>
          {t("player.queue")}
        </Text>
        <IconButton label={t("common.close")} onPress={() => router.back()}>
          <X size={24} color={c.text} />
        </IconButton>
      </View>
      {current ? (
        <View style={styles.row}>
          <Cover src={current.track.release?.coverUrl} size={48} seed={current.track.id} radius={4} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" accent numberOfLines={1}>
              {current.track.title}
            </Text>
            <Text variant="small" muted numberOfLines={1}>
              {current.track.artists.map((a) => a.name).join(", ")}
            </Text>
          </View>
        </View>
      ) : null}
      <Text variant="title" style={{ paddingHorizontal: 16, marginTop: 16 }}>
        {t("player.nextUp")}
      </Text>
      <FlatList
        data={upcoming}
        keyExtractor={(x) => x.uid}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => playerStore.getState().jumpTo(item.uid)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
          >
            <Cover src={item.track.release?.coverUrl} size={48} seed={item.track.id} radius={4} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.track.title}
              </Text>
              <Text variant="small" muted numberOfLines={1}>
                {item.track.artists.map((a) => a.name).join(", ")}
              </Text>
            </View>
            <IconButton
              label={t("common.delete")}
              onPress={() => playerStore.getState().removeFromQueue(item.uid)}
            >
              <X size={18} color={c.textMuted} />
            </IconButton>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text muted style={{ textAlign: "center", marginTop: 24 }}>
            {t("player.emptyQueue")}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
});
