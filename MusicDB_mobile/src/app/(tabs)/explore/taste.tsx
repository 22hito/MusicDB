import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePlayer } from '@/player/PlayerContext';
import { Avatar, avatarColor, avatarInitials, Badge, Button, EmptyState, ErrorState, SectionTitle, SegmentedPicker } from '@/components/UI';
import { ArtistAvatar } from '@/components/ArtistAvatar';
import { ForceGraph, type GraphEdge, type GraphNode } from '@/components/ForceGraph';
import { MicIcon, PlayIcon, UsersIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Song, TasteGraph, TasteNode } from '@/api/types';

const ME_COLOR = '#c8a96e';
const FRIEND_COLOR = '#4f8c6f';
const ARTIST_COLOR = '#8a6fb0';
// Карта смаку: відстань від центру — за збігом (як на сайті, у координатах розкладки).
const R_MIN = 70;
const R_MAX = 270;
const radiusFor = (score: number) => R_MIN + (1 - Math.max(0, Math.min(100, score)) / 100) * (R_MAX - R_MIN);

type GraphMode = 'people' | 'artists';
type Filter = 'all' | 'friends' | 'others';
type Item = ({ kind: 'user' } & TasteNode) | { kind: 'artist'; id: number; name: string; fans: number };

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// "Схожий смак" — як на сайті: ваш смак, карта смаку / люди й виконавці, найсхожіші люди з діями.
export default function TasteScreen() {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const requireAuth = useRequireAuth();
  const authed = !!currentUser?.authenticated;
  const { width } = useWindowDimensions();

  const [data, setData] = useState<TasteGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<GraphMode>('people');
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState<number | null>(null);

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

  const graph = useMemo(() => {
    if (!data || data.nodes.length < 2) return null;
    const people: Item[] = data.nodes.map((n) => ({ kind: 'user' as const, ...n }));
    const meIdx = data.nodes.findIndex((n) => n.isMe);
    const idx = new Map(data.nodes.map((n, i) => [n.userId, i]));
    const edges: GraphEdge[] = [];
    for (const e of data.edges) {
      const i = idx.get(e.a);
      const j = idx.get(e.b);
      if (i != null && j != null) edges.push({ i, j, w: mode === 'artists' ? e.weight * 0.6 : e.weight });
    }
    const personSize = (p: TasteNode) => (p.isMe ? 1.7 : 0.9 + Math.min(0.9, Math.sqrt(p.itemCount || 0) / 6));
    const personNode = (p: TasteNode): GraphNode => ({
      key: `u${p.userId}`,
      label: p.isMe ? t('taste.you') : p.displayName,
      color: p.isMe ? ME_COLOR : avatarColor(p.displayName),
      ring: p.isMe,
      size: personSize(p),
      image: p.avatarUrl,
      initials: avatarInitials(p.displayName),
      mark: p.relationshipStatus === 'friends' ? FRIEND_COLOR : undefined,
    });
    if (mode === 'people') {
      // Радіально: кут — групами за першим улюбленим виконавцем, радіус — за збігом.
      const others = data.nodes
        .map((_, i) => i)
        .filter((i) => i !== meIdx)
        .sort(
          (a, b) =>
            (data.nodes[a].topArtists[0]?.name || '~').localeCompare(data.nodes[b].topArtists[0]?.name || '~') ||
            data.nodes[b].score - data.nodes[a].score,
        );
      const positions: [number, number][] = data.nodes.map(() => [400, 300]);
      others.forEach((i, k) => {
        const ang = -Math.PI / 2 + ((k + 0.5) / others.length) * Math.PI * 2;
        const r = radiusFor(data.nodes[i].score);
        positions[i] = [400 + Math.cos(ang) * r, 300 + Math.sin(ang) * r];
      });
      return {
        items: people,
        nodes: data.nodes.map(personNode),
        edges,
        positions,
        rings: [75, 50, 25].map((s) => ({ r: radiusFor(s), label: `${s}%` })),
        pin: undefined as number | undefined,
      };
    }
    const artists = new Map<number, { kind: 'artist'; id: number; name: string; fans: number }>();
    data.nodes.forEach((p) =>
      p.topArtists.forEach((a) => {
        if (!artists.has(a.id)) artists.set(a.id, { kind: 'artist', id: a.id, name: a.name, fans: 0 });
        artists.get(a.id)!.fans++;
      }),
    );
    const artistItems = [...artists.values()];
    const artistIdx = new Map(artistItems.map((a, k) => [a.id, people.length + k]));
    data.nodes.forEach((p, i) => p.topArtists.forEach((a, rank) => edges.push({ i, j: artistIdx.get(a.id)!, w: 1 - rank * 0.2 })));
    const mine = new Set((data.myTopArtists || []).map((a) => a.id));
    return {
      items: [...people, ...artistItems] as Item[],
      nodes: [
        ...data.nodes.map(personNode),
        ...artistItems.map(
          (a): GraphNode => ({
            key: `a${a.id}`,
            label: a.name,
            color: ARTIST_COLOR,
            size: 0.7 + Math.min(0.9, (a.fans - 1) * 0.3),
            initials: avatarInitials(a.name),
            mark: mine.has(a.id) ? ME_COLOR : undefined,
          }),
        ),
      ],
      edges,
      positions: undefined,
      rings: undefined,
      pin: meIdx >= 0 ? meIdx : undefined,
    };
  }, [data, mode, t]);

  const openItem = (i: number) => {
    const it = graph?.items[i];
    if (!it) return;
    if (it.kind === 'artist') router.push({ pathname: '/explore/artist/[id]', params: { id: String(it.id), name: it.name } });
    else if (it.isMe) router.push('/profile');
    else router.push({ pathname: '/community/user/[id]', params: { id: String(it.userId) } });
  };

  // "Слухати спільне": пісні виконавців, яких любите обоє, — перемішаним списком.
  const playShared = async (userId: number) => {
    const m = data?.matches.find((x) => x.userId === userId);
    if (!m?.sharedArtists.length) return;
    setBusy(userId);
    try {
      const lists = await Promise.all(m.sharedArtists.map((a) => api.getArtistSongs(a.id).catch(() => [] as Song[])));
      const seen = new Set<number>();
      const queue = shuffled(lists.flat().filter((s) => !seen.has(s.id) && (seen.add(s.id), true)));
      if (queue.length) player.playFrom(queue, queue[0].id);
    } finally {
      setBusy(null);
    }
  };
  const addFriend = async (userId: number) => {
    setBusy(userId);
    try {
      await api.sendFriendRequest(userId);
      setData((d) => (d ? { ...d, matches: d.matches.map((m) => (m.userId === userId ? { ...m, relationshipStatus: 'pending_outgoing' } : m)) } : d));
    } catch {
      // лишаємо як було
    } finally {
      setBusy(null);
    }
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
  const matches = (data?.matches ?? []).filter((m) => filter === 'all' || (filter === 'friends') === (m.relationshipStatus === 'friends'));

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sub, { color: theme.muted }]}>{t('taste.sub')}</Text>

        {data && data.myItemCount > 0 ? (
          <View style={[styles.me, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
              <Text style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 15 }}>{t('taste.meTitle')}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {t('taste.meStats').replace('{fav}', String(data.myFavorites || 0)).replace('{n}', String(data.myItemCount))}
              </Text>
            </View>
            <View style={styles.wrapRow}>
              {(data.myTopArtists || []).map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(a.id), name: a.name } })}
                  style={[styles.artistChip, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
                >
                  <ArtistAvatar name={a.name} size={24} />
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, maxWidth: 120 }}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.wrapRow}>
              {(data.myTopGenres || []).map((g) => (
                <Badge key={g} label={g.replace(/alternative/gi, 'alt')} />
              ))}
            </View>
          </View>
        ) : null}

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
              <ForceGraph
                nodes={graph.nodes}
                edges={graph.edges}
                positions={graph.positions}
                rings={graph.rings}
                pin={graph.pin}
                radialLabels={mode === 'people'}
                baseRadius={11}
                width={graphW}
                height={360}
                onPressNode={openItem}
              />
            </View>
            <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center', marginBottom: SPACING.md }}>
              {t(mode === 'people' ? 'taste.mapHint' : 'taste.artistsHint')}
            </Text>
          </>
        ) : null}

        {data && data.myItemCount === 0 ? (
          <EmptyState icon="🎧" label={t('taste.noData')} />
        ) : data && !data.matches.length ? (
          <EmptyState icon="👥" label={t('taste.noMatches')} />
        ) : (
          <>
            <SectionTitle label={t('taste.matchesTitle')} />
            <View style={{ marginBottom: SPACING.md }}>
              <SegmentedPicker<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: t('taste.filterAll') },
                  { value: 'friends', label: t('taste.filterFriends') },
                  { value: 'others', label: t('taste.filterOthers') },
                ]}
              />
            </View>
            {matches.length === 0 ? <Text style={{ color: theme.muted, fontSize: 13 }}>{t('taste.filterEmpty')}</Text> : null}
            {matches.map((m) => {
              const shared = m.sharedArtists.length ? `${t('taste.sharedArtists')} ${m.sharedArtists.map((a) => a.name).join(', ')}` : t('taste.similarGenres');
              const favs = m.sharedFavorites > 0 ? ` · ${t('taste.sharedFavorites').replace('{n}', String(m.sharedFavorites))}` : '';
              return (
                <TouchableOpacity
                  key={m.userId}
                  onPress={() => router.push({ pathname: '/community/user/[id]', params: { id: String(m.userId) } })}
                  style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar url={m.avatarUrl} size={42} name={m.displayName} />
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
                  </View>
                  {m.sharedArtists.length || m.relationshipStatus === 'none' || m.relationshipStatus === 'pending_outgoing' ? (
                    <View style={styles.actions}>
                      {m.sharedArtists.length ? (
                        <TouchableOpacity
                          disabled={busy === m.userId}
                          onPress={() => playShared(m.userId)}
                          style={[styles.actBtn, { borderColor: theme.border }]}
                        >
                          <PlayIcon size={11} color={theme.text} />
                          <Text style={{ color: theme.text, fontSize: 12 }}>{t('taste.playShared')}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {m.relationshipStatus === 'none' ? (
                        <TouchableOpacity disabled={busy === m.userId} onPress={() => addFriend(m.userId)} style={[styles.actBtn, { borderColor: theme.border }]}>
                          <Text style={{ color: theme.text, fontSize: 12 }}>{t('friends.addBtn')}</Text>
                        </TouchableOpacity>
                      ) : null}
                      {m.relationshipStatus === 'pending_outgoing' ? (
                        <Text style={{ color: theme.muted, fontSize: 12, alignSelf: 'center' }}>{t('taste.requestSent')}</Text>
                      ) : null}
                    </View>
                  ) : null}
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
  me: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 10, marginBottom: SPACING.md },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  artistChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 },
  graphCard: { borderWidth: 1, borderRadius: RADIUS.lg, marginTop: SPACING.md, marginBottom: 6, overflow: 'hidden' },
  row: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  badge: { fontSize: 10, borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginLeft: 54 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 6, paddingHorizontal: 10 },
});
