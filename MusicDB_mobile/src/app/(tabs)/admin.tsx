import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Button, EmptyState, Field, Heading } from '@/components/UI';
import { SongFormModal, type SongFormValues } from '@/components/SongFormModal';
import { EditIcon } from '@/components/Icons';
import { RADIUS, SPACING } from '@/constants/theme';
import type { ExternalSongResult, SongRequest } from '@/api/types';

const EMPTY_ADD = { artist: '', title: '', release: '', duration: '', album: '', genres: '' };

function requestToForm(r: SongRequest): SongFormValues {
  return {
    artist: r.artist,
    title: r.title,
    release: r.release,
    duration: r.duration,
    album: r.albumTitle || '',
    genres: r.genres.join(', '),
  };
}

export default function AdminScreen() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [mode, setMode] = useState<'requests' | 'add'>('requests');

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          onPress={() => setMode('requests')}
          style={[styles.segmentBtn, mode === 'requests' && { borderBottomColor: theme.accent }]}
        >
          <Text style={{ color: mode === 'requests' ? theme.accent : theme.muted, fontSize: 13, textTransform: 'uppercase' }}>
            {t('nav.admin')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('add')}
          style={[styles.segmentBtn, mode === 'add' && { borderBottomColor: theme.accent }]}
        >
          <Text style={{ color: mode === 'add' ? theme.accent : theme.muted, fontSize: 13, textTransform: 'uppercase' }}>
            {t('nav.add')}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'requests' ? <RequestsPanel /> : <AddSongPanel />}
    </SafeAreaView>
  );
}

function RequestsPanel() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SongRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getRequests()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: number) => {
    setBusyId(id);
    try {
      await api.approveRequest(id);
      load();
    } finally {
      setBusyId(null);
    }
  };
  const reject = async (id: number) => {
    setBusyId(id);
    try {
      await api.rejectRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  };
  const saveEdit = async (values: SongFormValues) => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api.updateRequest(editing.id, {
        artist: values.artist.trim(),
        title: values.title.trim(),
        release: values.release.trim(),
        duration: values.duration.trim(),
        genres: values.genres.split(',').map((g) => g.trim()).filter(Boolean),
        albumTitle: values.album.trim() || null,
      });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Heading pre={t('admin.heading.pre')} accent={t('admin.heading.accent')} />
      {requests.length === 0 ? (
        <EmptyState icon="📭" label={t('admin.empty')} />
      ) : (
        requests.map((r) => (
          <View key={r.id} style={[styles.reqCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{r.artist}</Text>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 1 }}>{r.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(r)} hitSlop={10} style={{ padding: 6, marginLeft: 8 }}>
                <EditIcon size={17} color={theme.accent} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
              {r.release} · {r.duration} · {r.genres.join(', ')}
              {r.albumTitle ? ` · ${r.albumTitle}` : ''}
            </Text>
            {r.genreNamesOriginal ? (
              <Text style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>({r.genreNamesOriginal})</Text>
            ) : null}
            <View style={styles.reqActions}>
              <Button label={t('admin.approveBtn')} variant="success" small loading={busyId === r.id} onPress={() => approve(r.id)} />
              <Button label={t('admin.rejectBtn')} variant="danger" small loading={busyId === r.id} onPress={() => reject(r.id)} />
            </View>
          </View>
        ))
      )}

      {editing ? (
        <SongFormModal
          visible={!!editing}
          title={t('admin.editTitle')}
          initial={requestToForm(editing)}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
          saving={saving}
        />
      ) : null}
    </ScrollView>
  );
}

function AddSongPanel() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [form, setForm] = useState(EMPTY_ADD);
  const [extResults, setExtResults] = useState<ExternalSongResult[]>([]);
  const [genresHint, setGenresHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof typeof EMPTY_ADD) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

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
      // no-op
    } finally {
      setGenresHint(null);
    }
  };

  const missing = !form.artist || !form.title || !form.release || !form.duration || !form.genres;

  const submit = async () => {
    if (missing) return;
    setSubmitting(true);
    try {
      await api.createSong({
        artist: form.artist.trim(),
        title: form.title.trim(),
        release: form.release.trim(),
        duration: form.duration.trim(),
        album: form.album.trim() || null,
        genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
      });
      setForm(EMPTY_ADD);
      setExtResults([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading pre={t('add.heading.pre')} accent={t('add.heading.accent')} />

        {success ? (
          <View style={[styles.alert, { backgroundColor: `${theme.green}26`, borderColor: `${theme.green}4d` }]}>
            <Text style={{ color: theme.green, fontSize: 13 }}>{t('add.successAlert')}</Text>
          </View>
        ) : null}

        <Field label={t('form.artist')} value={form.artist} onChangeText={set('artist')} />
        <Field label={t('form.title')} value={form.title} onChangeText={set('title')} />

        {extResults.length ? (
          <View style={[styles.extPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {extResults.map((item, idx) => (
              <TouchableOpacity key={idx} onPress={() => applyResult(item)} style={[styles.extItem, { borderColor: theme.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{item.artist}</Text>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 1 }}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Field label={t('form.release')} value={form.release} onChangeText={set('release')} placeholder="2024-01-01" />
        <Field label={t('form.duration')} value={form.duration} onChangeText={set('duration')} placeholder="00:03:30" hint={t('form.duration.hint')} />
        <Field label={t('form.album')} value={form.album} onChangeText={set('album')} />
        <Field label={t('form.genres')} value={form.genres} onChangeText={set('genres')} hint={genresHint || t('form.genres.hint')} />

        <Button label={t('add.submitBtn')} onPress={submit} loading={submitting} disabled={missing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
  },
  segmentBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 40 },
  reqCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  reqActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
