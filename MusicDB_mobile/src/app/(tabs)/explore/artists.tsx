import React, { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { EmptyState, ErrorState } from '@/components/UI';
import { ChevronRightIcon, CloseIcon, SearchIcon } from '@/components/Icons';
import { ArtistAvatar } from '@/components/ArtistAvatar';
import { SelectField } from '@/components/SelectField';
import { FONT_MONO_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistSort, ArtistSummary } from '@/api/types';

const SORTS: ArtistSort[] = ['songs', 'plays', 'followers', 'name', 'name_desc', 'new'];
const KEY_SORT = 'artistsSort';
const ROW_H = 60; // фіксована висота рядка — FlatList знає позиції без вимірювання (getItemLayout)

// Рядок виконавця — лише примітиви в пропсах, тож memo пропускає перемальовування при прокрутці й пошуку.
const ArtistRow = memo(function ArtistRow({ id, name, imageUrl, meta }: { id: number; name: string; imageUrl: string | null; meta: string }) {
  const { theme } = useSettings();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(id), name } })}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surface : 'transparent' }]}
    >
      <ArtistAvatar name={name} imageUrl={imageUrl} size={38} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 15 }}>{name}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_REGULAR, marginTop: 1 }}>{meta}</Text>
      </View>
      <ChevronRightIcon size={14} color={theme.muted} />
    </Pressable>
  );
});

// Каталог виконавців із пошуком і сортуванням (запам'ятовується) — як сторінка "Виконавці" на сайті.
// Увесь список приходить один раз на сортування; пошук фільтрує його в пам'яті — миттєво, без запиту на кожну літеру.
export default function ArtistsScreen() {
  const { theme, t, count } = useSettings();
  const api = useMusicApi();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState<ArtistSort | null>(null); // null — ще читаємо збережене
  const seq = useRef(0);
  const listRef = useRef<FlatList<ArtistSummary & { meta: string; key: string }>>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY_SORT)
      .then((v) => setSort(SORTS.includes(v as ArtistSort) ? (v as ArtistSort) : 'songs'))
      .catch(() => setSort('songs'));
  }, []);
  const changeSort = (v: ArtistSort) => {
    setSort(v);
    AsyncStorage.setItem(KEY_SORT, v).catch(() => {});
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const load = () => {
    if (!sort) return;
    const my = ++seq.current;
    setLoading(true);
    api
      .getArtists('', sort)
      .then((res) => {
        if (my !== seq.current) return;
        setArtists(res);
        setLoadError(false);
      })
      .catch(() => my === seq.current && setLoadError(true))
      .finally(() => my === seq.current && setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, sort]);

  // Рядок метаданих рахуємо раз на список, а не в кожному рендері рядка.
  const rows = useMemo(
    () =>
      artists.map((a) => ({
        ...a,
        meta: [count('count.songs', a.songCount), a.playCount ? count('count.plays', a.playCount) : null, a.followerCount ? count('count.followers', a.followerCount) : null]
          .filter(Boolean)
          .join(' · '),
        key: a.name.toLowerCase(),
      })),
    [artists, count],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((a) => a.key.includes(needle)) : rows;
  }, [rows, query]);

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.bar, { borderColor: q ? theme.accent : theme.border, backgroundColor: theme.surface }]}>
        <SearchIcon size={16} color={theme.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('artists.searchPlaceholder')}
          placeholderTextColor={theme.muted}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
            <CloseIcon size={12} color={theme.muted} />
          </Pressable>
        ) : null}
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
      {filtered.length ? <Text style={[styles.total, { color: theme.muted }]}>{t('artists.total', { n: filtered.length })}</Text> : null}
      {loadError && !artists.length ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : (
        <FlatList
          ref={listRef}
          data={filtered}
          keyExtractor={(a) => String(a.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
          getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={9}
          removeClippedSubviews
          ListHeaderComponent={loading && !artists.length ? <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} /> : null}
          ListEmptyComponent={loading ? null : <EmptyState icon="🎤" label={t('artists.empty')} />}
          renderItem={({ item }) => <ArtistRow id={item.id} name={item.name} imageUrl={item.imageUrl ?? null} meta={item.meta} />}
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
  total: { fontSize: 12, marginHorizontal: SPACING.lg, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: ROW_H, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, borderRadius: 8 },
});
