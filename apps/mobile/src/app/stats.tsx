/**
 * «Моя статистика» (у дусі Last.fm і stats.fm): підсумки за період, топи зі смужками, години доби,
 * дні тижня й теплова карта активності за рік. Часовий пояс — з пристрою.
 */
import { endpoints, type MyStats } from "@musicdb/contracts/client";
import { useEndpoint, useMe } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { Flame } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { playList } from "@/components/music";
import { TitledScreen } from "@/components/screen";
import { Avatar, Button, Chip, Cover, Segmented, Skeleton, Text } from "@/components/ui";
import { fonts, useColors, usePrefs, useT } from "@/lib/theme";

const periods = ["week", "month", "year", "all"] as const;

export default function StatsScreen() {
  const t = useT();
  const c = useColors();
  const me = useMe();
  const [period, setPeriod] = useState<(typeof periods)[number]>("month");
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const { data, isLoading, refetch, isRefetching } = useEndpoint(
    endpoints.me.stats,
    { query: { period, tz } },
    { enabled: !!me.data },
  );
  const stats = data as MyStats | undefined;
  const empty = stats && stats.totals.plays === 0;

  if (!me.isLoading && !me.data) {
    return (
      <TitledScreen pre={t("stats.headingPre")} accent={t("stats.headingAccent")} sub={t("stats.sub")}>
        <View style={{ padding: 32, alignItems: "center", gap: 14 }}>
          <Text muted style={{ textAlign: "center" }}>
            {t("stats.loginHint")}
          </Text>
          <Button title={t("common.signIn")} onPress={() => router.push("/login")} />
        </View>
      </TitledScreen>
    );
  }

  const tiles = [
    [t("stats.plays"), stats?.totals.plays],
    [t("stats.minutes"), stats?.totals.minutes],
    [t("stats.tracks"), stats?.totals.tracks],
    [t("stats.artists"), stats?.totals.artists],
  ] as const;

  return (
    <TitledScreen
      pre={t("stats.headingPre")}
      accent={t("stats.headingAccent")}
      sub={t("stats.sub")}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 6 }}
      >
        <Segmented
          value={period}
          onChange={setPeriod}
          options={periods.map((p) => ({ value: p, label: t(`stats.${p}`) }))}
        />
      </ScrollView>
      <View style={styles.tiles}>
        {tiles.map(([label, value], i) => (
          <Animated.View
            key={label}
            entering={FadeInDown.delay(i * 50).springify()}
            style={[styles.tile, { backgroundColor: c.surface1, borderColor: c.border }]}
          >
            <Text variant="caption" muted>
              {label}
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: c.accent }}>
              {value === undefined ? "—" : value.toLocaleString("uk-UA")}
            </Text>
          </Animated.View>
        ))}
        <Animated.View
          entering={FadeInDown.delay(220).springify()}
          style={[
            styles.tile,
            styles.streak,
            { backgroundColor: c.accentSoft, borderColor: `${c.accent}66` },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Flame size={14} color={c.accent} />
            <Text variant="caption" accent>
              {t("stats.streak")}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: c.accent }}>
            {stats?.streakDays ?? "—"}
          </Text>
        </Animated.View>
      </View>

      {isLoading ? (
        <Skeleton width="92%" height={240} style={{ alignSelf: "center", marginTop: 16 }} />
      ) : null}
      {empty ? (
        <Text muted style={{ textAlign: "center", padding: 32 }}>
          {t("stats.empty")}
        </Text>
      ) : null}

      {stats && !empty ? (
        <View style={{ gap: 16, padding: 16 }}>
          <Card title={t("stats.topArtists")}>
            {stats.topArtists.map(({ artist, plays }, i) => (
              <Pressable
                key={artist.id}
                onPress={() => router.push({ pathname: "/artist/[id]", params: { id: artist.slug } })}
                style={styles.rankRow}
              >
                <Bar share={plays / stats.topArtists[0]!.plays} />
                <Text style={styles.rankNo}>{i + 1}</Text>
                <Avatar src={artist.imageUrl} name={artist.name} size={34} />
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {artist.name}
                </Text>
                <Text variant="caption" muted>
                  {t("stats.playsShort", { count: plays })}
                </Text>
              </Pressable>
            ))}
          </Card>
          <Card title={t("stats.topTracks")}>
            {stats.topTracks.map(({ track, plays }, i) => (
              <Pressable
                key={track.id}
                onPress={() =>
                  playList(
                    stats.topTracks.map((x) => x.track),
                    i,
                    { type: "profile", name: t("stats.topTracks") },
                  )
                }
                style={styles.rankRow}
              >
                <Bar share={plays / stats.topTracks[0]!.plays} />
                <Text style={styles.rankNo}>{i + 1}</Text>
                <Cover src={track.release?.coverUrl} size={38} seed={track.id} radius={6} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {track.artists.map((a) => a.name).join(", ")}
                  </Text>
                </View>
                <Text variant="caption" muted>
                  {t("stats.playsShort", { count: plays })}
                </Text>
              </Pressable>
            ))}
          </Card>
          <Card title={t("stats.byHour")}>
            <HourChart byHour={stats.byHour} />
          </Card>
          <Card title={t("stats.byWeekday")}>
            <WeekdayChart byWeekday={stats.byWeekday} />
          </Card>
          {stats.topGenres.length ? (
            <Card title={t("stats.topGenres")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {stats.topGenres.map(({ genre, plays }) => (
                  <Chip
                    key={genre.id}
                    label={`${genre.name} · ${plays}`}
                    onPress={() => router.push({ pathname: "/genre/[id]", params: { id: genre.slug } })}
                  />
                ))}
              </View>
            </Card>
          ) : null}
          <Card title={t("stats.activity")}>
            <Heatmap daily={stats.daily} />
          </Card>
        </View>
      ) : null}
    </TitledScreen>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border }]}
    >
      <Text variant="heading" style={{ fontSize: 20 }}>
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

function Bar({ share }: { share: number }) {
  const c = useColors();
  return (
    <View
      pointerEvents="none"
      style={[styles.bar, { width: `${Math.max(4, share * 100)}%`, backgroundColor: c.accentSoft }]}
    />
  );
}

function HourChart({ byHour }: { byHour: number[] }) {
  const t = useT();
  const c = useColors();
  const max = Math.max(1, ...byHour);
  const peak = byHour.indexOf(Math.max(...byHour));
  return (
    <View>
      <Text variant="small" muted>
        {t("stats.peak", { hour: String(peak).padStart(2, "0") })}
      </Text>
      <View style={styles.hours}>
        {byHour.map((n, h) => (
          <View
            key={h}
            style={{
              flex: 1,
              height: `${n ? Math.max(4, (n / max) * 100) : 2}%`,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              backgroundColor: h === peak ? c.accent : `${c.accent}55`,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {[0, 6, 12, 18, 23].map((h) => (
          <Text key={h} variant="caption" muted>
            {String(h).padStart(2, "0")}
          </Text>
        ))}
      </View>
    </View>
  );
}

function WeekdayChart({ byWeekday }: { byWeekday: number[] }) {
  const c = useColors();
  const { locale } = usePrefs();
  const max = Math.max(1, ...byWeekday);
  const names = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "uk-UA", { weekday: "short" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );
  return (
    <View style={{ gap: 6 }}>
      {byWeekday.map((n, i) => (
        <View key={names[i]} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text variant="small" muted style={{ width: 28 }}>
            {names[i]}
          </Text>
          <View style={[styles.track, { backgroundColor: c.surface3 }]}>
            <View
              style={{
                width: `${(n / max) * 100}%`,
                height: "100%",
                borderRadius: 4,
                backgroundColor: c.accent,
              }}
            />
          </View>
          <Text variant="caption" muted style={{ width: 28, textAlign: "right" }}>
            {n}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Теплова карта за ~6 останніх місяців (на телефоні рік не вміщається): тижні стовпчиками. */
function Heatmap({ daily }: { daily: { date: string; plays: number }[] }) {
  const t = useT();
  const c = useColors();
  const recent = daily.slice(-26 * 7);
  const max = Math.max(1, ...recent.map((d) => d.plays));
  const first = new Date(`${recent[0]?.date ?? "2024-01-01"}T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = [...Array.from({ length: lead }, () => null), ...recent];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const shade = (n: number) =>
    n === 0
      ? c.surface3
      : [`${c.accent}40`, `${c.accent}70`, `${c.accent}b0`, c.accent][
          Math.min(3, Math.ceil((n / max) * 4) - 1)
        ]!;
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {weeks.map((week, w) => (
            <View key={w} style={{ gap: 3 }}>
              {week.map((d, i) =>
                d ? (
                  <View key={d.date} style={[styles.cell, { backgroundColor: shade(d.plays) }]} />
                ) : (
                  <View key={`e${i}`} style={styles.cell} />
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 4,
          marginTop: 8,
        }}
      >
        <Text variant="caption" muted>
          {t("stats.less")}
        </Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View
            key={l}
            style={[styles.cell, { backgroundColor: l === 0 ? c.surface3 : shade((l / 4) * max) }]}
          />
        ))}
        <Text variant="caption" muted>
          {t("stats.more")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  streak: { width: "100%" },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  rankNo: { width: 18, textAlign: "right", fontFamily: fonts.serifSemibold, fontSize: 14, opacity: 0.6 },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 10 },
  hours: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 120, marginVertical: 8 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  cell: { width: 11, height: 11, borderRadius: 3 },
});
