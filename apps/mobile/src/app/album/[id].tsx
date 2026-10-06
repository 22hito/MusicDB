import { endpoints } from "@musicdb/contracts/client";
import { formatLongDuration } from "@musicdb/i18n";
import { useEndpoint, useSaveRelease } from "@musicdb/sdk/react";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, PlusCircle, Shuffle } from "lucide-react-native";
import { HeroHeader, PlayButton, playList, ReleaseCard, Shelf, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { IconButton } from "@/components/ui";
import { useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const { data, isLoading, error } = useEndpoint(endpoints.releases.get, { params: { id } });
  const save = useSaveRelease();
  // Платівка в шапці обертається, поки грає цей альбом.
  const here = usePlayer(
    (s) => s.status === "playing" && s.context?.type === "album" && s.context?.id === id,
  );
  if (!data) return <DetailScreen loading={isLoading} error={error ? t("common.notFound") : null} />;
  const context = { type: "album" as const, id: data.id, name: data.title };
  const saved = !!data.viewer?.saved;
  return (
    <DetailScreen>
      <HeroHeader
        disc={{ playing: here }}
        image={data.coverUrl}
        seed={data.id}
        kind={t(`release.${data.type}`)}
        title={data.title}
        meta={`${data.artists.map((a) => a.name).join(", ")} · ${data.releaseDate?.slice(0, 4) ?? ""} · ${formatLongDuration(data.durationMs, t)}`}
      />
      <ActionRow>
        <IconButton
          label="save"
          onPress={() =>
            data.viewer ? save.mutate({ releaseId: data.id, save: !saved }) : router.push("/login")
          }
        >
          {saved ? <CheckCircle2 size={28} color={c.accent} /> : <PlusCircle size={28} color={c.textMuted} />}
        </IconButton>
        <IconButton
          label={t("common.shuffle")}
          onPress={() => playerStore.getState().playContext(data.tracks, 0, context, { shuffle: true })}
        >
          <Shuffle size={26} color={c.textMuted} />
        </IconButton>
        <PlayButton tracks={data.tracks} context={context} />
      </ActionRow>
      {data.tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          index={i}
          showCover={false}
          context={context}
          onPress={() => playList(data.tracks, i, context)}
        />
      ))}
      {data.artists[0] ? (
        <Shelf
          title={t("release.moreBy", { name: data.artists[0].name })}
          data={data.moreByArtist}
          keyOf={(x) => x.id}
          render={(x) => <ReleaseCard release={x} />}
        />
      ) : null}
    </DetailScreen>
  );
}
