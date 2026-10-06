import type { Artist, Genre, Playlist, Release, Shelf as ShelfData, Track } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import type { ContextInfo } from "@musicdb/player";
import { useLikedIds, useMe, useToggleLike } from "@musicdb/sdk/react";
import { placeholderGradient } from "@musicdb/tokens";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Heart, MoreVertical, Pause, Play } from "lucide-react-native";
import type { ReactNode } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, View } from "react-native";
import { api } from "@/lib/api";
import { useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";
import { AccentFill, Cover, IconButton, Text, Vinyl } from "./ui";

export function useContextPlaying(context: ContextInfo) {
  return usePlayer(
    (s) =>
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null) &&
      (s.status === "playing" || s.status === "loading"),
  );
}

export function PlayButton({
  tracks,
  context,
  size = 56,
  trackId,
}: {
  tracks: Track[] | (() => Promise<Track[]>);
  context: ContextInfo;
  size?: number;
  /** Кнопка однієї пісні: «активна», лише коли грає саме ця пісня, а не її радіо. */
  trackId?: string;
}) {
  const c = useColors();
  const contextPlaying = useContextPlaying(context);
  const contextActive = usePlayer(
    (s) => s.context?.type === context.type && (s.context?.id ?? null) === (context.id ?? null),
  );
  const isCurrent = usePlayer((s) => !!trackId && s.current?.track.id === trackId);
  const isCurrentPlaying = usePlayer(
    (s) => !!trackId && s.current?.track.id === trackId && (s.status === "playing" || s.status === "loading"),
  );
  const active = trackId ? isCurrent : contextActive;
  const playing = trackId ? isCurrentPlaying : contextPlaying;
  const onPress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (active) return playerStore.getState().togglePlay();
    const list = typeof tracks === "function" ? await tracks() : tracks;
    if (list.length) playerStore.getState().playContext(list, 0, context);
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <AccentFill style={StyleSheet.absoluteFill} />
      {playing ? (
        <Pause size={size * 0.42} color={c.onAccent} fill={c.onAccent} />
      ) : (
        <Play size={size * 0.42} color={c.onAccent} fill={c.onAccent} style={{ marginLeft: 3 }} />
      )}
    </Pressable>
  );
}

export function LikeButton({ track, size = 22 }: { track: Pick<Track, "id">; size?: number }) {
  const c = useColors();
  const me = useMe().data;
  const liked = useLikedIds().has(track.id);
  const toggle = useToggleLike();
  return (
    <IconButton
      label="like"
      onPress={() => {
        if (!me) return router.push("/login");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggle.mutate({ trackId: track.id, liked: !liked });
      }}
    >
      <Heart size={size} color={liked ? c.accent : c.textMuted} fill={liked ? c.accent : "transparent"} />
    </IconButton>
  );
}

export function TrackRow({
  track,
  index,
  onPress,
  showCover = true,
  context,
  right,
}: {
  track: Track;
  index?: number;
  onPress: () => void;
  showCover?: boolean;
  context: ContextInfo;
  right?: ReactNode;
}) {
  const c = useColors();
  const current = usePlayer(
    (s) =>
      s.current?.track.id === track.id &&
      s.context?.type === context.type &&
      (s.context?.id ?? null) === (context.id ?? null),
  );
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surface2 }]}
    >
      {index !== undefined && !showCover ? (
        <Text variant="small" muted style={{ width: 22, textAlign: "right" }}>
          {index + 1}
        </Text>
      ) : null}
      {showCover ? (
        <Cover src={track.release?.coverUrl} size={48} seed={track.release?.id ?? track.id} radius={4} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={current ? { color: c.accent } : undefined}>
          {track.title}
        </Text>
        <Text variant="small" muted numberOfLines={1}>
          {track.explicit ? "🅴 " : ""}
          {track.artists.map((a) => a.name).join(", ")}
        </Text>
      </View>
      {right ?? (
        <Text variant="small" muted>
          {track.durationMs ? formatDuration(track.durationMs) : ""}
        </Text>
      )}
      <IconButton
        label="more"
        size={32}
        onPress={() => router.push({ pathname: "/track/[id]", params: { id: track.id } })}
      >
        <MoreVertical size={18} color={c.textMuted} />
      </IconButton>
    </Pressable>
  );
}

function Card({
  onPress,
  cover,
  title,
  subtitle,
  active,
  disc,
}: {
  onPress: () => void;
  cover: ReactNode;
  title: string;
  subtitle: string;
  active?: boolean;
  disc?: { src: string | null | undefined; seed: string };
}) {
  const playing = usePlayer((s) => s.status === "playing");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      <View>
        {active && disc ? (
          <Vinyl
            src={disc.src}
            seed={disc.seed}
            playing={playing}
            size={136}
            style={{ position: "absolute", top: 6, left: 30 }}
          />
        ) : null}
        {cover}
      </View>
      <Text variant="bodyStrong" accent={active} numberOfLines={1} style={{ marginTop: 8 }}>
        {title}
      </Text>
      <Text variant="small" muted numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function useContextActive(type: ContextInfo["type"], id: string) {
  return usePlayer((s) => s.context?.type === type && s.context?.id === id);
}

export function ReleaseCard({ release }: { release: Release }) {
  const t = useT();
  const active = useContextActive("album", release.id);
  return (
    <Card
      active={active}
      disc={{ src: release.coverUrl, seed: release.id }}
      onPress={() => router.push({ pathname: "/album/[id]", params: { id: release.id } })}
      cover={<Cover src={release.coverUrl} size={148} seed={release.id} />}
      title={release.title}
      subtitle={`${release.releaseDate?.slice(0, 4) ?? ""}${release.releaseDate ? " · " : ""}${release.type === "album" ? release.artists.map((a) => a.name).join(", ") : t(`release.${release.type}`)}`}
    />
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const t = useT();
  const active = useContextActive("playlist", playlist.id);
  return (
    <Card
      active={active}
      onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: playlist.id } })}
      cover={<Cover src={playlist.coverUrl ?? playlist.mosaic[0]} size={148} seed={playlist.id} />}
      title={playlist.title}
      subtitle={t("library.playlistBy", { name: playlist.owner.name })}
    />
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  const t = useT();
  const active = useContextActive("artist", artist.id);
  return (
    <Card
      active={active}
      onPress={() => router.push({ pathname: "/artist/[id]", params: { id: artist.slug || artist.id } })}
      cover={<Cover src={artist.imageUrl} size={148} seed={artist.id} round />}
      title={artist.name}
      subtitle={t("library.artist")}
    />
  );
}

export function TrackCard({ track }: { track: Track }) {
  // Картка пісні активна, лише поки грає саме ця пісня (а не наступні з її радіо).
  const active = usePlayer((s) => s.current?.track.id === track.id);
  return (
    <Card
      active={active}
      disc={{ src: track.release?.coverUrl, seed: track.release?.id ?? track.id }}
      onPress={async () => {
        // Уже грає саме ця пісня — пауза/продовження, а не перезапуск.
        if (active) return playerStore.getState().togglePlay();
        const radio = await api.tracks
          .radio({ params: { id: track.id }, query: { limit: 30 } })
          .catch(() => ({ items: [] }));
        playerStore
          .getState()
          .playContext([track, ...radio.items], 0, { type: "radio", id: track.id, name: track.title });
      }}
      cover={<Cover src={track.release?.coverUrl} size={148} seed={track.release?.id ?? track.id} />}
      title={track.title}
      subtitle={track.artists.map((a) => a.name).join(", ")}
    />
  );
}

export function GenreTile({ genre, width }: { genre: Pick<Genre, "id" | "name" | "slug">; width: number }) {
  const [a, b] = placeholderGradient(genre.slug);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/genre/[id]", params: { id: genre.slug } })}
      style={{ width, height: width * 0.56 }}
    >
      <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.genre}>
        <Text variant="title" style={{ color: "#fff", textTransform: "capitalize" }}>
          {genre.name}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Shelf<T>({
  title,
  data,
  render,
  keyOf,
}: {
  title: string;
  data: T[];
  render: (item: T) => ReactNode;
  keyOf: (item: T) => string;
}) {
  if (!data.length) return null;
  return (
    <View style={{ marginTop: 24 }}>
      <Text variant="heading" style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyOf}
        renderItem={({ item }) => <>{render(item)}</>}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />
    </View>
  );
}

export function ShelfView({ shelf }: { shelf: ShelfData }) {
  switch (shelf.kind) {
    case "tracks":
      return (
        <Shelf
          title={shelf.title}
          data={shelf.items}
          keyOf={(x) => x.id}
          render={(x) => <TrackCard track={x} />}
        />
      );
    case "releases":
      return (
        <Shelf
          title={shelf.title}
          data={shelf.items}
          keyOf={(x) => x.id}
          render={(x) => <ReleaseCard release={x} />}
        />
      );
    case "artists":
      return (
        <Shelf
          title={shelf.title}
          data={shelf.items}
          keyOf={(x) => x.id}
          render={(x) => <ArtistCard artist={x} />}
        />
      );
    case "playlists":
      return (
        <Shelf
          title={shelf.title}
          data={shelf.items}
          keyOf={(x) => x.id}
          render={(x) => <PlaylistCard playlist={x} />}
        />
      );
    case "genres":
      return (
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text variant="heading" style={{ marginBottom: 10 }}>
            {shelf.title}
          </Text>
          <View style={styles.genreGrid}>
            {shelf.items.slice(0, 8).map((g) => (
              <GenreTile key={g.id} genre={g} width={(Dimensions.get("window").width - 42) / 2} />
            ))}
          </View>
        </View>
      );
  }
}

/**
 * Шапка альбому/плейлиста/треку «вкладкою платівки» (як на сайті): м'яке сяйво кольору замість суцільного
 * градієнта, обкладинка (для альбомів і треків — з платівкою, що виглядає з конверта й обертається, коли
 * цей контекст грає), тип дрібними капітелями з акцентною рискою, звичайний серифний заголовок.
 */
export function HeroHeader({
  image,
  seed,
  kind,
  title,
  meta,
  round,
  disc,
}: {
  image: string | null | undefined;
  seed: string;
  kind: string;
  title: string;
  meta?: string;
  round?: boolean;
  disc?: { playing: boolean };
}) {
  const c = useColors();
  const [a] = placeholderGradient(seed);
  const size = 200;
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={[`${a}aa`, `${a}22`, "transparent"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ width: disc ? size * 1.3 : size, height: size, alignItems: "flex-start" }}>
        {disc ? (
          <Vinyl
            src={image}
            seed={seed}
            playing={disc.playing}
            size={size * 0.92}
            style={{ position: "absolute", top: size * 0.04, left: size * 0.38 }}
          />
        ) : null}
        <Cover src={image} size={size} seed={seed} round={round} radius={8} style={styles.heroCover} />
      </View>
      <View style={styles.kindRow}>
        <View style={{ width: 18, height: 1, backgroundColor: c.accent }} />
        <Text
          variant="caption"
          accent
          style={{ textTransform: "uppercase", letterSpacing: 1.8, fontWeight: "700" }}
        >
          {kind}
        </Text>
      </View>
      <Text variant="display" style={{ textAlign: "center", marginTop: 6 }} numberOfLines={3}>
        {title}
      </Text>
      {meta ? (
        <Text variant="small" muted style={{ marginTop: 6, textAlign: "center" }}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export const playList = (tracks: Track[], index: number, context: ContextInfo) =>
  playerStore.getState().playContext(tracks, index, context);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  card: { width: 160, padding: 6 },
  genre: { flex: 1, borderRadius: 10, padding: 12 },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  hero: { alignItems: "center", paddingTop: 72, paddingBottom: 18, paddingHorizontal: 20 },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 },
  heroCover: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
});
