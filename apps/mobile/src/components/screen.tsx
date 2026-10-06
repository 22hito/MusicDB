import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "@/components/player-ui";
import { useColors } from "@/lib/theme";
import { HlText, IconButton, Text } from "./ui";

/** Екран деталей: прокрутка, плаваюча кнопка «Назад», міні-плеєр унизу. */
export function DetailScreen({
  children,
  loading,
  error,
}: {
  children?: ReactNode;
  loading?: boolean;
  error?: string | null;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text muted>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>{children}</ScrollView>
      )}
      <View style={[styles.back, { top: insets.top + 6 }]}>
        <IconButton
          label="back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={{ backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20 }}
        >
          <ChevronLeft size={24} color="#fff" />
        </IconButton>
      </View>
      <View style={[styles.mini, { bottom: insets.bottom + 8 }]}>
        <MiniPlayer />
      </View>
    </View>
  );
}

/**
 * Екран розділу з v1 («Топ 100», «Колесо фортуни»…): «Назад», серифний заголовок з виділеним словом,
 * прокрутка і міні-плеєр. noScroll — для екранів зі своїм списком чи полотном.
 */
export function TitledScreen({
  pre,
  accent,
  sub,
  right,
  children,
  noScroll,
  refreshing,
  onRefresh,
  back = true,
}: {
  pre: string;
  accent: string;
  sub?: string;
  right?: ReactNode;
  children?: ReactNode;
  noScroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const header = (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
      <View style={styles.topRow}>
        {back ? (
          <IconButton
            label="back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={{ marginLeft: -8 }}
          >
            <ChevronLeft size={26} color={c.text} />
          </IconButton>
        ) : null}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <HlText text={pre} accent={accent} variant="display" />
      {sub ? (
        <Text variant="small" muted style={{ marginTop: 4 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {noScroll ? (
        <View style={{ flex: 1 }}>
          {header}
          {children}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 150 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} />
            ) : undefined
          }
        >
          {header}
          {children}
        </ScrollView>
      )}
      {back ? (
        <View style={[styles.mini, { bottom: insets.bottom + 8 }]}>
          <MiniPlayer />
        </View>
      ) : null}
    </View>
  );
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { position: "absolute", left: 10 },
  mini: { position: "absolute", left: 0, right: 0 },
  topRow: { flexDirection: "row", alignItems: "center", minHeight: 40, marginBottom: 2 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
