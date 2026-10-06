/**
 * «Машина часу»: десятиліття й роки на шкалі (висота поділки — скільки пісень того року),
 * головне за рік чи десятиліття, «Слухати» й «Радіо десятиліття».
 */
import { type Era, endpoints, type Timeline } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { ArtistCard, playList, ReleaseCard, Shelf, TrackRow } from "@/components/music";
import { TitledScreen } from "@/components/screen";
import { Button, IconButton, Skeleton, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { fonts, useColors, useT } from "@/lib/theme";

type Selection = { decade: number; year: number | null };

export default function TimeMachineScreen() {
  const t = useT();
  const c = useColors();
  const params = useLocalSearchParams<{ year?: string; decade?: string }>();
  const { data } = useEndpoint(endpoints.discover.timeline);
  const timeline = data as Timeline | undefined;
  const [selection, setSelection] = useState<Selection | null>(null);

  // Початковий вибір: з параметрів, інакше — рік, у якому найбільше пісень.
  useEffect(() => {
    if (!timeline?.decades.length || selection) return;
    const year = Number(params.year);
    if (year >= 1900) return setSelection({ decade: Math.floor(year / 10) * 10, year });
    const best = timeline.decades
      .flatMap((d) => d.years)
      .reduce((a, b) => (b.tracks > a.tracks ? b : a), { year: 0, tracks: -1 });
    setSelection({ decade: Math.floor(best.year / 10) * 10, year: best.year });
  }, [timeline, params.year, selection]);

  const decadeInfo = timeline?.decades.find((d) => d.decade === selection?.decade);
  const allYears = useMemo(
    () => timeline?.decades.flatMap((d) => d.years.map((y) => y.year)) ?? [],
    [timeline],
  );
  const step = (dir: 1 | -1) => {
    if (!selection?.year) return;
    const next = allYears[allYears.indexOf(selection.year) + dir];
    if (next) setSelection({ decade: Math.floor(next / 10) * 10, year: next });
  };
  const from = selection ? (selection.year ?? selection.decade) : null;
  const to = selection ? (selection.year ?? selection.decade + 9) : null;
  const era = useEndpoint(
    endpoints.discover.era,
    { params: { from: from ?? 2000, to: to ?? 2000 } },
    { enabled: from !== null },
  );
  const info = era.data as Era | undefined;
  const label = selection?.year
    ? String(selection.year)
    : t("timeMachine.decade", { decade: String(selection?.decade ?? "") });
  const context = { type: "era" as const, id: `${from}-${to}`, name: label };
  const [radio, setRadio] = useState(false);

  return (
    <TitledScreen
      pre={t("timeMachine.headingPre")}
      accent={t("timeMachine.headingAccent")}
      sub={t("timeMachine.sub")}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.decades}>
        {timeline?.decades.map((d) => {
          const active = selection?.decade === d.decade;
          return (
            <Pressable
              key={d.decade}
              onPress={() => setSelection({ decade: d.decade, year: null })}
              style={[
                styles.decade,
                {
                  borderColor: active ? c.accent : c.border,
                  backgroundColor: active ? c.accentSoft : c.surface1,
                },
              ]}
            >
              <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: active ? c.accent : c.text }}>
                {t("timeMachine.decade", { decade: String(d.decade) })}
              </Text>
              <Text variant="caption" muted>
                {t("release.songs", { count: d.tracks })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {decadeInfo && selection ? (
        <View style={[styles.dial, { backgroundColor: c.surface1, borderColor: c.border }]}>
          <View style={styles.dialHead}>
            <Text variant="caption" muted style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("timeMachine.scale")}
            </Text>
            <Pressable
              onPress={() => setSelection({ decade: decadeInfo.decade, year: null })}
              style={[styles.whole, selection.year === null && { backgroundColor: c.accent }]}
            >
              <Text variant="caption" style={{ color: selection.year === null ? c.onAccent : c.text2 }}>
                {t("timeMachine.wholeDecade")}
              </Text>
            </Pressable>
          </View>
          <View style={styles.bars}>
            {Array.from({ length: 10 }, (_, i) => {
              const year = decadeInfo.decade + i;
              const n = decadeInfo.years.find((y) => y.year === year)?.tracks ?? 0;
              const max = Math.max(1, ...decadeInfo.years.map((y) => y.tracks));
              const selected = selection.year === year;
              return (
                <Pressable
                  key={year}
                  disabled={!n}
                  onPress={() => setSelection({ decade: decadeInfo.decade, year })}
                  style={styles.barCol}
                >
                  <Animated.View
                    key={`${decadeInfo.decade}-${year}`}
                    entering={FadeInUp.delay(i * 30).springify()}
                    style={{
                      width: "70%",
                      height: `${n ? Math.max(6, (n / max) * 100) : 3}%`,
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                      backgroundColor: selected ? c.accent : n ? `${c.accent}66` : c.surface3,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.ticks, { borderTopColor: c.borderStrong }]}>
            {Array.from({ length: 10 }, (_, i) => {
              const year = decadeInfo.decade + i;
              return (
                <Text
                  key={year}
                  variant="caption"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: selection.year === year ? c.accent : c.textMuted,
                    fontFamily: selection.year === year ? fonts.bold : fonts.medium,
                  }}
                >
                  {i === 0 || selection.year === year ? year : `'${String(year).slice(2)}`}
                </Text>
              );
            })}
          </View>
        </View>
      ) : (
        <Skeleton width="92%" height={160} style={{ alignSelf: "center" }} />
      )}

      {selection ? (
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {selection.year ? (
              <IconButton label={t("timeMachine.prev")} onPress={() => step(-1)}>
                <ChevronLeft size={24} color={c.text} />
              </IconButton>
            ) : null}
            <Animated.View key={label} entering={FadeInDown.springify()} style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 64, lineHeight: 70, color: c.text }}>
                {label}
              </Text>
              <Text variant="small" muted>
                {info ? t("release.songs", { count: info.trackCount }) : "…"}
              </Text>
            </Animated.View>
            {selection.year ? (
              <IconButton label={t("timeMachine.next")} onPress={() => step(1)}>
                <ChevronRight size={24} color={c.text} />
              </IconButton>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Button
              title={t("timeMachine.playYear", { period: label })}
              disabled={!info?.tracks.length}
              onPress={() =>
                info &&
                playList(
                  [...info.tracks].sort(() => Math.random() - 0.5),
                  0,
                  context,
                )
              }
            />
            <Button
              variant="outline"
              title={t("timeMachine.radioDecade", { decade: String(selection.decade) })}
              loading={radio}
              onPress={async () => {
                setRadio(true);
                try {
                  const seed = Math.random().toString(36).slice(2, 10);
                  const res = await api.tracks.browse({
                    query: { decade: selection.decade, sort: "random", seed, limit: 100 },
                  });
                  if (res.items.length)
                    playList(res.items, 0, {
                      type: "era",
                      id: `radio-${selection.decade}`,
                      name: t("timeMachine.radioDecade", { decade: String(selection.decade) }),
                    });
                } finally {
                  setRadio(false);
                }
              }}
            />
          </View>
        </View>
      ) : null}

      {info && info.trackCount === 0 ? (
        <Text muted style={{ textAlign: "center", padding: 32 }}>
          {t("timeMachine.empty")}
        </Text>
      ) : null}

      {info?.tracks.length ? (
        <View style={{ marginTop: 20 }}>
          <Text variant="heading" style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            {t("timeMachine.top", { period: label })}
          </Text>
          {info.tracks.slice(0, 15).map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              context={context}
              onPress={() => playList(info.tracks, i, context)}
            />
          ))}
        </View>
      ) : null}

      {info?.genres.length ? (
        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 6 }}>
          <Text variant="heading" style={{ marginBottom: 4 }}>
            {t("timeMachine.genres")}
          </Text>
          {info.genres.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => router.push({ pathname: "/genre/[id]", params: { id: g.slug } })}
              style={[styles.genre, { borderColor: c.border }]}
            >
              <View
                style={[
                  styles.genreBar,
                  {
                    width: `${(g.tracks / Math.max(1, info.genres[0]!.tracks)) * 100}%`,
                    backgroundColor: c.accentSoft,
                  },
                ]}
              />
              <Text style={{ flex: 1 }}>{g.name}</Text>
              <Text variant="small" muted>
                {g.tracks}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {info?.releases.length ? (
        <Shelf
          title={t("timeMachine.albums")}
          data={info.releases}
          keyOf={(x) => x.id}
          render={(x) => <ReleaseCard release={x} />}
        />
      ) : null}
      {info?.artists.length ? (
        <Shelf
          title={t("timeMachine.artists")}
          data={info.artists}
          keyOf={(x) => x.id}
          render={(x) => <ArtistCard artist={x} />}
        />
      ) : null}
    </TitledScreen>
  );
}

const styles = StyleSheet.create({
  decades: { gap: 8, padding: 16, paddingBottom: 12 },
  decade: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  dial: { marginHorizontal: 16, borderWidth: 1, borderRadius: 18, padding: 12 },
  dialHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  whole: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 120 },
  barCol: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  ticks: { flexDirection: "row", borderTopWidth: 1, paddingTop: 4, marginTop: 2 },
  genre: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  genreBar: { position: "absolute", left: 0, top: 0, bottom: 0 },
});
