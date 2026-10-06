import { endpoints } from "@musicdb/contracts/client";
import { useApi, useEndpoint, useFollowUser, useMe } from "@musicdb/sdk/react";
import { placeholderGradient } from "@musicdb/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { Alert, StyleSheet, View } from "react-native";
import { ArtistCard, PlaylistCard, playList, Shelf, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { Avatar, Button, IconButton, Text } from "@/components/ui";
import { playCommon } from "@/lib/common";
import { useColors, useT } from "@/lib/theme";

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const api = useApi();
  const me = useMe().data;
  const follow = useFollowUser();
  const { data, isLoading, error, refetch } = useEndpoint(endpoints.users.get, { params: { id } });
  if (!data) return <DetailScreen loading={isLoading} error={error ? t("common.notFound") : null} />;
  const viewer = data.viewer;
  const [a] = placeholderGradient(data.id);
  const context = { type: "profile" as const, id: data.id, name: data.name };
  return (
    <DetailScreen>
      <LinearGradient colors={[a, c.bg]} style={styles.hero}>
        <Avatar src={data.image} name={data.name} size={132} />
        <Text variant="display" style={{ marginTop: 14 }}>
          {data.name}
        </Text>
        <Text variant="small" muted>
          {data.username ? `@${data.username} · ` : ""}
          {data.followerCount} {t("profile.followers").toLowerCase()} · {data.followingCount}{" "}
          {t("profile.following").toLowerCase()}
        </Text>
        {viewer?.tasteMatch != null ? (
          <Text variant="small" accent style={{ marginTop: 4, fontWeight: "700" }}>
            {t("profile.tasteMatch", { value: viewer.tasteMatch })}
          </Text>
        ) : null}
        {data.bio ? (
          <Text muted style={{ marginTop: 8, textAlign: "center" }}>
            {data.bio}
          </Text>
        ) : null}
      </LinearGradient>
      {viewer && !viewer.isSelf ? (
        <ActionRow>
          <Button
            size="sm"
            variant={viewer.following ? "outline" : "primary"}
            title={viewer.following ? t("common.following") : t("common.follow")}
            onPress={() => follow.mutate({ userId: data.id, follow: !viewer.following })}
          />
          {me && !viewer.blocked ? (
            <Button
              size="sm"
              variant="outline"
              title={t("taste.playCommon")}
              onPress={() => void playCommon(data.id, data.name, t)}
            />
          ) : null}
          {me ? (
            <Button
              size="sm"
              variant="outline"
              title={t("profile.message")}
              onPress={async () => {
                const conv = await api.conversations.open({ body: { userId: data.id } });
                router.push({ pathname: "/messages/[id]", params: { id: conv.id } });
              }}
            />
          ) : null}
          {me ? (
            <IconButton
              label={t("common.more")}
              onPress={() =>
                Alert.alert(data.name, undefined, [
                  {
                    text: viewer.blocked ? t("common.unblock") : t("common.block"),
                    style: "destructive",
                    onPress: async () => {
                      if (viewer.blocked) await api.users.unblock({ params: { id: data.id } });
                      else await api.users.block({ params: { id: data.id } });
                      await refetch();
                    },
                  },
                  {
                    text: t("common.report"),
                    onPress: () =>
                      router.push({ pathname: "/report", params: { type: "user", id: data.id } }),
                  },
                  { text: t("common.cancel"), style: "cancel" },
                ])
              }
            >
              <MoreHorizontal size={22} color={c.text} />
            </IconButton>
          ) : null}
        </ActionRow>
      ) : viewer?.isSelf ? (
        <ActionRow>
          <Button
            size="sm"
            variant="outline"
            title={t("profile.editProfile")}
            onPress={() => router.push("/settings")}
          />
        </ActionRow>
      ) : null}
      <Shelf
        title={t("profile.topArtists")}
        data={data.topArtists}
        keyOf={(x) => x.id}
        render={(x) => <ArtistCard artist={x} />}
      />
      {data.recentlyPlayed.length ? (
        <View style={{ marginTop: 24 }}>
          <Text variant="heading" style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            {t("profile.recentlyPlayed")}
          </Text>
          {data.recentlyPlayed.slice(0, 5).map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              context={context}
              onPress={() => playList(data.recentlyPlayed, i, context)}
            />
          ))}
        </View>
      ) : null}
      <Shelf
        title={t("profile.publicPlaylists")}
        data={data.publicPlaylists}
        keyOf={(x) => x.id}
        render={(x) => <PlaylistCard playlist={x} />}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 80, paddingBottom: 16, paddingHorizontal: 20 },
});
