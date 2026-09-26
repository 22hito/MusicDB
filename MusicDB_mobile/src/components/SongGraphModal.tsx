import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { ForceGraph, type GraphEdge, type GraphNode } from './ForceGraph';
import { CloseIcon, SearchIcon } from './Icons';
import { CONTROL_HEIGHT, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Граф навколо пісні — як на сайті: знайти пісню, вона в центрі й виділена, навколо
// найсхожіші (жанри, виконавець, альбом) на відстані за схожістю (кола 80/60/40%).
// Натиснути пісню — граф навколо неї; центральну — відтворити.
const EGO_SIZE = 20;
const R_MIN = 90;
const R_MAX = 280;
const COLORS = ['#8a6fb0', '#4f8c6f', '#b5555a', '#5b84a8', '#c98a4b', '#6fa89e', '#9a6b8f', '#7d9153', '#b0703f', '#5f6fa0', '#a3824f'];
const radiusFor = (v: number) => R_MIN + (1 - Math.max(0, Math.min(1, v))) * (R_MAX - R_MIN);

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}
function songSim(a: Song, b: Song) {
  const ga = new Set(a.genres.map((g) => g.toLowerCase()));
  const gb = new Set(b.genres.map((g) => g.toLowerCase()));
  const sameArtist = a.artist && (b.artist || '').toLowerCase() === a.artist.toLowerCase() ? 0.3 : 0;
  const sameAlbum = a.album && b.album === a.album ? 0.1 : 0;
  return Math.min(1, jaccard(ga, gb) * 0.8 + sameArtist + sameAlbum);
}

export function SongGraphModal({
  visible,
  songs,
  initialId,
  onClose,
  onPlay,
}: {
  visible: boolean;
  songs: Song[];
  initialId?: number | null;
  onClose: () => void;
  onPlay: (song: Song) => void;
}) {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [centerId, setCenterId] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const center = songs.find((s) => s.id === (centerId ?? initialId)) ?? songs[0];
  const found = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ql.length < 2 ? [] : songs.filter((s) => `${s.artist} ${s.title}`.toLowerCase().includes(ql)).slice(0, 8);
  }, [songs, q]);

  const graph = useMemo(() => {
    if (!center) return null;
    const scored = songs
      .filter((s) => s.id !== center.id)
      .map((s) => ({ s, v: songSim(center, s) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, EGO_SIZE);
    const items = [center, ...scored.map((x) => x.s)];
    const order = scored.map((_, k) => k + 1).sort((a, b) => (items[a].artist || '').localeCompare(items[b].artist || '') || scored[b - 1].v - scored[a - 1].v);
    const positions: [number, number][] = items.map(() => [400, 300]);
    order.forEach((i, k) => {
      const ang = -Math.PI / 2 + ((k + 0.5) / order.length) * Math.PI * 2;
      const r = radiusFor(scored[i - 1].v) + (k % 2 ? 22 : 0);
      positions[i] = [400 + Math.cos(ang) * r, 300 + Math.sin(ang) * r];
    });
    const nodes: GraphNode[] = items.map((s, i) => ({
      key: String(s.id),
      label: s.title,
      color: i === 0 ? theme.accent : COLORS[i % COLORS.length],
      ring: i === 0,
      size: i === 0 ? 2.2 : 0.8 + scored[i - 1].v * 0.6,
    }));
    const edges: GraphEdge[] = scored.map((x, k) => ({ i: 0, j: k + 1, w: x.v }));
    return { items, nodes, edges, positions };
  }, [songs, center, theme.accent]);

  const pick = (s: Song) => {
    setCenterId(s.id);
    setQ('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]} onPress={() => {}}>
          <View style={styles.head}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {center ? t('graph.egoTitle').replace('{song}', `${center.artist} — ${center.title}`) : t('graph.titleSongs')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <CloseIcon size={14} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.search, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <SearchIcon size={15} color={theme.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('graph.searchPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          {found.length ? (
            <ScrollView style={[styles.results, { borderColor: theme.border }]} keyboardShouldPersistTaps="handled">
              {found.map((s) => (
                <TouchableOpacity key={s.id} onPress={() => pick(s)} style={[styles.result, { borderColor: theme.border }]}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 13 }}>{s.title}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{s.artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : graph ? (
            <View style={[styles.graphCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              <ForceGraph
                nodes={graph.nodes}
                edges={graph.edges}
                positions={graph.positions}
                rings={[80, 60, 40].map((p) => ({ r: radiusFor(p / 100), label: `${p}%` }))}
                radialLabels
                baseRadius={7}
                width={width - SPACING.lg * 2 - 2}
                height={380}
                onPressNode={(i) => (i === 0 ? (onPlay(graph.items[0]), onClose()) : setCenterId(graph.items[i].id))}
              />
            </View>
          ) : null}
          <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>{t('graph.egoHint')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  title: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_SEMIBOLD },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: CONTROL_HEIGHT, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, marginBottom: SPACING.sm },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_REGULAR },
  results: { maxHeight: 380, borderWidth: 1, borderRadius: RADIUS.md },
  result: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  graphCard: { borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
});
