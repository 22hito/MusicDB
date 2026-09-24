import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { EmptyState, ErrorState } from '@/components/UI';
import { ChevronRightIcon, MicIcon, SearchIcon } from '@/components/Icons';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistSummary } from '@/api/types';

// Каталог виконавців із пошуком — як сторінка "Виконавці" на сайті.
export default function ArtistsScreen() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [q, setQ] = useState('');
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const seq = useRef(0);

  const load = (query: string) => {
    const my = ++seq.current;
    setLoading(true);
    api
      .getArtists(query.trim())
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
  }, [q, api]);

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
              <View style={[styles.icon, { backgroundColor: theme.surface2 }]}>
                <MicIcon size={16} color={theme.accent} />
              </View>
              <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_REGULAR }}>
                {item.songCount} {t('profile.songsWord')}
              </Text>
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
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 8, borderBottomWidth: 1 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
