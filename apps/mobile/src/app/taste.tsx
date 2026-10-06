/** «Схожий смак» з v1: ваш смак, карта (ближче — схожіший смак), список людей зі спільним. */
import { endpoints, type Taste, type TasteMatch } from "@musicdb/contracts/client";
import { useEndpoint, useMe } from "@musicdb/sdk/react";
import { placeholderGradient } from "@musicdb/tokens";
import { router } from "expo-router";
import { Headphones } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Image as SvgImage, Text as SvgText } from "react-native-svg";
import { TitledScreen } from "@/components/screen";
import { Avatar, Button, Chip, IconButton, Segmented, Skeleton, Text } from "@/components/ui";
import { playCommon, tasteTier } from "@/lib/common";
import { fonts, useColors, useT } from "@/lib/theme";

type Filter = "all" | "friends" | "others";
const openUser = (u: { id: string; username: string | null }) =>
  router.push({ pathname: "/user/[id]", params: { id: u.username ?? u.id } });

export default function TasteScreen() {
  const t = useT();
  const c = useColors();
  const me = useMe().data;
  const { data, isLoading, refetch, isRefetching } = useEndpoint(endpoints.discover.taste, undefined, {
    enabled: !!me,
  });
  const taste = data as Taste | undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const people = useMemo(
    () =>
      (taste?.items ?? []).filter((p) =>
        filter === "all" ? true : filter === "friends" ? p.friend : !p.friend,
      ),
    [taste, filter],
  );
  return (
    <TitledScreen
      pre={t("taste.headingPre")}
      accent={t("taste.headingAccent")}
      sub={t("taste.sub")}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {!me ? (
        <View style={{ padding: 32, alignItems: "center", gap: 14 }}>
          <Text muted style={{ textAlign: "center" }}>
            {t("taste.loginHint")}
          </Text>
          <Button title={t("common.signIn")} onPress={() => router.push("/login")} />
        </View>
      ) : isLoading || !taste ? (
        <Skeleton width="92%" height={260} style={{ alignSelf: "center", marginTop: 16 }} />
      ) : (
        <View style={{ padding: 16, gap: 16 }}>
          <View style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border }]}>
            <Text variant="heading">{t("taste.meTitle")}</Text>
            <Text variant="small" muted>
              {t("taste.meStats", { liked: taste.me.likedCount, count: taste.me.trackCount })}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {taste.me.topArtists.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push({ pathname: "/artist/[id]", params: { id: a.slug } })}
                  style={[styles.artist, { borderColor: c.border }]}
                >
                  <Avatar src={a.imageUrl} name={a.name} size={26} />
                  <Text variant="small">{a.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {taste.me.topGenres.map((g) => (
                <Chip
                  key={g.id}
                  label={g.name}
                  active
                  onPress={() => router.push({ pathname: "/genre/[id]", params: { id: g.slug } })}
                />
              ))}
            </View>
          </View>

          {taste.me.trackCount === 0 ? (
            <Text muted style={{ textAlign: "center", padding: 16 }}>
              {t("taste.noData")}
            </Text>
          ) : taste.items.length === 0 ? (
            <Text muted style={{ textAlign: "center", padding: 16 }}>
              {t("taste.noMatches")}
            </Text>
          ) : (
            <>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("taste.filterAll") },
                  { value: "friends", label: t("taste.filterFriends") },
                  { value: "others", label: t("taste.filterOthers") },
                ]}
              />
              <View style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border }]}>
                <Text variant="title">{t("taste.map")}</Text>
                <TasteMap people={people} me={me} />
                <Text variant="caption" muted>
                  {t("taste.mapHint")}
                </Text>
              </View>
              {people.length === 0 ? (
                <Text muted style={{ textAlign: "center" }}>
                  {t("taste.filterEmpty")}
                </Text>
              ) : null}
              {people.map((p) => (
                <Person key={p.user.id} person={p} />
              ))}
            </>
          )}
        </View>
      )}
    </TitledScreen>
  );
}

function Person({ person }: { person: TasteMatch }) {
  const t = useT();
  const c = useColors();
  return (
    <Pressable
      onPress={() => openUser(person.user)}
      style={[styles.person, { backgroundColor: c.surface1, borderColor: c.border }]}
    >
      <Avatar src={person.user.image} name={person.user.name} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {person.user.name}
          </Text>
          {person.friend ? (
            <View style={[styles.friend, { backgroundColor: `${c.success}26` }]}>
              <Text variant="caption" style={{ color: c.success }}>
                {t("taste.friend")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          variant="caption"
          style={{ color: c[tasteTier(person.match, t).tone], fontFamily: fonts.semibold }}
        >
          {tasteTier(person.match, t).label}
        </Text>
        {person.sharedArtists.length ? (
          <Text variant="small" muted numberOfLines={1}>
            {t("taste.shared")} {person.sharedArtists.map((a) => a.name).join(", ")}
          </Text>
        ) : null}
        {person.sharedFavorites ? (
          <Text variant="caption" muted>
            {t("taste.sharedFavorites", { count: person.sharedFavorites })}
          </Text>
        ) : null}
      </View>
      <IconButton
        label={t("taste.playCommon")}
        onPress={() => void playCommon(person.user.id, person.user.name, t)}
      >
        <Headphones size={20} color={c.textMuted} />
      </IconButton>
      <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: c.accent }}>{person.match}%</Text>
    </Pressable>
  );
}

function TasteMap({ people, me }: { people: TasteMatch[]; me: { name: string; image: string | null } }) {
  const c = useColors();
  const t = useT();
  const size = Dimensions.get("window").width - 32 - 28;
  const C = 200;
  const radius = (m: number) => 40 + (1 - m / 100) * 135;
  return (
    <Svg width={size} height={size} viewBox="0 0 400 400">
      <Defs>
        <ClipPath id="p">
          <Circle r={15} />
        </ClipPath>
        <ClipPath id="me">
          <Circle r={24} />
        </ClipPath>
      </Defs>
      {[75, 50, 25].map((p) => (
        <G key={p}>
          <Circle cx={C} cy={C} r={radius(p)} fill="none" stroke={c.borderStrong} strokeDasharray="3 5" />
          <SvgText x={C + 4} y={C - radius(p) - 4} fontSize={10} fill={c.textSubtle}>
            {`${p}%`}
          </SvgText>
        </G>
      ))}
      {people.map((p, i) => {
        const ang = -Math.PI / 2 + ((i + 0.5) / Math.max(1, people.length)) * Math.PI * 2;
        const r = radius(p.match);
        const x = C + Math.cos(ang) * r;
        const y = C + Math.sin(ang) * r;
        const [col] = placeholderGradient(p.user.id);
        return (
          <G key={p.user.id} x={x} y={y} onPress={() => openUser(p.user)}>
            <Line
              x1={0}
              y1={0}
              x2={C - x}
              y2={C - y}
              stroke={c.accent}
              strokeOpacity={0.12 + p.match / 400}
            />
            <Circle r={17} fill={c.surface1} stroke={p.friend ? c.success : c.borderStrong} strokeWidth={2} />
            {p.user.image ? (
              <SvgImage
                href={{ uri: p.user.image }}
                x={-15}
                y={-15}
                width={30}
                height={30}
                clipPath="url(#p)"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <>
                <Circle r={15} fill={col} />
                <SvgText textAnchor="middle" y={4} fontSize={12} fontWeight="700" fill="#fff">
                  {p.user.name.slice(0, 1).toUpperCase()}
                </SvgText>
              </>
            )}
          </G>
        );
      })}
      <G x={C} y={C}>
        <Circle r={27} fill={c.surface1} stroke={c.accent} strokeWidth={3} />
        {me.image ? (
          <SvgImage
            href={{ uri: me.image }}
            x={-24}
            y={-24}
            width={48}
            height={48}
            clipPath="url(#me)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <SvgText textAnchor="middle" y={5} fontSize={14} fontWeight="700" fill={c.accent}>
            {t("taste.you")}
          </SvgText>
        )}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  artist: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 10,
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  friend: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
});
