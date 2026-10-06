/** «Що послухати» — хаб розділів з v1: колесо, батл, топ, смак, рекомендації, виконавці, граф, каталог. */
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TitledScreen } from "@/components/screen";
import { Logo, Text } from "@/components/ui";
import { exploreTiles } from "@/lib/nav";
import { fonts, useColors, useT } from "@/lib/theme";

export default function ExploreTab() {
  const t = useT();
  const c = useColors();
  return (
    <TitledScreen
      pre={t("explore.headingPre")}
      accent={t("explore.headingAccent")}
      back={false}
      right={<Logo size={26} />}
    >
      <View style={styles.list}>
        {exploreTiles(t).map((tile, i) => (
          <Animated.View key={tile.href} entering={FadeInDown.delay(i * 45).springify()}>
            <Pressable
              onPress={() => router.push(tile.href as never)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: c.surface1, borderColor: c.border },
                pressed && { backgroundColor: c.surface2, transform: [{ scale: 0.99 }] },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
                <tile.icon size={24} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 18 }}>{tile.title}</Text>
                <Text variant="small" muted style={{ marginTop: 2 }}>
                  {tile.sub}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </TitledScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
