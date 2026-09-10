import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState } from '@/components/UI';
import { SongRow } from '@/components/SongRow';
import { SPACING } from '@/constants/theme';
import type { PlaylistDetail } from '@/api/types';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = Number(id);
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const player = usePlayer();
  const navigation = useNavigation();

  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getPlaylist(playlistId);
      setDetail(d);
      navigation.setOptions({ title: d.name });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeSong = async (musicId: number) => {
    await api.removeSongFromPlaylist(playlistId, musicId);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const songs = detail?.songs || [];

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {songs.length > 0 ? (
          <Button
            label={t('profile.playAllBtn')}
            onPress={() => player.playFrom(songs, songs[0].id)}
            style={{ marginBottom: SPACING.md }}
          />
        ) : null}

        {songs.length === 0 ? (
          <EmptyState icon="🎧" label={t('profile.playlistEmpty')} />
        ) : (
          songs.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              isCurrent={player.current?.id === s.id}
              isPlaying={player.isPlaying}
              showFavorite={false}
              showAddToPlaylist={false}
              showEdit={false}
              showDelete
              onPlay={() => player.playFrom(songs, s.id)}
              onDelete={() => removeSong(s.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 40 },
});
