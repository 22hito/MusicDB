import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button, EmptyState, Heading, StatCard } from '@/components/UI';
import { SongRow } from '@/components/SongRow';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SongFormModal, type SongFormValues } from '@/components/SongFormModal';
import { AddToPlaylistModal } from '@/components/AddToPlaylistModal';
import { ShuffleIcon } from '@/components/Icons';
import { FONT_MONO_REGULAR, SPACING } from '@/constants/theme';
import type { Song, Stats } from '@/api/types';

function songToForm(s: Song): SongFormValues {
  return {
    artist: s.artist,
    title: s.title,
    release: s.release,
    duration: s.duration,
    album: s.album || '',
    genres: s.genres.join(', '),
  };
}

export default function LibraryScreen() {
  const { theme, t } = useSettings();
  const { currentUser, authChecked } = useApiBridge();
  const api = useMusicApi();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const player = usePlayer();
  const requireAuth = useRequireAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [shuffleActive, setShuffleActive] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const [addToPlaylistId, setAddToPlaylistId] = useState<number | null>(null);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeMsg, setNormalizeMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [songsRes, statsRes] = await Promise.all([api.getSongs(), api.getStats().catch(() => null)]);
      setSongs(songsRes);
      if (statsRes) setStats(statsRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => s.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [songs]);

  const shuffleOrder = useMemo(() => {
    if (!shuffleActive) return null;
    const ids = songs.map((s) => s.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return new Map(ids.map((id, idx) => [id, idx]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleActive, shuffleSeed]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = songs.filter((s) => {
      const mt =
        !q ||
        s.artist.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.album ? s.album.toLowerCase().includes(q) : false);
      const mg = !genreFilter || s.genres.includes(genreFilter);
      return mt && mg;
    });
    if (shuffleOrder) {
      list = [...list].sort((a, b) => (shuffleOrder.get(a.id) ?? Infinity) - (shuffleOrder.get(b.id) ?? Infinity));
    }
    return list;
  }, [songs, search, genreFilter, shuffleOrder]);

  const toggleShuffle = () => {
    setShuffleActive((v) => !v);
    setShuffleSeed((s) => s + 1);
  };

  const isAdmin = !!currentUser?.isAdmin;
  const authenticated = !!currentUser?.authenticated;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSong(deleteTarget.id);
      setSongs((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSaveEdit = async (values: SongFormValues) => {
    if (!editSong) return;
    setSavingEdit(true);
    try {
      const updated = await api.updateSong(editSong.id, {
        artist: values.artist.trim(),
        title: values.title.trim(),
        release: values.release.trim(),
        duration: values.duration.trim(),
        album: values.album.trim() || null,
        genres: values.genres.split(',').map((g) => g.trim()).filter(Boolean),
      });
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditSong(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const normalizeGenres = async () => {
    setNormalizing(true);
    setNormalizeMsg(null);
    try {
      const res = await api.normalizeGenres();
      if (res.error) setNormalizeMsg(`${t('admin.normalizeGenresError')} ${res.error}`);
      else if (res.mergedCount === 0) setNormalizeMsg(t('admin.normalizeGenresNone'));
      else {
        setNormalizeMsg(t('admin.normalizeGenresDone', { count: res.mergedCount }));
        load();
      }
    } catch {
      setNormalizeMsg(t('msg.errorNormalizeGenres'));
    } finally {
      setNormalizing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Heading pre={t('home.heading.pre')} accent={t('home.heading.accent')} />

            {stats ? (
              <View style={styles.statsRow}>
                <StatCard label={t('stat.songs')} value={stats.totalSongs} />
                <StatCard label={t('stat.genres')} value={stats.totalGenres} />
                <StatCard label={t('stat.albums')} value={stats.totalAlbums} />
                <StatCard label={t('stat.singles')} value={stats.singles} />
              </View>
            ) : null}

            {isAdmin ? (
              <View style={{ marginBottom: SPACING.md }}>
                <Button
                  label={t('admin.normalizeGenresBtn')}
                  variant="outline"
                  small
                  loading={normalizing}
                  onPress={normalizeGenres}
                />
                {normalizeMsg ? (
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{normalizeMsg}</Text>
                ) : null}
              </View>
            ) : null}

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.muted}
              style={[
                styles.search,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: FONT_MONO_REGULAR },
              ]}
            />

            <View style={styles.filterRow}>
              <View style={[styles.pickerWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Picker
                  selectedValue={genreFilter}
                  onValueChange={(v) => setGenreFilter(String(v))}
                  style={{ color: theme.text, height: 46 }}
                  dropdownIconColor={theme.muted}
                >
                  <Picker.Item label={t('filter.allGenres')} value="" />
                  {allGenres.map((g) => (
                    <Picker.Item key={g} label={g} value={g} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                onPress={toggleShuffle}
                style={[
                  styles.shuffleBtn,
                  { borderColor: shuffleActive ? theme.accent : theme.border, backgroundColor: shuffleActive ? `${theme.accent}1a` : 'transparent' },
                ]}
                hitSlop={4}
              >
                <ShuffleIcon size={16} color={shuffleActive ? theme.accent : theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SongRow
            song={item}
            isCurrent={player.current?.id === item.id}
            isPlaying={player.isPlaying}
            isFavorite={favoriteIds.has(item.id)}
            isAdmin={isAdmin}
            authenticated={authenticated}
            onPlay={() => player.playFrom(filtered, item.id)}
            onToggleFavorite={() => requireAuth(() => toggleFavorite(item.id))}
            onAddToPlaylist={() => requireAuth(() => setAddToPlaylistId(item.id))}
            onEdit={() => setEditSong(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? <EmptyState icon="🎵" label={t('table.empty')} /> : null
        }
      />

      <AddToPlaylistModal visible={addToPlaylistId !== null} musicId={addToPlaylistId} onClose={() => setAddToPlaylistId(null)} />

      {editSong ? (
        <SongFormModal
          visible={!!editSong}
          title={t('admin.editSongTitle')}
          initial={songToForm(editSong)}
          onCancel={() => setEditSong(null)}
          onSave={handleSaveEdit}
          saving={savingEdit}
        />
      ) : null}

      <ConfirmModal
        visible={!!deleteTarget}
        title={t('modal.deleteTitle')}
        body={t('modal.deleteBodyTemplate', { label: deleteTarget ? `${deleteTarget.artist} — ${deleteTarget.title}` : t('modal.deleteDefaultLabel') })}
        confirmLabel={t('modal.confirmDelete')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pickerWrap: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  shuffleBtn: {
    width: 46,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
