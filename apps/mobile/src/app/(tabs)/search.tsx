import { endpoints } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { keepPreviousData } from "@tanstack/react-query";
import { router } from "expo-router";
import { Search as SearchIcon, X } from "lucide-react-native";
import { useDeferredValue, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArtistCard,
  GenreTile,
  PlaylistCard,
  playList,
  ReleaseCard,
  Shelf,
  TrackRow,
} from "@/components/music";
import { Avatar, Text } from "@/components/ui";
import { fonts, useColors, useT } from "@/lib/theme";

export default function SearchScreen() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const results = useEndpoint(
    endpoints.discover.search,
    { query: { q: query, limit: 10 } },
    { enabled: query.length > 0, placeholderData: keepPreviousData },
  );
  const genres = useEndpoint(endpoints.genres.list, undefined, { staleTime: 10 * 60_000 });
  const data = query ? results.data : undefined;
  const context = { type: "search" as const, id: query, name: query };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <Text variant="display" style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        {t("nav.search")}
      </Text>
      <View style={[styles.input, { backgroundColor: c.text }]}>
        <SearchIcon size={20} color={c.bg} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("search.placeholder")}
          placeholderTextColor="#666"
          style={{ flex: 1, color: c.bg, fontFamily: fonts.semibold, fontSize: 15 }}
          returnKeyType="search"
          autoCorrect={false}
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={10}>
            <X size={20} color={c.bg} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
        {data ? (
          <>
            {data.tracks.slice(0, 6).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                context={context}
                onPress={() => playList(data.tracks, i, context)}
              />
            ))}
            <Shelf
              title={t("search.artists")}
              data={data.artists}
              keyOf={(x) => x.id}
              render={(x) => <ArtistCard artist={x} />}
            />
            <Shelf
              title={t("search.albums")}
              data={data.releases}
              keyOf={(x) => x.id}
              render={(x) => <ReleaseCard release={x} />}
            />
            <Shelf
              title={t("search.playlists")}
              data={data.playlists}
              keyOf={(x) => x.id}
              render={(x) => <PlaylistCard playlist={x} />}
            />
            {data.users.length ? (
              <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 8 }}>
                <Text variant="heading">{t("search.profiles")}</Text>
                {data.users.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() =>
                      router.push({ pathname: "/user/[id]", params: { id: u.username ?? u.id } })
                    }
                    style={styles.user}
                  >
                    <Avatar src={u.image} name={u.name} size={44} />
                    <Text variant="bodyStrong">{u.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {!data.tracks.length && !data.artists.length && !data.releases.length ? (
              <Text muted style={{ textAlign: "center", marginTop: 48 }}>
                {t("search.noResults", { query })}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text variant="title" style={{ marginBottom: 12 }}>
              {t("search.browseAll")}
            </Text>
            <View style={styles.grid}>
              {(genres.data?.items ?? []).slice(0, 40).map((g) => (
                <GenreTile key={g.id} genre={g} width={(width - 42) / 2} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    marginHorizontal: 16,
    height: 46,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  user: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
});
