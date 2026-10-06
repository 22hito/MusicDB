import { useBadges } from "@musicdb/sdk/react";
import { Tabs } from "expo-router";
import { Compass, Home, Library, Search, Users } from "lucide-react-native";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "@/components/player-ui";
import { Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const icons = { index: Home, search: Search, explore: Compass, library: Library, community: Users } as const;

function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const badges = useBadges().data;
  const labels: Record<string, string> = {
    index: t("nav.home"),
    search: t("nav.search"),
    explore: t("nav.explore"),
    library: t("nav.library"),
    community: t("nav.community"),
  };
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom, backgroundColor: c.bg }]}>
      <MiniPlayer />
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const Icon = icons[route.name as keyof typeof icons];
          if (!Icon) return null;
          const badge = route.name === "community" ? (badges?.threads ?? 0) + (badges?.messages ?? 0) : 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Icon size={24} color={focused ? c.accent : c.textMuted} strokeWidth={focused ? 2.4 : 1.8} />
              <Text variant="caption" style={{ color: focused ? c.text : c.textMuted, marginTop: 3 }}>
                {labels[route.name]}
              </Text>
              {badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: c.accent }]}>
                  <Text variant="caption" style={{ color: c.onAccent, fontSize: 9 }}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="community" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  bar: { flexDirection: "row", height: 56 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 4,
    left: "56%",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
});
