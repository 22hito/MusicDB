import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { EmptyState, ErrorState, Heading } from '@/components/UI';
import { SongRow } from '@/components/SongRow';
import { SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Топ 100 найпрослуханіших — GET /api/stats/top-songs, вже відсортовано
// сервером за кількістю унікальних слухачів. Картки — гібрид, як на мобільному сайті:
// місце (1–3 — медалі), ▶, виконавець/назва/альбом, прослуховування, ♡.
export default function TopSongsScreen() {
  const { theme, t } = useSettings();
  const { currentUser, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const player = usePlayer();
  const requireAuth = useRequireAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const isAdmin = !!currentUser?.isAdmin;
  const authenticated = !!currentUser?.authenticated;

  const load = useCallback(() => {
    setLoading(true);
    api
      .getTopSongs(100)
      .then((res) => {
        setSongs(res);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeRealtime((event) => {
      if (event === 'songsChanged') load();
    });
  }, [subscribeRealtime, load]);

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.headerWrap}>
        <Heading pre={t('top.heading.pre')} accent={t('top.heading.accent')} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
      ) : loadError ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 110 }}
          ListEmptyComponent={<EmptyState icon="🏆" label={t('top.empty')} />}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              rank={index + 1}
              isCurrent={player.current?.id === item.id}
              isPlaying={player.isPlaying}
              isFavorite={favoriteIds.has(item.id)}
              isAdmin={isAdmin}
              authenticated={authenticated}
              onPlay={() => player.playFrom(songs, item.id)}
              onToggleFavorite={() => requireAuth(() => toggleFavorite(item.id))}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
});
