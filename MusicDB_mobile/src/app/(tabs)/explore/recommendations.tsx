import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Badge, EmptyState, ErrorState } from '@/components/UI';
import { SPACING } from '@/constants/theme';
import type { Recommendation } from '@/api/types';

// "Рекомендовано для вас" — окремий екран вкладки "Цікаве" (як сторінка рекомендацій на сайті).
export default function RecommendationsScreen() {
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
