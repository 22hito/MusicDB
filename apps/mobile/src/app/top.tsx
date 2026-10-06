/**
 * Топ 100 найпрослуханіших (як у v1): п'єдестал 2·1·3, смужка частки слухачів, рух у чарті (▲/▼/НОВЕ,
 * як у Billboard / Last.fm), чарти за періодом, джерелом і жанром.
 */
import { type ChartEntry, endpoints } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { MEDALS } from "@musicdb/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { Crown } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LikeButton, PlayButton, playList } from "@/components/music";
import { TitledScreen } from "@/components/screen";
import { Chip, Cover, Segmented, Skeleton, Text } from "@/components/ui";
import { fonts, useColors, useT } from "@/lib/theme";
import { usePlayer } from "@/player/store";

type ChartTrack = ChartEntry;
const periods = ["day", "week", "month", "all"] as const;
const sources = ["all", "catalog", "community"] as const;

export default function TopScreen() {
  const t = useT();
  const [period, setPeriod] = useState<(typeof periods)[number]>("week");
  const [source, setSource] = useState<(typeof sources)[number]>("all");
  const [genre, setGenre] = useState<{ slug: string; name: string } | null>(null);
  const genres = useEndpoint(endpoints.genres.list);
  const topGenres = useMemo(
    () => [...(genres.data?.items ?? [])].sort((a, b) => b.trackCount - a.trackCount).slice(0, 14),
    [genres.data],
  );
  const { data, isLoading, refetch, isRefetching } = useEndpoint(endpoints.discover.charts, {
    query: {
      period,
      limit: 100,
      ...(source !== "all" ? { source } : {}),
      ...(genre ? { genre: genre.slug } : {}),
    },
  });
  const tracks = (data?.items ?? []) as ChartTrack[];
  const context = {
    type: "chart" as const,
    id: `${period}-${source}-${genre?.slug ?? "all"}`,
    name: [t("nav.top"), t(`top.${period}`), genre?.name].filter(Boolean).join(" · "),
  };
  const leader = Math.max(1, tracks[0]?.listeners ?? 0, tracks[0]?.plays ?? 0);
  const play = (i: number) => playList(tracks, i, context);
  return (
    <TitledScreen
      pre={t("top.headingPre")}
      accent={t("top.headingAccent")}
      sub={t("top.sub")}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <View style={styles.controls}>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={periods.map((p) => ({ value: p, label: t(`top.${p}`) }))}
        />
        <PlayButton tracks={tracks} context={context} size={48} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Segmented
          value={source}
          onChange={setSource}
          options={sources.map((x) => ({
            value: x,
            label:
              x === "all"
                ? t("top.sourceAll")
                : t(x === "catalog" ? "catalog.sourceCatalog" : "catalog.sourceCommunity"),
          }))}
        />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t("top.allGenres")} active={!genre} onPress={() => setGenre(null)} />
        {topGenres.map((g) => (
          <Chip
            key={g.id}
            label={g.name}
            active={genre?.slug === g.slug}
            onPress={() => setGenre(genre?.slug === g.slug ? null : g)}
          />
        ))}
      </ScrollView>
      {isLoading ? (
        <Skeleton width="92%" height={260} style={{ alignSelf: "center", borderRadius: 16 }} />
      ) : tracks.length === 0 ? (
        <Text muted style={{ textAlign: "center", padding: 40 }}>
          {t("top.empty")}
        </Text>
      ) : (
        <>
          <View style={styles.podium}>
            {[1, 0, 2]
              .filter((i) => tracks[i])
              .map((i) => (
                <PodiumPlace key={tracks[i]!.id} track={tracks[i]!} place={i} onPress={() => play(i)} />
              ))}
          </View>
          <View style={{ marginTop: 16 }}>
            {tracks.slice(3).map((x, k) => (
              <TopRow
                key={x.id}
                track={x}
                share={(x.listeners || x.plays) / leader}
                onPress={() => play(k + 3)}
                context={context}
              />
            ))}
          </View>
        </>
      )}
    </TitledScreen>
  );
}

function PodiumPlace({ track, place, onPress }: { track: ChartTrack; place: number; onPress: () => void }) {
  const t = useT();
  const c = useColors();
  const medal = MEDALS[place]!;
  const coverSize = place === 0 ? 104 : 88;
  const stand = [96, 70, 52][place]!;
  return (
    <Pressable onPress={onPress} style={styles.place}>
      <View style={[styles.podiumCover, { borderColor: medal }]}>
        <Cover src={track.release?.coverUrl} size={coverSize} seed={track.id} radius={10} />
        {place === 0 ? (
          <Crown size={20} color={medal} fill={medal} style={{ position: "absolute", top: 6, left: 6 }} />
        ) : null}
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 6, textAlign: "center" }}>
        {track.title}
      </Text>
      <Text variant="caption" muted numberOfLines={1} style={{ textAlign: "center" }}>
        {track.artists.map((a) => a.name).join(", ")}
      </Text>
      <LinearGradient colors={[`${medal}55`, `${medal}0a`]} style={[styles.stand, { height: stand }]}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: medal }}>{place + 1}</Text>
        <Text variant="caption" style={{ color: c.text2 }}>
          {t("top.listeners", { count: track.listeners || track.plays })}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Рух у чарті відносно попереднього періоду. */
function Movement({ track }: { track: ChartTrack }) {
  const t = useT();
  const c = useColors();
  if (track.isNew)
    return (
      <View style={[styles.newBadge, { backgroundColor: c.accent }]}>
        <Text style={{ fontFamily: fonts.black, fontSize: 8, color: c.onAccent }}>{t("top.isNew")}</Text>
      </View>
    );
  if (track.previousRank === null) return <View style={{ width: 22 }} />;
  const delta = track.previousRank - track.rank;
  if (delta === 0)
    return (
      <Text variant="caption" style={{ width: 22, textAlign: "center", color: c.textSubtle }}>
        —
      </Text>
    );
  return (
    <Text
      variant="caption"
      style={{
        width: 22,
        textAlign: "center",
        fontFamily: fonts.bold,
        color: delta > 0 ? c.success : c.danger,
      }}
    >
      {delta > 0 ? "▲" : "▼"}
      {Math.abs(delta)}
    </Text>
  );
}

function TopRow({
  track,
  share,
  onPress,
  context,
}: {
  track: ChartTrack;
  share: number;
  onPress: () => void;
  context: { type: string; id?: string };
}) {
  const c = useColors();
  const current = usePlayer(
    (s) =>
      s.current?.track.id === track.id && s.context?.type === context.type && s.context?.id === context.id,
  );
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
    >
      <View style={{ width: 30, alignItems: "center", gap: 2 }}>
        <Text style={{ fontFamily: fonts.serifSemibold, fontSize: 17, color: c.textMuted }}>
          {track.rank}
        </Text>
        <Movement track={track} />
      </View>
      <Cover src={track.release?.coverUrl} size={46} seed={track.id} radius={6} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={current ? { color: c.accent } : undefined}>
          {track.title}
        </Text>
        <Text variant="small" muted numberOfLines={1}>
          {track.artists.map((a) => a.name).join(", ")}
        </Text>
        <View style={[styles.bar, { backgroundColor: c.surface3 }]}>
          <LinearGradient
            colors={[c.accentLo, c.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${Math.max(3, share * 100)}%`, height: "100%", borderRadius: 2 }}
          />
        </View>
      </View>
      <LikeButton track={track} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  podium: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 10, gap: 8 },
  place: { flex: 1, alignItems: "center", minWidth: 0 },
  podiumCover: { borderWidth: 2, borderRadius: 12, overflow: "hidden" },
  stand: {
    marginTop: 8,
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: "center" },
  newBadge: { width: 26, borderRadius: 4, alignItems: "center", paddingVertical: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 7 },
  bar: { height: 3, borderRadius: 2, marginTop: 5, overflow: "hidden" },
});
