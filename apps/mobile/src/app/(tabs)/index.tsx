import { endpoints } from "@musicdb/contracts/client";
import { useEndpoint, useLibrary, useMe } from "@musicdb/sdk/react";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, Heart, Settings } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShelfView } from "@/components/music";
import { Avatar, Button, Cover, IconButton, Skeleton, Text } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";

function greetingKey() {
  const h = new Date().getHours();
  if (h < 5) return "home.goodNight" as const;
  if (h < 12) return "home.goodMorning" as const;
  if (h < 18) return "home.goodAfternoon" as const;
  return "home.goodEvening" as const;
}

export default function Home() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const library = useLibrary().data;
  const home = useEndpoint(endpoints.discover.home, undefined, { staleTime: 60_000 });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
      refreshControl={
        <RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} tintColor={c.text} />
      }
    >
      <LinearGradient
        colors={[`${c.accent}33`, "transparent"]}
        style={[StyleSheet.absoluteFill, { height: 320 }]}
      />
      <View style={styles.header}>
        {me.data ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/user/[id]", params: { id: me.data!.username ?? me.data!.id } })
            }
          >
            <Avatar src={me.data.image} name={me.data.name} size={34} />
          </Pressable>
        ) : null}
        <Text variant="heading" style={{ flex: 1 }}>
          {t(greetingKey())}
        </Text>
        {me.data ? (
          <>
            <IconButton label={t("nav.notifications")} onPress={() => router.push("/notifications")}>
              <Bell size={22} color={c.text} />
            </IconButton>
            <IconButton label={t("nav.settings")} onPress={() => router.push("/settings")}>
              <Settings size={22} color={c.text} />
            </IconButton>
          </>
        ) : null}
      </View>

      {!me.isLoading && !me.data ? (
        <View style={[styles.welcome, { backgroundColor: c.surface2 }]}>
          <Text variant="display">{t("home.welcomeTitle")}</Text>
          <Text variant="body" muted style={{ marginTop: 8 }}>
            {t("home.welcomeText")}
          </Text>
          <Button
            title={t("common.signIn")}
            variant="accent"
            onPress={() => router.push("/login")}
            style={{ marginTop: 16, alignSelf: "flex-start" }}
          />
        </View>
      ) : null}

      {me.data ? (
        <View style={styles.quick}>
          <QuickTile
            title={t("nav.likedSongs")}
            onPress={() => router.push("/collection")}
            cover={
              <View style={[styles.liked, { backgroundColor: "#6a4ce0" }]}>
                <Heart size={20} color="#fff" fill="#fff" />
              </View>
            }
          />
          {(library?.playlists ?? []).slice(0, 5).map((p) => (
            <QuickTile
              key={p.id}
              title={p.title}
              onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: p.id } })}
              cover={<Cover src={p.coverUrl ?? p.mosaic[0]} size={56} seed={p.id} radius={0} />}
            />
          ))}
        </View>
      ) : null}

      {home.isLoading ? (
        <View style={{ padding: 16, gap: 16 }}>
          <Skeleton width="60%" height={26} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Skeleton width={148} height={148} />
            <Skeleton width={148} height={148} />
          </View>
        </View>
      ) : null}
      {home.data?.shelves.map((shelf) => (
        <ShelfView key={shelf.id} shelf={shelf} />
      ))}
    </ScrollView>
  );
}

function QuickTile({
  title,
  cover,
  onPress,
}: {
  title: string;
  cover: React.ReactNode;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surface2, opacity: pressed ? 0.7 : 1 }]}
    >
      {cover}
      <Text variant="small" numberOfLines={2} style={{ flex: 1, fontWeight: "700" }}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  welcome: { margin: 16, padding: 20, borderRadius: 16 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 8 },
  tile: {
    width: "48.5%",
    height: 56,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  liked: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
});
