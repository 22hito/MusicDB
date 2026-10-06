/** «Рекомендовано для вас» — підбірка за прослуханим і вподобаним. */
import { endpoints, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useMe } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { View } from "react-native";
import { PlayButton, playList, TrackRow } from "@/components/music";
import { TitledScreen } from "@/components/screen";
import { Button, Skeleton, Text } from "@/components/ui";
import { useT } from "@/lib/theme";

export default function RecommendationsScreen() {
  const t = useT();
  const me = useMe().data;
  const { data, isLoading, refetch, isRefetching } = useEndpoint(
    endpoints.discover.recommendations,
    { query: { limit: 50 } },
    { enabled: !!me },
  );
  const items = (data?.items ?? []) as (Track & { reason: string })[];
  const context = { type: "recommendations" as const, name: t("nav.recommendations") };
  return (
    <TitledScreen
      pre={t("rec.headingPre")}
      accent={t("rec.headingAccent")}
      right={items.length ? <PlayButton tracks={items} context={context} size={44} /> : null}
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
      ) : isLoading ? (
        <Skeleton width="92%" height={300} style={{ alignSelf: "center", marginTop: 16 }} />
      ) : items.length === 0 ? (
        <Text muted style={{ textAlign: "center", padding: 32 }}>
          {t("rec.empty")}
        </Text>
      ) : (
        <View style={{ marginTop: 12 }}>
          {items.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              context={context}
              onPress={() => playList(items, i, context)}
            />
          ))}
        </View>
      )}
    </TitledScreen>
  );
}
