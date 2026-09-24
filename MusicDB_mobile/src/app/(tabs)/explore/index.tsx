import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Badge, EmptyState, ErrorState, Heading, SectionTitle } from '@/components/UI';
import { ChevronRightIcon, MicIcon, SwordsIcon, WheelIcon } from '@/components/Icons';
import { FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Recommendation } from '@/api/types';

// Вкладка "Огляд": плитки колеса фортуни / батлу / виконавців (на сайті — пункти
// меню навбару) і під ними персональні рекомендації.
export default function ExploreScreen() {
  const { theme, t, lang } = useSettings();
  const { currentUser, authChecked } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();

  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!currentUser?.authenticated) return;
    setLoading(true);
    api
      .getRecommendations(lang)
      .then((res) => {
        setItems(res);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [api, currentUser?.authenticated, lang]);

  useEffect(() => {
    load();
  }, [load]);

  const tiles = [
    { key: 'wheel', icon: WheelIcon, title: t('nav.wheel'), sub: t('explore.wheelSub'), href: '/explore/wheel' as const },
    { key: 'battle', icon: SwordsIcon, title: t('nav.battle'), sub: t('explore.battleSub'), href: '/explore/battle' as const },
    { key: 'artists', icon: MicIcon, title: t('nav.artists'), sub: t('explore.artistsSub'), href: '/explore/artists' as const },
  ];

  const header = (
    <View>
      <Heading pre={t('explore.heading.pre')} accent={t('explore.heading.accent')} />
      {tiles.map(({ key, icon: Icon, title, sub, href }) => (
        <TouchableOpacity
          key={key}
          onPress={() => router.push(href)}
          style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={[styles.tileIcon, { backgroundColor: `${theme.accent}1f`, borderColor: `${theme.accent}4d` }]}>
            <Icon size={20} color={theme.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 16 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
          </View>
          <ChevronRightIcon size={16} color={theme.muted} />
        </TouchableOpacity>
      ))}
      <SectionTitle label={t('nav.recommendations')} />
    </View>
  );

  const body = !authChecked ? null : !currentUser?.authenticated ? (
    <EmptyState icon="🔒" label={t('auth.loginRequiredGeneric')} />
  ) : loading ? (
    <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
  ) : loadError ? (
    <ErrorState label={t('error.loadFailed')} onRetry={load} />
  ) : (
    <EmptyState icon="🎧" label={t('rec.empty')} />
  );

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={currentUser?.authenticated && !loading && !loadError ? items : []}
        keyExtractor={(item) => String(item.song.id)}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 120 }}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => player.playFrom(items.map((i) => i.song), item.song.id)}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{item.song.artist}</Text>
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{item.song.title}</Text>
              {item.reason ? (
                <Text numberOfLines={2} style={{ color: theme.accent2, fontSize: 12, marginTop: 5 }}>{item.reason}</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxWidth: 110, justifyContent: 'flex-end' }}>
              {item.song.genres.slice(0, 2).map((g) => (
                <Badge key={g} label={g} />
              ))}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 64,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
});
