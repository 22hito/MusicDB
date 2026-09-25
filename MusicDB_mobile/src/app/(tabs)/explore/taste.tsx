import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Avatar, Button, EmptyState, ErrorState, SectionTitle, SegmentedPicker } from '@/components/UI';
import { ForceGraph, type GraphEdge, type GraphNode } from '@/components/ForceGraph';
import { MicIcon, UsersIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, RADIUS, SPACING } from '@/constants/theme';
import type { TasteGraph, TasteNode } from '@/api/types';

const ME_COLOR = '#c8a96e';
const FRIEND_COLOR = '#4f8c6f';
const ARTIST_COLOR = '#8a6fb0';
const OTHER_COLORS = ['#8a6fb0', '#b5555a', '#5b84a8', '#c98a4b', '#6fa89e', '#9a6b8f', '#7d9153', '#b0703f', '#5f6fa0', '#a3824f'];

type GraphMode = 'people' | 'artists';
type Item = ({ kind: 'user' } & TasteNode) | { kind: 'artist'; id: number; name: string };

// Кільце з відсотком збігу (як .taste-score на сайті).
function ScoreRing({ score }: { score: number }) {
  const { theme } = useSettings();
  const size = 48;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.surface2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(len * score) / 100} ${len}`}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ color: theme.text, fontFamily: FONT_MONO_MEDIUM, fontSize: 11 }}>{score}%</Text>
    </View>
  );
}

// "Схожий смак": люди з подібними улюбленими піснями й виконавцями + граф.
export default function TasteScreen() {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const requireAuth = useRequireAuth();
  const authed = !!currentUser?.authenticated;
  const { width } = useWindowDimensions();

  const [data, setData] = useState<TasteGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<GraphMode>('people');

  const load = useCallback(() => {
    if (!authed) return;
    setLoading(true);
    api
      .getTaste()
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [api, authed]);

  useEffect(() => {
    load();
  }, [load]);

  // Граф: 'people' — люди (ближче = схожіше); 'artists' — люди разом зі своїми топ-виконавцями.
  const graph = useMemo(() => {
    if (!data || data.nodes.length < 2) return null;
    const people: Item[] = data.nodes.map((n) => ({ kind: 'user' as const, ...n }));
    const idx = new Map(data.nodes.map((n, i) => [n.userId, i]));
    const edges: GraphEdge[] = [];
    for (const e of data.edges) {
      const i = idx.get(e.a);
      const j = idx.get(e.b);
      if (i != null && j != null) edges.push({ i, j, w: mode === 'artists' ? e.weight * 0.6 : e.weight });
    }
    let items = people;
    if (mode === 'artists') {
      const artists = new Map<number, Item>();
      data.nodes.forEach((p) => p.topArtists.forEach((a) => artists.has(a.id) || artists.set(a.id, { kind: 'artist', id: a.id, name: a.name })));
      const artistItems = [...artists.values()];
      const artistIdx = new Map(artistItems.map((a, k) => [(a as { id: number }).id, people.length + k]));
      data.nodes.forEach((p, i) => p.topArtists.forEach((a, rank) => edges.push({ i, j: artistIdx.get(a.id)!, w: 1 - rank * 0.2 })));
      items = [...people, ...artistItems];
    }
    const nodes: GraphNode[] = items.map((it, i) =>
      it.kind === 'artist'
        ? { key: `a${it.id}`, label: it.name, color: ARTIST_COLOR }
        : {
            key: `u${it.userId}`,
            label: it.isMe ? t('taste.you') : it.displayName,
            color: it.isMe ? ME_COLOR : it.relationshipStatus === 'friends' ? FRIEND_COLOR : OTHER_COLORS[i % OTHER_COLORS.length],
            ring: it.isMe,
          },
    );
    return { items, nodes, edges };
  }, [data, mode, t]);

  const openItem = (i: number) => {
    const it = graph?.items[i];
    if (!it) return;
    if (it.kind === 'artist') router.push({ pathname: '/explore/artist/[id]', params: { id: String(it.id), name: it.name } });
    else if (it.isMe) router.push('/profile');
    else router.push({ pathname: '/community/user/[id]', params: { id: String(it.userId) } });
  };

  if (!authed) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sub, { color: theme.muted }]}>{t('taste.sub')}</Text>
          <EmptyState icon="🔒" label={t('taste.loginHint')} />
          <Button label={t('auth.loginBtn')} onPress={() => requireAuth(() => {})} style={{ alignSelf: 'center' }} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (loading && !data) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;
  if (error && !data) return <ErrorState label={t('error.loadFailed')} onRetry={load} />;

  const graphW = width - SPACING.lg * 2 - 2;

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sub, { color: theme.muted }]}>{t('taste.sub')}</Text>

        {graph ? (
          <>
            <SegmentedPicker<GraphMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'people', label: t('taste.graphPeople'), icon: (c) => <UsersIcon size={14} color={c} /> },
                { value: 'artists', label: t('taste.graphArtists'), icon: (c) => <MicIcon size={14} color={c} /> },
              ]}
            />
            <View style={[styles.graphCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ForceGraph nodes={graph.nodes} edges={graph.edges} width={graphW} height={340} onPressNode={openItem} />
            </View>
            <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center', marginBottom: SPACING.md }}>{t('taste.graphHint')}</Text>
          </>
        ) : null}

        {data && data.myItemCount === 0 ? (
          <EmptyState icon="🎧" label={t('taste.noData')} />
        ) : data && !data.matches.length ? (
          <EmptyState icon="👥" label={t('taste.noMatches')} />
        ) : (
          <>
            <SectionTitle label={t('taste.matchesTitle')} />
            {data?.matches.map((m) => {
              const shared = m.sharedArtists.length ? `${t('taste.sharedArtists')} ${m.sharedArtists.map((a) => a.name).join(', ')}` : t('taste.similarGenres');
              const favs = m.sharedFavorites > 0 ? ` · ${t('taste.sharedFavorites').replace('{n}', String(m.sharedFavorites))}` : '';
              return (
                <TouchableOpacity
                  key={m.userId}
                  onPress={() => router.push({ pathname: '/community/user/[id]', params: { id: String(m.userId) } })}
                  style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Avatar url={m.avatarUrl} size={42} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', flexShrink: 1 }}>{m.displayName}</Text>
                      {m.relationshipStatus === 'friends' ? (
                        <Text style={[styles.badge, { color: theme.accent2, borderColor: theme.accent2 }]}>{t('taste.friendBadge')}</Text>
                      ) : null}
                    </View>
                    <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{shared + favs}</Text>
                  </View>
                  <ScoreRing score={m.score} />
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  sub: { fontSize: 13, lineHeight: 19, marginBottom: SPACING.md },
  graphCard: { borderWidth: 1, borderRadius: RADIUS.lg, marginTop: SPACING.md, marginBottom: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  badge: { fontSize: 10, borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
});
