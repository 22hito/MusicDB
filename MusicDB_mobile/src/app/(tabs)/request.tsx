import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button, Field, Heading } from '@/components/UI';
import { SPACING } from '@/constants/theme';
import type { ExternalSongResult } from '@/api/types';

const EMPTY = { artist: '', title: '', release: '', duration: '', album: '', genres: '' };

export default function RequestScreen() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const requireAuth = useRequireAuth();

  const [form, setForm] = useState(EMPTY);
  const [extResults, setExtResults] = useState<ExternalSongResult[]>([]);
  const [genresHint, setGenresHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = `${form.artist} ${form.title} ${form.album}`.trim();
    if (query.length < 2) {
      setExtResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api
        .externalSearch({ artist: form.artist.trim(), title: form.title.trim(), album: form.album.trim() })
        .then(setExtResults)
        .catch(() => setExtResults([]));
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.artist, form.title, form.album]);

  const applyResult = async (item: ExternalSongResult) => {
    setForm((f) => ({
      ...f,
      artist: item.artist || f.artist,
      title: item.title || f.title,
      release: item.release || f.release,
      duration: item.duration || f.duration,
      album: item.album || '',
      genres: item.genre || f.genres,
    }));
    setExtResults([]);
    setGenresHint(t('extsearch.analyzingGenres'));
    try {
      const genreStr = await api.suggestGenres(item.artist, item.title, item.genre || undefined);
      if (genreStr) setForm((f) => ({ ...f, genres: genreStr }));
    } catch {
      // залишаємо жанр з iTunes без змін
    } finally {
      setGenresHint(null);
    }
  };

  const submit = () => {
    requireAuth(async () => {
      if (!form.artist || !form.title || !form.release || !form.duration || !form.genres) {
        return;
      }
      setSubmitting(true);
      try {
        await api.createRequest({
          artist: form.artist.trim(),
          title: form.title.trim(),
          release: form.release.trim(),
          duration: form.duration.trim(),
          genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
          albumTitle: form.album.trim() || null,
        });
        setForm(EMPTY);
        setExtResults([]);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
      } finally {
        setSubmitting(false);
      }
    }, t('msg.needLoginForRequest'));
  };

  const missingRequired = !form.artist || !form.title || !form.release || !form.duration || !form.genres;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Heading pre={t('request.heading.pre')} accent={t('request.heading.accent')} />

          {success ? (
            <View style={[styles.alert, { backgroundColor: `${theme.green}26`, borderColor: `${theme.green}4d` }]}>
              <Text style={{ color: theme.green, fontSize: 13 }}>{t('request.successAlert')}</Text>
            </View>
          ) : null}

          <Field label={t('form.artist')} value={form.artist} onChangeText={set('artist')} placeholder={t('form.artist.placeholder')} />
          <Field label={t('form.title')} value={form.title} onChangeText={set('title')} placeholder={t('form.title.placeholder')} />

          {extResults.length ? (
            <View style={[styles.extPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.muted, fontSize: 11, textTransform: 'uppercase', marginBottom: 10 }}>
                {t('extsearch.title')}
              </Text>
              {extResults.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => applyResult(item)}
                  style={[styles.extItem, { borderColor: theme.border }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                      {item.artist}
                    </Text>
                    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 1 }}>
                      {item.title}
                    </Text>
                  </View>
                  {item.release ? <Text style={{ color: theme.muted, fontSize: 12 }}>{item.release.slice(0, 4)}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Field label={t('form.release')} value={form.release} onChangeText={set('release')} placeholder="2024-01-01" />
          <Field label={t('form.duration')} value={form.duration} onChangeText={set('duration')} placeholder="00:03:30" hint={t('form.duration.hint')} />
          <Field label={t('form.album')} value={form.album} onChangeText={set('album')} placeholder={t('form.album.placeholder')} />
          <Field
            label={t('form.genres')}
            value={form.genres}
            onChangeText={set('genres')}
            placeholder={t('form.genres.placeholder')}
            hint={genresHint || t('form.genres.hint')}
          />

          <Button label={t('request.submitBtn')} onPress={submit} loading={submitting} disabled={missingRequired} style={{ marginTop: 10 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
  },
  alert: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: SPACING.lg,
  },
  extPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: SPACING.md,
  },
  extItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
});
