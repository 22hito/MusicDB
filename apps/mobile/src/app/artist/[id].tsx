import { endpoints } from "@musicdb/contracts/client";
import { useEndpoint, useFollowArtist } from "@musicdb/sdk/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ExternalLink, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ArtistCard, PlayButton, playList, ReleaseCard, Shelf, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { Button, IconButton, sized, Text } from "@/components/ui";
import { usePrefs } from "@/lib/theme";
import { playerStore } from "@/player/store";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors: c, locale } = usePrefs();
  const { data, isLoading, error } = useEndpoint(endpoints.artists.get, { params: { id } });
  const follow = useFollowArtist();
  const [all, setAll] = useState(false);
  if (!data) return <DetailScreen loading={isLoading} error={error ? t("common.notFound") : null} />;
  const context = { type: "artist" as const, id: data.id, name: data.name };
  const bioLang = data.bio?.[locale] ? locale : data.bio?.uk ? "uk" : data.bio?.en ? "en" : null;
  const bio = bioLang ? data.bio?.[bioLang] : undefined;
  const bioSource = bioLang ? data.bioSource?.[bioLang] : undefined;
  const country = data.country
    ? (() => {
        try {
          return new Intl.DisplayNames([locale], { type: "region" }).of(data.country) ?? data.country;
        } catch {
          return data.country;
        }
      })()
    : null;
  // Рік — лише для гуртів (рік заснування); для людини це був би рік народження — зайве.
  const isGroup = ["Group", "Orchestra", "Choir"].includes(data.artistType ?? "");
  const chips = [
    [country, isGroup && data.beginYear ? t("artist.since", { year: String(data.beginYear) }) : null]
      .filter(Boolean)
      .join(" · "),
    data.trackCount ? t("artist.trackCount", { count: data.trackCount }) : "",
    data.monthlyListeners ? t("artist.monthlyListeners", { count: data.monthlyListeners }) : "",
    data.followerCount ? t("artist.followers", { count: data.followerCount }) : "",
  ].filter(Boolean);
  return (
    <DetailScreen>
      {/* «Афіша» виконавця, як на сайті: рамка, фото, тип дрібними капітелями, ім'я серифом, чипи. */}
      <View style={[styles.poster, { borderColor: c.border, backgroundColor: c.surface1 }]}>
        {data.imageUrl ? (
          <Image
            source={{ uri: sized(data.imageUrl, 1000) ?? data.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.kindRow}>
          <View style={{ width: 18, height: 1, backgroundColor: c.accent }} />
          <Text
            variant="caption"
            accent
            style={{ textTransform: "uppercase", letterSpacing: 1.8, fontWeight: "700" }}
          >
            {isGroup ? t("artist.group") : t("artist.person")}
          </Text>
        </View>
        <Text variant="display" style={styles.name} numberOfLines={2}>
          {data.name}
        </Text>
        <View style={styles.chips}>
          {chips.map((ch) => (
            <View key={ch} style={styles.chip}>
              <Text variant="caption" style={{ color: "#fff" }}>
                {ch}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {data.links.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.links}>
          {data.links.map((l) => (
            <Pressable
              key={l.kind}
              onPress={() => void Linking.openURL(l.url)}
              style={[styles.link, { borderColor: c.border }]}
            >
              <Text variant="small" muted>
                {t(`artist.link.${l.kind}` as "artist.link.website")}
              </Text>
              <ExternalLink size={12} color={c.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ActionRow>
        <Button
          size="sm"
          variant="outline"
          title={data.viewer?.following ? t("common.following") : t("common.follow")}
          onPress={() =>
            data.viewer
              ? follow.mutate({ artistId: data.id, follow: !data.viewer.following })
              : router.push("/login")
          }
        />
        <View style={{ flex: 1 }} />
        <IconButton
          label={t("common.shuffle")}
          onPress={() => playerStore.getState().playContext(data.topTracks, 0, context, { shuffle: true })}
        >
          <Shuffle size={26} color={c.textMuted} />
        </IconButton>
        <PlayButton tracks={data.topTracks} context={context} />
      </ActionRow>
      <Text variant="heading" style={{ paddingHorizontal: 16, marginBottom: 6 }}>
        {t("artist.popular")}
      </Text>
      {(all ? data.topTracks : data.topTracks.slice(0, 5)).map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          context={context}
          onPress={() => playList(data.topTracks, i, context)}
        />
      ))}
      {data.topTracks.length > 5 ? (
        <Button
          variant="ghost"
          size="sm"
          title={all ? t("common.showLess") : t("common.more")}
          onPress={() => setAll(!all)}
          style={{ alignSelf: "flex-start", marginLeft: 8 }}
        />
      ) : null}
      <Shelf
        title={t("artist.discography")}
        data={data.releases}
        keyOf={(x) => x.id}
        render={(x) => <ReleaseCard release={x} />}
      />
      <Shelf
        title={t("artist.appearsOn")}
        data={data.appearsOn}
        keyOf={(x) => x.id}
        render={(x) => <ReleaseCard release={x} />}
      />
      <Shelf
        title={t("artist.fansAlsoLike")}
        data={data.related}
        keyOf={(x) => x.id}
        render={(x) => <ArtistCard artist={x} />}
      />
      {bio ? (
        <View style={[styles.about, { backgroundColor: c.surface2 }]}>
          <Text variant="heading" style={{ marginBottom: 8 }}>
            {t("artist.about")}
          </Text>
          <Text muted>{bio}</Text>
          {bioSource ? (
            <Pressable onPress={() => void Linking.openURL(bioSource)} style={{ marginTop: 10 }}>
              <Text variant="caption" muted>
                {t("artist.bioSource")} · CC BY-SA 4.0
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  poster: {
    marginHorizontal: 16,
    marginTop: 64,
    height: 280,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 18,
  },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#fff", marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  links: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  about: { margin: 16, marginTop: 28, padding: 18, borderRadius: 14 },
});
