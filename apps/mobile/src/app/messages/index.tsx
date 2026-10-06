import { type Conversation, endpoints } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { useInfiniteEndpoint } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Chip, IconButton, Text } from "@/components/ui";
import { usePrefs } from "@/lib/theme";

export default function MessagesScreen() {
  const { t, colors: c, locale } = usePrefs();
  const insets = useSafeAreaInsets();
  const [folder, setFolder] = useState<"inbox" | "requests">("inbox");
  const list = useInfiniteEndpoint(endpoints.conversations.list, { query: { folder, limit: 30 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Conversation[]) ?? [], [list.data]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 4 }}>
      <View style={styles.header}>
        <IconButton label={t("common.back")} onPress={() => router.back()}>
          <ChevronLeft size={26} color={c.text} />
        </IconButton>
        <Text variant="heading">{t("messages.title")}</Text>
      </View>
      <View style={styles.chips}>
        <Chip label={t("messages.title")} active={folder === "inbox"} onPress={() => setFolder("inbox")} />
        <Chip
          label={t("messages.requests")}
          active={folder === "requests"}
          onPress={() => setFolder("requests")}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        refreshing={list.isRefetching}
        onRefresh={() => list.refetch()}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        ListEmptyComponent={
          <Text muted style={{ textAlign: "center", marginTop: 40 }}>
            {t("common.empty")}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
          >
            <Avatar src={item.peer.image} name={item.peer.name} size={52} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.peer.name}
              </Text>
              <Text
                variant="small"
                muted={!item.unreadCount}
                numberOfLines={1}
                style={item.unreadCount ? { fontWeight: "700" } : undefined}
              >
                {item.lastMessage
                  ? item.lastMessage.deleted
                    ? t("messages.deleted")
                    : item.lastMessage.body ||
                      (item.lastMessage.track ? `🎵 ${item.lastMessage.track.title}` : "📎")
                  : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              {item.lastMessage ? (
                <Text variant="caption" muted>
                  {formatRelative(item.lastMessage.createdAt, t, locale)}
                </Text>
              ) : null}
              {item.unreadCount ? (
                <View style={[styles.badge, { backgroundColor: c.accent }]}>
                  <Text variant="caption" style={{ color: c.onAccent }}>
                    {item.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
});
