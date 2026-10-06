import { endpoints, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useInfiniteEndpoint } from "@musicdb/sdk/react";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ArtistCard, HeroHeader, PlayButton, playList, Shelf, TrackRow } from "@/components/music";
import { ActionRow, DetailScreen } from "@/components/screen";
import { useT } from "@/lib/theme";

export default function GenreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const genre = useEndpoint(endpoints.genres.get, { params: { id } });
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { genre: id, sort: "popular", limit: 50 },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const g = genre.data;
  if (!g) return <DetailScreen loading={genre.isLoading} error={genre.error ? t("common.notFound") : null} />;
  const context = { type: "genre" as const, id: g.id, name: g.name };
  return (
    <DetailScreen>
      <HeroHeader
        image={null}
        seed={g.slug}
        kind={t("search.genres")}
        title={g.name}
        meta={t("release.songs", { count: g.trackCount })}
      />
      <ActionRow>
        <PlayButton tracks={tracks} context={context} />
      </ActionRow>
      <Shelf
        title={t("search.artists")}
        data={g.topArtists}
        keyOf={(x) => x.id}
        render={(x) => <ArtistCard artist={x} />}
      />
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          context={context}
          onPress={() => playList(tracks, i, context)}
        />
      ))}
    </DetailScreen>
  );
}
