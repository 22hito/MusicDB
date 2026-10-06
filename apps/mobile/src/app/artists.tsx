/** «Всі виконавці»: пошук, сортування (як у v1), сітка. */
import { type Artist, endpoints } from "@musicdb/contracts/client";
import { useInfiniteEndpoint } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { TitledScreen } from "@/components/screen";
import { Button, Chip, Cover, Text } from "@/components/ui";
import { fonts, useColors, useT } from "@/lib/theme";

const sorts = ["popular", "tracks", "followers", "name", "name_desc", "newest"] as const;

export default function ArtistsScreen() {
  const t = useT();
  const c = useColors();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const [sort, setSort] = useState<(typeof sorts)[number]>("popular");
  const list = useInfiniteEndpoint(endpoints.artists.list, {
    query: { sort, limit: 48, ...(query ? { q: query } : {}) },
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Artist[]) ?? [], [list.data]);
  const size = (Dimensions.get("window").width - 16 * 2 - 12 * 2) / 3;
  return (
    <TitledScreen pre={t("artists.headingPre")} accent={t("artists.headingAccent")}>
      <View style={[styles.search, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Search size={18} color={c.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("artists.search")}
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 15 }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {sorts.map((s) => (
          <Chip key={s} label={t(`artists.${s}`)} active={sort === s} onPress={() => setSort(s)} />
        ))}
      </ScrollView>
      {!list.isLoading && items.length === 0 ? (
        <Text muted style={{ textAlign: "center", padding: 32 }}>
          {t("artists.empty")}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {items.map((a) => (
          <Pressable
            key={a.id}
            style={{ width: size }}
            onPress={() => router.push({ pathname: "/artist/[id]", params: { id: a.slug } })}
          >
            <Cover src={a.imageUrl} size={size} seed={a.id} round />
            <Text
              variant="small"
              numberOfLines={1}
              style={{ marginTop: 6, textAlign: "center", fontFamily: fonts.semibold }}
            >
              {a.name}
            </Text>
            <Text variant="caption" muted style={{ textAlign: "center" }}>
              {t("release.songs", { count: a.trackCount })}
            </Text>
          </Pressable>
        ))}
      </View>
      {list.hasNextPage ? (
        <Button
          variant="outline"
          title={t("wheel.more")}
          loading={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
          style={{ alignSelf: "center", marginTop: 16 }}
        />
      ) : null}
    </TitledScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: 16,
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, rowGap: 18 },
});
