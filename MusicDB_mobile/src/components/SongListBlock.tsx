import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SongRow } from './SongRow';
import { RatingModal } from './RatingModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Список пісень для другорядних екранів (виконавець, колесо, чужий плейлист):
// відтворення з цієї черги, улюблене, додати в плейлист, оцінка — без адмін-дій.
// Рендериться всередині ScrollView, тож без FlatList (списки тут короткі).
export function SongListBlock({ songs }: { songs: Song[] }) {
  const { theme } = useSettings();
  const { currentUser } = useApiBridge();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const player = usePlayer();
  const requireAuth = useRequireAuth();
  const [ratingSong, setRatingSong] = useState<Song | null>(null);
  const [playlistSongId, setPlaylistSongId] = useState<number | null>(null);
  const authenticated = !!currentUser?.authenticated;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      {songs.map((s) => (
        <SongRow
          key={s.id}
          song={s}
          isCurrent={player.current?.id === s.id}
          isPlaying={player.isPlaying}
          isFavorite={favoriteIds.has(s.id)}
          authenticated={authenticated}
          showEdit={false}
          showDelete={false}
          onPlay={() => (player.current?.id === s.id ? player.toggle() : player.playFrom(songs, s.id))}
          onToggleFavorite={() => requireAuth(() => toggleFavorite(s.id))}
          onAddToPlaylist={() => requireAuth(() => setPlaylistSongId(s.id))}
          onRate={() => setRatingSong(s)}
        />
      ))}
      <RatingModal song={ratingSong} onClose={() => setRatingSong(null)} />
      <AddToPlaylistModal visible={playlistSongId !== null} musicId={playlistSongId} onClose={() => setPlaylistSongId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg },
});
