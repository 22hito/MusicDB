import { endpoints, type Notification } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useInfiniteEndpoint } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { Bell, ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, IconButton, Text } from "@/components/ui";
import { usePrefs } from "@/lib/theme";

function target(n: Notification): Href | null {
  if (!n.entityId) return null;
  if (n.entityType === "track") return { pathname: "/track/[id]", params: { id: n.entityId } };
  if (n.entityType === "thread") return { pathname: "/thread/[id]", params: { id: n.entityId } };
  if (n.entityType === "user") return { pathname: "/user/[id]", params: { id: n.entityId } };
  if (n.entityType === "playlist") return { pathname: "/playlist/[id]", params: { id: n.entityId } };
  return null;
}

export default function NotificationsScreen() {
  const { t, colors: c, locale } = usePrefs();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const qc = useQueryClient();
  const list = useInfiniteEndpoint(endpoints.notifications.list, { query: { limit: 40 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Notification[]) ?? [], [list.data]);

  useEffect(() => {
    if (!items.some((n) => !n.read)) return;
    const timer = setTimeout(() => {
      void api.notifications.markRead({ body: {} }).then(() => invalidate(qc, endpoints.me.badges));
    }, 1500);
    return () => clearTimeout(timer);
  }, [items, api, qc]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 4 }}>
      <View style={styles.header}>
        <IconButton label={t("common.back")} onPress={() => router.back()}>
          <ChevronLeft size={26} color={c.text} />
        </IconButton>
        <Text variant="heading">{t("notifications.title")}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60, gap: 10 }}>
            <Bell size={36} color={c.textMuted} />
            <Text muted>{t("notifications.empty")}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const href = target(item);
          return (
            <Pressable
              onPress={() => href && router.push(href)}
              style={({ pressed }) => [
                styles.row,
                !item.read && { backgroundColor: c.accentSoft },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Avatar src={item.actor?.image} name={item.actor?.name ?? "N"} size={42} />
              <View style={{ flex: 1 }}>
                <Text>
                  {t(`notifications.${item.type}` as "notifications.follow", {
                    actor: item.actor?.name ?? "",
                    ...(item.data as Record<string, string>),
                  })}
                </Text>
                <Text variant="caption" muted style={{ marginTop: 2 }}>
                  {formatRelative(item.createdAt, t, locale)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
