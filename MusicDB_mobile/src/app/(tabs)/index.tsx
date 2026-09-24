import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button, EmptyState, ErrorState, Heading, SegmentedPicker, StatCard } from '@/components/UI';
import { RatingModal } from '@/components/RatingModal';
import { SongRow } from '@/components/SongRow';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SongFormModal, type SongFormValues } from '@/components/SongFormModal';
import { AddToPlaylistModal } from '@/components/AddToPlaylistModal';
import { ShuffleIcon, SortIcon } from '@/components/Icons';
import { RADIUS, FONT_MONO_REGULAR, SPACING } from '@/constants/theme';
import type { Song, SongSource, Stats } from '@/api/types';

type SortKey = 'default' | 'artist' | 'title' | 'release' | 'duration' | 'plays' | 'rating';
type SortDir = 'asc' | 'desc';

// "hh:mm:ss" / "mm:ss" -> секунди, для числового сортування за тривалістю.
function durationToSeconds(d: string): number {
  const parts = d.split(':').map((p) => parseInt(p, 10) || 0);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// .localeCompare()/типовий .sort() без компаратора порівнюють великі й малі
// літери (і кирилицю/латиницю) непередбачувано залежно від рушія — великі
// літери можуть опинитись окремим блоком перед малими. Приведення до
// нижнього регістру перед звичайним порівнянням кодів символів природно
// групує латиницю (a-z) окремо ПЕРЕД кирилицею (а-я), а регістр усередині
// слова більше не впливає на порядок — саме так само зроблено у веб-версії.
function textSortCmp(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : 0;
}

function songToForm(s: Song): SongFormValues {
  return {
    artist: s.artist,
    title: s.title,
    release: s.release,
    duration: s.duration,
    album: s.album || '',
    genres: s.genres.join(', '),
    youtubeVideoId: s.youtubeVideoId || '',
  };
}

export default function LibraryScreen() {
  const { theme, t } = useSettings();
  const { currentUser, authChecked, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const player = usePlayer();
  const requireAuth = useRequireAuth();

  // Головна таблиця_1 (каталог) чи таблиця_2 (пісні від ком'юніті) — як перемикач на сайті.
  const [source, setSource] = useState<SongSource>('catalog');
  const [ratingSong, setRatingSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [albumFilter, setAlbumFilter] = useState('');
  const [shuffleActive, setShuffleActive] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [sortOpen, setSortOpen] = useState(false);

  const [addToPlaylistId, setAddToPlaylistId] = useState<number | null>(null);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeMsg, setNormalizeMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [songsRes, statsRes] = await Promise.all([api.getSongs(source), api.getStats(source).catch(() => null)]);
      setSongs(songsRes);
      if (statsRes) setStats(statsRes);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, source]);

  useEffect(() => {
    setLoading(true);
    setGenreFilter('');
    setAlbumFilter('');
    load();
  }, [load]);

  // Реалтайм: інший пристрій/адмін додав/змінив/видалив пісню — сервер шле
  // songsChanged через SignalR (той самий канал, що й у веб-версії), тож
  // список і статистика оновлюються самі, без ручного pull-to-refresh.
  useEffect(() => {
    return subscribeRealtime((event, args) => {
      if (event === 'songsChanged') load();
      // Нове середнє оцінки — точково, без перезавантаження всього списку.
      if (event === 'ratingChanged') {
        const [musicId, avg, count] = args as [number, number | null, number];
        setSongs((prev) => prev.map((s) => (s.id === musicId ? { ...s, avgRating: avg, ratingCount: count } : s)));
      }
    });
  }, [subscribeRealtime, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => s.genres.forEach((g) => set.add(g)));
    return Array.from(set).sort(textSortCmp);
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
        (s.album ? s.album.toLowerCase().includes(q) : false) ||
        (s.submittedBy ? s.submittedBy.displayName.toLowerCase().includes(q) : false);
      const mg = !genreFilter || s.genres.includes(genreFilter);
      const ma = !albumFilter || s.album === albumFilter;
      return mt && mg && ma;
    });
    if (sortKey !== 'default') {
      const dir = sortDir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'artist') cmp = textSortCmp(a.artist, b.artist);
        else if (sortKey === 'title') cmp = textSortCmp(a.title, b.title);
        else if (sortKey === 'release') cmp = a.release < b.release ? -1 : a.release > b.release ? 1 : 0;
        else if (sortKey === 'duration') cmp = durationToSeconds(a.duration) - durationToSeconds(b.duration);
        else if (sortKey === 'plays') cmp = (a.playCount ?? 0) - (b.playCount ?? 0);
        else if (sortKey === 'rating') cmp = (a.avgRating ?? -1) - (b.avgRating ?? -1);
        return cmp * dir;
      });
    } else if (shuffleOrder) {
      list = [...list].sort((a, b) => (shuffleOrder.get(a.id) ?? Infinity) - (shuffleOrder.get(b.id) ?? Infinity));
    }
    return list;
  }, [songs, search, genreFilter, albumFilter, shuffleOrder, sortKey, sortDir]);

  const toggleShuffle = () => {
    setSortKey('default');
    setShuffleActive((v) => !v);
    setShuffleSeed((s) => s + 1);
  };

  const chooseSort = (key: SortKey) => {
    if (key === 'default') {
      setSortKey('default');
    } else if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setShuffleActive(false);
    setSortOpen(false);
  };

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'default', label: t('sort.default') },
    { key: 'artist', label: t('table.artist') },
    { key: 'title', label: t('table.title') },
    { key: 'release', label: t('table.release') },
    { key: 'duration', label: t('table.duration') },
    { key: 'plays', label: t('sort.plays') },
    { key: 'rating', label: t('table.rating') },
  ];

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
        youtubeVideoId: values.youtubeVideoId.trim(),
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
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={{ marginBottom: SPACING.md }}>
              <SegmentedPicker<SongSource>
                options={[
                  { value: 'catalog', label: t('home.source.catalog') },
                  { value: 'community', label: t('home.source.community') },
                ]}
                value={source}
                onChange={setSource}
              />
            </View>
            <Heading
              pre={t(source === 'community' ? 'home.heading.communityPre' : 'home.heading.pre')}
              accent={t(source === 'community' ? 'home.heading.communityAccent' : 'home.heading.accent')}
            />
            {source === 'community' ? (
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: -8, marginBottom: SPACING.md }}>{t('home.communityHint')}</Text>
            ) : null}

            {stats ? (
              <View style={styles.statsRow}>
                <StatCard label={t('stat.songs')} value={stats.totalSongs} />
                <StatCard label={t('stat.genres')} value={stats.totalGenres} />
                <StatCard label={t('stat.albums')} value={stats.totalAlbums} />
                <StatCard label={t('stat.singles')} value={stats.singles} />
              </View>
            ) : null}

            {/* Дії над таблицею: заявка (у таблицю, що відкрита) + "Об'єднати жанри" лише для адміна. */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md }}>
              <Button
                label={t(source === 'community' ? 'home.addOwnSongBtn' : 'home.addRequestBtn')}
                variant="outline"
                small
                onPress={() => requireAuth(() => router.push({ pathname: '/request', params: { kind: source } }), t('msg.needLoginForRequest'))}
              />
              {isAdmin ? (
                <Button label={t('admin.normalizeGenresBtn')} variant="outline" small loading={normalizing} onPress={normalizeGenres} />
              ) : null}
            </View>
            {isAdmin && normalizeMsg ? (
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: -4, marginBottom: SPACING.md }}>{normalizeMsg}</Text>
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

            {genreFilter || albumFilter ? (
              <View style={styles.chipsRow}>
                {genreFilter ? (
                  <TouchableOpacity onPress={() => setGenreFilter('')} style={[styles.chip, { borderColor: theme.accent2, backgroundColor: `${theme.accent2}22` }]}>
                    <Text style={{ color: theme.text, fontSize: 13 }}>{t('table.genres')}: {genreFilter}  ✕</Text>
                  </TouchableOpacity>
                ) : null}
                {albumFilter ? (
                  <TouchableOpacity onPress={() => setAlbumFilter('')} style={[styles.chip, { borderColor: theme.accent, backgroundColor: `${theme.accent}1f` }]}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13 }}>{t('table.album')}: {albumFilter}  ✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

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
                onPress={() => setSortOpen(true)}
                style={[
                  styles.shuffleBtn,
                  { borderColor: sortKey !== 'default' ? theme.accent : theme.border, backgroundColor: sortKey !== 'default' ? `${theme.accent}1a` : 'transparent' },
                ]}
                hitSlop={4}
              >
                <SortIcon size={16} color={sortKey !== 'default' ? theme.accent : theme.text} />
              </TouchableOpacity>
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
            onRate={() => setRatingSong(item)}
            onGenrePress={(g) => setGenreFilter((cur) => (cur === g ? '' : g))}
            onAlbumPress={(a) => setAlbumFilter((cur) => (cur === a ? '' : a))}
            activeGenre={genreFilter}
            activeAlbum={albumFilter}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
          ) : loadError ? (
            <ErrorState label={t('error.loadFailed')} onRetry={load} />
          ) : (
            <EmptyState icon="🎵" label={t(source === 'community' ? 'table.communityEmpty' : 'table.empty')} />
          )
        }
      />

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSortOpen(false)}>
          <View style={[styles.sortBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, fontSize: 11, textTransform: 'uppercase', marginBottom: 10 }}>
              {t('sort.button')}
            </Text>
            {SORT_OPTIONS.map((opt) => {
              const active = sortKey === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => chooseSort(opt.key)}
                  style={[styles.sortRow, { borderColor: theme.border }]}
                >
                  <Text style={{ color: active ? theme.accent : theme.text, fontSize: 15, fontWeight: active ? '700' : '400' }}>
                    {opt.label}
                  </Text>
                  {active ? (
                    <Text style={{ color: theme.accent, fontSize: 15 }}>{sortDir === 'asc' ? '↑' : '↓'}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <RatingModal song={ratingSong} onClose={() => setRatingSong(null)} />

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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: '100%',
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBox: {
    width: 300,
    maxWidth: '90%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
