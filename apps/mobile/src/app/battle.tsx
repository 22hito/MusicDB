/** Батл рояль: турнір пісень з жанру, свого плейлиста чи плейлиста спільноти (4…1024). */
import { endpoints, type Genre, type Playlist, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useLibrary, useMe } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { Swords, Tags } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tournament } from "@/components/battle";
import { TitledScreen } from "@/components/screen";
import { Button, Cover, Text } from "@/components/ui";
import { api } from "@/lib/api";
import {
  type BattleWinner,
  loadBattle,
  loadWinners,
  type SavedBattle,
  saveBattle,
} from "@/lib/battle-storage";
import { fonts, useColors, useT } from "@/lib/theme";

const SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];
type Pool = { title: string; count: number; load: (size: number) => Promise<Track[]> };

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function genreTracks(genre: Genre, size: number) {
  const seed = Math.random().toString(36).slice(2, 10);
  const out: Track[] = [];
  let cursor: string | undefined;
  while (out.length < size) {
    const page = await api.tracks.browse({
      query: { genre: genre.slug, sort: "random", seed, limit: 100, ...(cursor ? { cursor } : {}) },
    });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

async function playlistTracks(id: string) {
  const p = await api.playlists.get({ params: { id } });
  const seen = new Set<string>();
  return p.items.map((i) => i.track).filter((x) => !seen.has(x.id) && seen.add(x.id));
}

export default function BattleScreen() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const library = useLibrary().data;
  const genres = useEndpoint(endpoints.genres.list);
  const community = useEndpoint(endpoints.playlists.browse, { query: { minTracks: 4, limit: 48 } });
  const battleGenres = useMemo(
    () =>
      (genres.data?.items ?? []).filter((g) => g.trackCount >= 4).sort((a, b) => b.trackCount - a.trackCount),
    [genres.data],
  );
  const own = (library?.playlists ?? []).filter((p) => p.owner.id === me?.id && p.trackCount >= 4);
  const [pool, setPool] = useState<Pool | null>(null);
  const [genrePicker, setGenrePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState<{
    tracks: Track[];
    title: string;
    choices: (0 | 1)[];
    pool: Pool | null;
  } | null>(null);
  const [saved, setSaved] = useState<SavedBattle | null>(null);
  const [winners, setWinners] = useState<BattleWinner[]>([]);
  useEffect(() => {
    if (game) return;
    void loadBattle().then(setSaved);
    void loadWinners().then(setWinners);
  }, [game]);

  const start = async (size: number) => {
    if (!pool) return;
    setLoading(true);
    try {
      const tracks = shuffled(await pool.load(size)).slice(0, size);
      if (tracks.length < size) throw new Error("few");
      setGame({ tracks, title: pool.title, choices: [], pool });
      setPool(null);
    } catch {
      Alert.alert(t("battle.notEnough"));
    } finally {
      setLoading(false);
    }
  };

  const fromPlaylist = (p: Playlist): Pool => ({
    title: p.title,
    count: p.trackCount,
    load: () => playlistTracks(p.id),
  });
  const tile = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

  const grid = (list: Playlist[], showOwner?: boolean) => (
    <View style={styles.grid}>
      {list.map((p) => (
        <Pressable key={p.id} style={{ width: tile }} onPress={() => setPool(fromPlaylist(p))}>
          <Cover src={p.coverUrl ?? p.mosaic[0]} size={tile} seed={p.id} radius={10} />
          <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 6 }}>
            {p.title}
          </Text>
          <Text variant="small" muted numberOfLines={1}>
            {showOwner ? `${p.owner.name} · ` : ""}
            {t("release.songs", { count: p.trackCount })}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <TitledScreen
      pre={t("battle.headingPre")}
      accent={t("battle.headingAccent")}
      sub={t("explore.battleSub")}
    >
      {saved ? (
        <View style={[styles.card, { backgroundColor: c.accentSoft, borderColor: `${c.accent}80` }]}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 18 }}>{t("battle.resumeTitle")}</Text>
          <Text variant="small" style={{ color: c.text2 }}>
            {t("battle.resumeText", {
              title: saved.title,
              x: saved.choices.length,
              n: saved.initial.length - 1,
            })}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title={t("battle.resume")}
              onPress={() =>
                setGame({ tracks: saved.initial, title: saved.title, choices: saved.choices, pool: null })
              }
            />
            <Button
              variant="ghost"
              title={t("battle.discard")}
              onPress={() => {
                saveBattle(null);
                setSaved(null);
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Tags size={22} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 18 }}>{t("battle.genreHeading")}</Text>
            <Text variant="small" muted>
              {t("battle.genreHint")}
            </Text>
          </View>
        </View>
        {battleGenres.length ? (
          <Button
            title={t("battle.genreStart")}
            icon={<Swords size={16} color={c.onAccent} />}
            onPress={() => setGenrePicker(true)}
          />
        ) : (
          <Text muted>{t("battle.genreEmpty")}</Text>
        )}
      </View>

      {winners.length ? (
        <>
          <Text variant="heading" style={styles.section}>
            {t("battle.winnersTitle")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          >
            {winners.map((w) => (
              <Pressable
                key={`${w.id}-${w.at}`}
                style={{ width: 130 }}
                onPress={() => router.push({ pathname: "/track/[id]", params: { id: w.id } })}
              >
                <Cover src={w.cover} size={130} seed={w.id} radius={10} />
                <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 6 }}>
                  {w.title}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {w.pool} · {w.size}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text variant="heading" style={styles.section}>
        {t("battle.ownHeading")}
      </Text>
      {!me ? (
        <View style={{ paddingHorizontal: 16, gap: 10, alignItems: "flex-start" }}>
          <Text muted>{t("battle.ownLogin")}</Text>
          <Button size="sm" title={t("common.signIn")} onPress={() => router.push("/login")} />
        </View>
      ) : own.length ? (
        grid(own)
      ) : (
        <Text muted style={{ paddingHorizontal: 16 }}>
          {t("battle.ownEmpty")}
        </Text>
      )}

      <Text variant="heading" style={styles.section}>
        {t("battle.publicHeading")}
      </Text>
      {community.data?.items.length ? (
        grid(community.data.items, true)
      ) : (
        <Text muted style={{ paddingHorizontal: 16 }}>
          {t("battle.publicEmpty")}
        </Text>
      )}

      {/* Вибір жанру */}
      <Modal
        visible={genrePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setGenrePicker(false)}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]}
          onPress={() => setGenrePicker(false)}
        />
        <View style={[styles.sheet, { backgroundColor: c.surface2, paddingBottom: insets.bottom + 12 }]}>
          <Text variant="heading">{t("battle.genreHeading")}</Text>
          <FlatList
            style={{ maxHeight: 440 }}
            data={battleGenres}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  setGenrePicker(false);
                  setPool({
                    title: item.name,
                    count: item.trackCount,
                    load: (size) => genreTracks(item, size),
                  });
                }}
              >
                <Text style={{ flex: 1 }}>{item.name}</Text>
                <Text variant="small" muted>
                  {item.trackCount}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Розмір турніру */}
      <Modal visible={!!pool} transparent animationType="fade" onRequestClose={() => setPool(null)}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.dim, { backgroundColor: c.overlay }]}
          onPress={() => setPool(null)}
        >
          <Pressable style={[styles.dialog, { backgroundColor: c.surface2 }]}>
            <Text variant="heading">{pool?.title}</Text>
            <Text muted style={{ marginTop: 4, marginBottom: 14 }}>
              {t("battle.chooseSize")}
            </Text>
            <View style={styles.sizes}>
              {SIZES.filter((s) => s <= (pool?.count ?? 0)).map((s) => (
                <Button
                  key={s}
                  title={String(s)}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onPress={() => start(s)}
                />
              ))}
            </View>
            {loading ? (
              <Text muted style={{ marginTop: 12, textAlign: "center" }}>
                {t("battle.loading")}
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {game ? (
        <Tournament
          key={game.tracks.map((x) => x.id).join()}
          initial={game.tracks}
          title={game.title}
          initialChoices={game.choices}
          onExit={() => setGame(null)}
          onRematch={async () => {
            const size = game.tracks.length;
            const tracks = game.pool
              ? shuffled(await game.pool.load(size)).slice(0, size)
              : shuffled(game.tracks);
            setGame({ ...game, tracks, choices: [] });
          }}
        />
      ) : null}
    </TitledScreen>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  section: { paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  dim: { alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 420, borderRadius: 18, padding: 18 },
  sizes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
