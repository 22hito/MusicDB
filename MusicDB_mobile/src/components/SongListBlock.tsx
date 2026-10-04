import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SongRow } from './SongRow';
import { Button } from './UI';
import { RatingModal } from './RatingModal';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Список пісень для другорядних екранів (виконавець, колесо, чужий плейлист):
// відтворення з цієї черги, улюблене, додати в плейлист, оцінка — без адмін-дій.
// Рендериться всередині ScrollView, тож без FlatList — і порціями по PAGE: плейлист колеса для великого
// жанру — тисячі пісень (hard rock — понад 2000), і змонтувати їх разом означало б завмерти на кілька секунд.
// «Слухати» й перемикання пісень однаково йдуть по всьому списку.
const PAGE = 50;
export function SongListBlock({ songs }: { songs: Song[] }) {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const player = usePlayer();
  const requireAuth = useRequireAuth();
  const [ratingSong, setRatingSong] = useState<Song | null>(null);
  const [playlistSongId, setPlaylistSongId] = useState<number | null>(null);
  const authenticated = !!currentUser?.authenticated;
  const [shown, setShown] = useState(PAGE);
  // Новий список (новий спін, інший плейлист) — знову з першої порції.
  const [shownFor, setShownFor] = useState(songs);
  if (shownFor !== songs) {
    setShownFor(songs);
    setShown(PAGE);
  }
  const rest = songs.length - shown;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      {(rest > 0 ? songs.slice(0, shown) : songs).map((s) => (
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
      {rest > 0 ? (
        <Button
          small
          variant="outline"
          label={t('list.showMore').replace('{n}', String(Math.min(PAGE, rest))).replace('{total}', String(songs.length))}
          onPress={() => setShown((n) => n + PAGE)}
          style={{ marginTop: SPACING.md, alignSelf: 'center' }}
        />
      ) : null}
      <RatingModal song={ratingSong} onClose={() => setRatingSong(null)} />
      <AddToPlaylistModal
        visible={playlistSongId !== null}
        musicId={playlistSongId}
        song={songs.find((s) => s.id === playlistSongId) ?? null}
        onClose={() => setPlaylistSongId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
});
