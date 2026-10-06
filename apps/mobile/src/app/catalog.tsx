/**
 * Таблиця пісень з v1 у мобільному вигляді: статистика (дотик — граф схожості), три джерела,
 * пошук, жанр, сортування колонок, перемішування, підвантаження.
 */
import { endpoints, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useInfiniteEndpoint } from "@musicdb/sdk/react";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowDown, ArrowUp, Headphones, Plus, Search, Shuffle, X } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LikeButton } from "@/components/music";
import { TitledScreen } from "@/components/screen";
import { Button, Chip, Cover, IconButton, Segmented, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { fonts, useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";

type Source = "catalog" | "community" | "background";
type Column = "title" | "artist" | "release" | "duration" | "album" | "plays" | "rating";
const columns: Column[] = ["title", "artist", "album", "release", "duration", "plays", "rating"];

const filtersFor = (source: Source) =>
  source === "background" ? ({ playable: "audio" } as const) : ({ source, playable: "any" } as const);

export default function CatalogScreen() {
  const t = useT();
  const c = useColors();
  const params = useLocalSearchParams<{ source?: string }>();
  const [source, setSource] = useState<Source>(
    params.source === "community" || params.source === "background" ? params.source : "catalog",
  );
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const [genre, setGenre] = useState<{ slug: string; name: string } | null>(null);
  const [sort, setSort] = useState<{ column: Column; dir: "asc" | "desc" } | null>(null);
  const [decade, setDecade] = useState<number | null>(null);
  const [picker, setPicker] = useState<"genre" | "sort" | "decade" | null>(null);
  const timeline = useEndpoint(endpoints.discover.timeline);

  const stats = useEndpoint(endpoints.discover.stats, { query: filtersFor(source) });
  const base = {
    ...filtersFor(source),
    ...(genre ? { genre: genre.slug } : {}),
    ...(query ? { q: query } : {}),
    ...(decade ? { decade } : {}),
  };
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { ...base, limit: 50, ...(sort ? { column: sort.column, dir: sort.dir } : { sort: "popular" }) },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const context = {
    type: "catalog" as const,
    id: source,
    name: t(`catalog.source${source[0]!.toUpperCase()}${source.slice(1)}` as "catalog.sourceCatalog"),
  };
  const heading = {
    catalog: [t("catalog.headingPre"), t("catalog.headingAccent")],
    community: [t("catalog.communityPre"), t("catalog.communityAccent")],
    background: [t("catalog.backgroundPre"), t("catalog.backgroundAccent")],
  }[source] as [string, string];

  const shuffle = async () => {
    const seed = Math.random().toString(36).slice(2, 10);
    const res = await api.tracks.browse({ query: { ...base, sort: "random", seed, limit: 100 } });
    if (res.items.length) playerStore.getState().playContext(res.items, 0, context);
  };

  const stat = [
    [t("catalog.statSongs"), stats.data?.tracks, "songs"],
    [t("catalog.statGenres"), stats.data?.genres, "genres"],
    [t("catalog.statAlbums"), stats.data?.albums, "albums"],
    [t("catalog.statSingles"), stats.data?.singles, "singles"],
  ] as const;

  return (
    <TitledScreen
      pre={heading[0]}
      accent={heading[1]}
      {...(source !== "catalog"
        ? { sub: source === "community" ? t("catalog.communityHint") : t("catalog.backgroundHint") }
        : {})}
      refreshing={list.isRefetching}
      onRefresh={() => list.refetch()}
    >
      <View style={styles.stats}>
        {stat.map(([label, value, kind]) => (
          <View key={kind} style={[styles.stat, { backgroundColor: c.surface1, borderColor: c.border }]}>
            <Text variant="caption" muted>
              {label}
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 24, color: c.accent }}>
              {value === undefined ? "—" : value.toLocaleString("uk-UA")}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            { value: "catalog", label: t("catalog.sourceCatalog") },
            { value: "community", label: t("catalog.sourceCommunity") },
            { value: "background", label: t("catalog.sourceBackground") },
          ]}
        />
      </ScrollView>

      <View style={[styles.search, { backgroundColor: c.surface2, borderColor: c.border }]}>
        <Search size={18} color={c.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("catalog.searchPlaceholder")}
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 15 }}
        />
        {q ? (
          <IconButton label={t("common.close")} size={28} onPress={() => setQ("")}>
            <X size={16} color={c.textMuted} />
          </IconButton>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={genre ? `${genre.name} ✕` : t("catalog.allGenres")}
          active={!!genre}
          onPress={() => (genre ? setGenre(null) : setPicker("genre"))}
        />
        <Chip
          label={
            decade ? `${t("catalog.decadeShort", { decade: String(decade) })} ✕` : t("catalog.allDecades")
          }
          active={!!decade}
          onPress={() => (decade ? setDecade(null) : setPicker("decade"))}
        />
        <Chip
          label={
            sort ? `${t(`catalog.${sort.column}`)} ${sort.dir === "asc" ? "↑" : "↓"}` : t("catalog.sort")
          }
          active={!!sort}
          onPress={() => setPicker("sort")}
        />
        <Pressable onPress={shuffle} style={[styles.action, { borderColor: c.borderStrong }]}>
          <Shuffle size={15} color={c.text} />
          <Text variant="small">{t("common.shuffle")}</Text>
        </Pressable>
        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/upload`)}
          style={[styles.action, { borderColor: c.borderStrong }]}
        >
          <Plus size={15} color={c.text} />
          <Text variant="small">{source === "community" ? t("catalog.addOwn") : t("catalog.request")}</Text>
        </Pressable>
      </ScrollView>

      {tracks.map((track, i) => (
        <CatalogRow
          key={track.id}
          track={track}
          index={i}
          context={context}
          showUploader={source === "community"}
          onPress={() => playerStore.getState().playContext(tracks, i, context)}
          onGenre={(g) => setGenre(g)}
        />
      ))}
      {!list.isLoading && tracks.length === 0 ? (
        <Text muted style={{ textAlign: "center", padding: 32 }}>
          {t("search.noResults", { query: q || "…" })}
        </Text>
      ) : null}
      {list.hasNextPage ? (
        <Button
          variant="outline"
          title={t("wheel.more")}
          loading={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
          style={{ alignSelf: "center", marginTop: 12 }}
        />
      ) : null}

      <GenrePicker
        visible={picker === "genre"}
        onClose={() => setPicker(null)}
        onPick={(g) => {
          setGenre(g);
          setPicker(null);
        }}
      />
      <Sheet visible={picker === "decade"} onClose={() => setPicker(null)} title={t("catalog.decade")}>
        {(timeline.data?.decades ?? [])
          .slice()
          .reverse()
          .map((d) => (
            <Pressable
              key={d.decade}
              onPress={() => {
                setDecade(d.decade);
                setPicker(null);
              }}
              style={styles.sheetRow}
            >
              <Text style={{ flex: 1, fontFamily: fonts.serif, fontSize: 18 }}>
                {t("catalog.decadeShort", { decade: String(d.decade) })}
              </Text>
              <Text variant="small" muted>
                {d.tracks}
              </Text>
            </Pressable>
          ))}
      </Sheet>
      <SortPicker
        visible={picker === "sort"}
        sort={sort}
        onClose={() => setPicker(null)}
        onPick={(s) => {
          setSort(s);
          setPicker(null);
        }}
      />
    </TitledScreen>
  );
}

function CatalogRow({
  track,
  index,
  context,
  showUploader,
  onPress,
  onGenre,
}: {
  track: Track;
  index: number;
  context: { type: string; id?: string };
  showUploader: boolean;
  onPress: () => void;
  onGenre: (g: { slug: string; name: string }) => void;
}) {
  const c = useColors();
  const current = usePlayer(
    (s) =>
      s.current?.track.id === track.id && s.context?.type === context.type && s.context?.id === context.id,
  );
  const rating = track.rating.count ? Math.round(track.rating.average ?? 0) : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
    >
      <Text variant="caption" muted style={{ width: 26, textAlign: "right" }}>
        {index + 1}
      </Text>
      <Cover src={track.release?.coverUrl} size={48} seed={track.id} radius={6} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            variant="bodyStrong"
            numberOfLines={1}
            style={[{ flexShrink: 1 }, current && { color: c.accent }]}
          >
            {track.title}
          </Text>
          {track.playback.audio ? <Headphones size={13} color={c.success} /> : null}
        </View>
        <Text variant="small" muted numberOfLines={1}>
          {track.artists.map((a) => a.name).join(", ")}
          {track.release ? ` · ${track.release.title}` : ""}
          {showUploader && track.uploader ? ` · ${track.uploader.name}` : ""}
        </Text>
        <View style={styles.meta}>
          {track.genres.slice(0, 2).map((g) => (
            <Pressable
              key={g.id}
              onPress={() => onGenre(g)}
              style={[styles.genre, { borderColor: c.border }]}
            >
              <Text variant="caption" style={{ color: c.text2 }} numberOfLines={1}>
                {g.name}
              </Text>
            </Pressable>
          ))}
          <Text variant="caption" muted>
            ▶ {track.playCount}
          </Text>
          {rating !== null ? (
            <Text
              variant="caption"
              style={{ color: rating >= 60 ? c.accent : c.warning, fontFamily: fonts.bold }}
            >
              ★ {rating}
            </Text>
          ) : null}
        </View>
      </View>
      <LikeButton track={track} size={20} />
    </Pressable>
  );
}

function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface2, paddingBottom: insets.bottom + 12 }]}>
        <Text variant="heading" style={{ marginBottom: 8 }}>
          {title}
        </Text>
        {children}
      </View>
    </Modal>
  );
}

function GenrePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (g: { slug: string; name: string }) => void;
}) {
  const t = useT();
  const c = useColors();
  const [q, setQ] = useState("");
  const genres = useEndpoint(endpoints.genres.list, undefined, { enabled: visible });
  const items = (genres.data?.items ?? [])
    .filter((g) => g.trackCount > 0 && g.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.trackCount - a.trackCount);
  return (
    <Sheet visible={visible} onClose={onClose} title={t("catalog.genres")}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("wheel.searchGenre")}
        placeholderTextColor={c.textMuted}
        style={[styles.sheetSearch, { backgroundColor: c.surface3, color: c.text }]}
      />
      <FlatList
        style={{ maxHeight: 420 }}
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPick(item)} style={styles.sheetRow}>
            <Text style={{ flex: 1 }}>{item.name}</Text>
            <Text variant="small" muted>
              {item.trackCount}
            </Text>
          </Pressable>
        )}
      />
    </Sheet>
  );
}

function SortPicker({
  visible,
  sort,
  onClose,
  onPick,
}: {
  visible: boolean;
  sort: { column: Column; dir: "asc" | "desc" } | null;
  onClose: () => void;
  onPick: (s: { column: Column; dir: "asc" | "desc" } | null) => void;
}) {
  const t = useT();
  const c = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title={t("catalog.sort")}>
      <Pressable onPress={() => onPick(null)} style={styles.sheetRow}>
        <Text style={{ flex: 1, color: sort ? c.text : c.accent }}>{t("artists.popular")}</Text>
      </Pressable>
      {columns.map((col) =>
        (["asc", "desc"] as const).map((dir) => {
          const active = sort?.column === col && sort.dir === dir;
          const Icon = dir === "asc" ? ArrowUp : ArrowDown;
          return (
            <Pressable
              key={`${col}-${dir}`}
              onPress={() => onPick({ column: col, dir })}
              style={styles.sheetRow}
            >
              <Text style={{ flex: 1, color: active ? c.accent : c.text }}>{t(`catalog.${col}`)}</Text>
              <Icon size={16} color={active ? c.accent : c.textMuted} />
            </Pressable>
          );
        }),
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16 },
  stat: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
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
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  action: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  genre: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, maxWidth: 140 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetSearch: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
});
