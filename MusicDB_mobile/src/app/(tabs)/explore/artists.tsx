import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { EmptyState, ErrorState } from '@/components/UI';
import { ChevronRightIcon, SearchIcon } from '@/components/Icons';
import { ArtistAvatar } from '@/components/ArtistAvatar';
import { SelectField } from '@/components/SelectField';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistSort, ArtistSummary } from '@/api/types';

const SORTS: ArtistSort[] = ['songs', 'plays', 'followers', 'name', 'name_desc', 'new'];
const KEY_SORT = 'artistsSort';

// Каталог виконавців із пошуком і сортуванням (запам'ятовується) — як сторінка "Виконавці" на сайті.
export default function ArtistsScreen() {
  const { theme, t, count } = useSettings();
  const api = useMusicApi();
  const [q, setQ] = useState('');
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState<ArtistSort | null>(null); // null — ще читаємо збережене
  const seq = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY_SORT)
      .then((v) => setSort(SORTS.includes(v as ArtistSort) ? (v as ArtistSort) : 'songs'))
      .catch(() => setSort('songs'));
  }, []);
  const changeSort = (v: ArtistSort) => {
    setSort(v);
    AsyncStorage.setItem(KEY_SORT, v).catch(() => {});
  };

  const load = (query: string) => {
    if (!sort) return;
    const my = ++seq.current;
    setLoading(true);
    api
      .getArtists(query.trim(), sort)
      .then((res) => {
        if (my !== seq.current) return;
        setArtists(res);
        setLoadError(false);
      })
      .catch(() => my === seq.current && setLoadError(true))
      .finally(() => my === seq.current && setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => load(q), q ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, api, sort]);

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.bar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <SearchIcon size={16} color={theme.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('artists.searchPlaceholder')}
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      <View style={styles.sortRow}>
        <SelectField<ArtistSort>
          value={sort ?? 'songs'}
          options={SORTS.map((v) => ({ value: v, label: t(`artists.sort.${v}` as never) }))}
          onChange={changeSort}
          title={t('artists.sortLabel')}
          style={{ flex: 1 }}
        />
      </View>
      {artists.length ? (
        <Text style={{ color: theme.muted, fontSize: 12, marginHorizontal: SPACING.lg, marginBottom: 4 }}>{t('artists.total', { n: artists.length })}</Text>
      ) : null}
      {loadError && !artists.length ? (
        <ErrorState label={t('error.loadFailed')} onRetry={() => load(q)} />
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(a) => String(a.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
          ListHeaderComponent={loading ? <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} /> : null}
          ListEmptyComponent={loading ? null : <EmptyState icon="🎤" label={t('artists.empty')} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(item.id), name: item.name } })}
              style={[styles.row, { borderColor: theme.border }]}
            >
              <ArtistAvatar name={item.name} imageUrl={item.imageUrl} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_REGULAR }}>
                  {[
                    count('count.songs', item.songCount),
                    item.playCount ? count('count.plays', item.playCount) : null,
                    item.followerCount ? count('count.followers', item.followerCount) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <ChevronRightIcon size={14} color={theme.muted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  sortRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 8, borderBottomWidth: 1 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
