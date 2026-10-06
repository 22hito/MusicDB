import { endpoints, type Thread } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { useBadges, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { MessageCircle, MessageSquare, Pin } from "lucide-react-native";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, IconButton, Text } from "@/components/ui";
import { usePrefs } from "@/lib/theme";

export default function CommunityScreen() {
  const { t, colors: c, locale } = usePrefs();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const badges = useBadges().data;
  const list = useInfiniteEndpoint(endpoints.threads.list, { query: { limit: 30 } });
  const threads = useMemo(() => list.data?.pages.flatMap((p) => p.items as Thread[]) ?? [], [list.data]);
  const unreadMessages = (badges?.messages ?? 0) + (badges?.messageRequests ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Text variant="display" style={{ flex: 1 }}>
          {t("community.title")}
        </Text>
        {me ? (
          <IconButton label={t("nav.messages")} onPress={() => router.push("/messages")}>
            <MessageCircle size={24} color={c.text} />
            {unreadMessages ? (
              <View style={[styles.badge, { backgroundColor: c.accent }]}>
                <Text variant="caption" style={{ color: c.onAccent, fontSize: 9 }}>
                  {unreadMessages}
                </Text>
              </View>
            ) : null}
          </IconButton>
        ) : null}
      </View>
      <FlatList
        data={threads}
        keyExtractor={(x) => x.id}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        refreshing={list.isRefetching}
        onRefresh={() => list.refetch()}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/thread/[id]", params: { id: item.id } })}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: c.border },
              pressed && { backgroundColor: c.surface2 },
            ]}
          >
            <Avatar src={item.author?.image} name={item.author?.name ?? "?"} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {item.pinned ? <Pin size={14} color={c.accent} fill={c.accent} /> : null}
                <Text
                  variant="bodyStrong"
                  numberOfLines={1}
                  style={[{ flex: 1 }, item.unread ? { color: c.accent } : null]}
                >
                  {item.title}
                </Text>
              </View>
              <Text variant="small" muted numberOfLines={1}>
                {item.body}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4, alignItems: "center" }}>
                <MessageSquare size={12} color={c.textSubtle} />
                <Text variant="caption" style={{ color: c.textSubtle }}>
                  {t("community.replies", { count: item.postCount })} ·{" "}
                  {formatRelative(item.lastPostAt, t, locale)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
