import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Badge, Button, EmptyState, ErrorState, Field, Heading, SegmentedPicker } from '@/components/UI';
import { CommunityFields } from '@/components/CommunityFields';
import { SongFormModal, type SongFormValues } from '@/components/SongFormModal';
import { EditIcon, TrashIcon } from '@/components/Icons';
import { PLAYER_BAR_HEIGHT, RADIUS, SPACING } from '@/constants/theme';
import { DateField } from '@/components/DateField';
import { AudioPreview } from '@/components/AudioPreview';
import type { BugReport, BugStatus, ExternalSongResult, PickedAudio, SongRequest, SongSource } from '@/api/types';

const EMPTY_ADD = { artist: '', title: '', release: '', duration: '', album: '', genres: '' };

function requestToForm(r: SongRequest): SongFormValues {
  return {
    artist: r.artist,
    title: r.title,
    release: r.release,
    duration: r.duration,
    album: r.albumTitle || '',
    genres: r.genres.join(', '),
    youtubeVideoId: r.youtubeVideoId || '',
  };
}

// Адмін-панель — як на сайті: заголовок і вкладки-кнопки Запити · Додати пісню · Баг-репорти
// (сповіщення адміна — у дзвіночку шапки, разом з іншими сповіщеннями).
type AdminMode = 'requests' | 'add' | 'bugs';
export default function AdminScreen() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const { subscribeRealtime } = useApiBridge();
  const [mode, setMode] = useState<AdminMode>('requests');
  const [openBugs, setOpenBugs] = useState(0);
  const refreshBugs = useCallback(() => {
    api.getOpenBugCount().then(setOpenBugs).catch(() => {});
  }, [api]);
  useEffect(() => {
    refreshBugs();
  }, [refreshBugs]);
  useEffect(
    () =>
      subscribeRealtime((event) => {
        if (event === 'bugReportsChanged') refreshBugs();
      }),
    [subscribeRealtime, refreshBugs],
  );

  const tabs: { key: AdminMode; label: string; badge?: number }[] = [
    { key: 'requests', label: t('adminHub.requestsTab') },
    { key: 'add', label: t('adminHub.addTab') },
    { key: 'bugs', label: t('adminHub.bugsTab'), badge: openBugs },
  ];

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.hubHead}>
        <Heading pre={t('adminHub.heading.pre')} accent={t('adminHub.heading.accent')} />
        <View style={styles.hubTabs}>
          {tabs.map(({ key, label, badge }) => {
            const active = mode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setMode(key)}
                style={[
                  styles.hubTab,
                  { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? `${theme.accent}1a` : theme.surface },
                ]}
              >
                <Text style={{ color: active ? theme.accent : theme.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
                {badge ? (
                  <View style={[styles.hubBadge, { backgroundColor: theme.accent }]}>
                    <Text style={{ color: theme.onAccent, fontSize: 10.5, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {mode === 'requests' ? <RequestsPanel /> : mode === 'add' ? <AddSongPanel /> : <BugsPanel onChanged={refreshBugs} />}
    </SafeAreaView>
  );
}

function RequestsPanel() {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<SongRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getRequests()
      .then((res) => {
        setRequests(res);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeRealtime((event) => {
      if (event === 'requestsChanged') load();
    });
  }, [subscribeRealtime, load]);

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
        youtubeVideoId: values.youtubeVideoId.trim(),
      });
      if (values.lyrics !== undefined) await api.setRequestLyrics(updated.id, values.lyrics).catch(() => {});
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
      {loadError ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : requests.length === 0 ? (
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8, gap: 6 }}>
              <Badge
                label={t(r.kind === 'community' ? 'home.source.community' : 'home.source.catalog')}
                kind={r.kind === 'community' ? 'album' : 'genre'}
              />
              {r.requester ? (
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {t('table.submittedBy')}: <Text style={{ color: theme.accent }}>{r.requester.displayName}</Text>
                </Text>
              ) : null}
            </View>
            {r.audioUrl ? <AudioPreview getUrl={() => api.getRequestAudioLink(r.id)} /> : null}
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
          loadLyrics={() => api.getRequestLyrics(editing.id).then((d) => d.lyrics)}
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
  const [kind, setKind] = useState<SongSource>('catalog');
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [youtube, setYoutube] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    if (kind === 'community' && !audio && !youtube.trim()) {
      setError(t('msg.communityNeedsFileOrVideo'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (kind === 'community') {
        await api.createCommunitySong({
          artist: form.artist.trim(),
          title: form.title.trim(),
          release: form.release.trim(),
          duration: form.duration.trim(),
          genres: form.genres,
          album: form.album.trim() || null,
          youtubeVideo: youtube.trim() || null,
          audio,
        });
      } else {
        await api.createSong({
          artist: form.artist.trim(),
          title: form.title.trim(),
          release: form.release.trim(),
          duration: form.duration.trim(),
          album: form.album.trim() || null,
          genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
        });
      }
      setForm(EMPTY_ADD);
      setAudio(null);
      setYoutube('');
      setExtResults([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (e) {
      const body = (e as { body?: string }).body;
      setError(body ? `${t('msg.errorAddSong')}\n${body}` : t('msg.errorAddSong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading pre={t('add.heading.pre')} accent={t('add.heading.accent')} />
        <View style={{ marginBottom: SPACING.lg }}>
          <SegmentedPicker<SongSource>
            options={[
              { value: 'catalog', label: t('home.source.catalog') },
              { value: 'community', label: t('home.source.community') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </View>

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

        <DateField label={t('form.release')} value={form.release} onChange={set('release')} />
        <Field label={t('form.duration')} value={form.duration} onChangeText={set('duration')} placeholder="00:03:30" hint={t('form.duration.hint')} />
        <Field label={t('form.album')} value={form.album} onChangeText={set('album')} />
        <Field label={t('form.genres')} value={form.genres} onChangeText={set('genres')} hint={genresHint || t('form.genres.hint')} />

        {kind === 'community' ? (
          <CommunityFields audio={audio} youtube={youtube} onAudioChange={setAudio} onYoutubeChange={setYoutube} />
        ) : null}
        {error ? <Text style={{ color: theme.red, fontSize: 13, marginBottom: SPACING.md }}>{error}</Text> : null}
        <Button label={t('add.submitBtn')} onPress={submit} loading={submitting} disabled={missing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Баг-репорти від користувачів: фільтр відкриті/вирішені/усі, перемикання статусу.
function BugsPanel({ onChanged }: { onChanged?: () => void }) {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const [filter, setFilter] = useState<BugStatus | 'all'>('open');
  const [items, setItems] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [viewer, setViewer] = useState<string | null>(null); // скріншот на весь екран
  // Прямі посилання на скріншоти (підписані R2 живуть години — для сесії адмінки досить).
  const [shotLinks, setShotLinks] = useState<Record<number, string[]>>({});
  useEffect(() => {
    for (const b of items) {
      if (!b.screenshotCount || shotLinks[b.id]) continue;
      Promise.all(Array.from({ length: b.screenshotCount }, (_, i) => api.getBugScreenshotLink(b.id, i).catch(() => '')))
        .then((urls) => setShotLinks((prev) => ({ ...prev, [b.id]: urls.filter(Boolean) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, api]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .getBugReports(filter)
      .then((r) => {
        setItems(r);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [api, filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useEffect(() => subscribeRealtime((event) => event === 'bugReportsChanged' && load()), [subscribeRealtime, load]);

  const remove = (id: number) =>
    Alert.alert(t('bugs.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('bugs.deleteBtn'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(id);
          try {
            await api.deleteBugReport(id);
            setItems((prev) => prev.filter((x) => x.id !== id));
            onChanged?.();
          } catch {
            Alert.alert(t('error.loadFailed'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const setStatus = async (id: number, status: BugStatus) => {
    setBusyId(id);
    try {
      await api.setBugStatus(id, status);
      load();
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ marginBottom: SPACING.md }}>
        <SegmentedPicker<BugStatus | 'all'>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: t('bugs.filter.open') },
            { value: 'resolved', label: t('bugs.filter.resolved') },
            { value: 'all', label: t('bugs.filter.all') },
          ]}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
      ) : loadError ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon="🐞" label={t('bugs.empty')} />
      ) : (
        items.map((b) => (
          <View key={b.id} style={[styles.reqCard, { backgroundColor: theme.surface, borderColor: b.status === 'open' ? theme.accent : theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{b.reporter?.displayName ?? t('adminNotif.someone')}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{b.createdAt}</Text>
              <Text style={{ color: b.status === 'open' ? theme.accent : theme.green, fontSize: 11, marginLeft: 'auto' }}>
                {t(b.status === 'open' ? 'bugs.status.open' : 'bugs.status.resolved')}
              </Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, marginTop: 8 }}>{b.description}</Text>
            {b.context ? (
              <TouchableOpacity onPress={() => setExpanded((e) => (e === b.id ? null : b.id))} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.accent, fontSize: 12 }}>
                  {expanded === b.id ? '▾' : '▸'} {t('bugs.contextTitle')}
                </Text>
                {expanded === b.id ? (
                  <Text selectable style={{ color: theme.muted, fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>{b.context}</Text>
                ) : null}
              </TouchableOpacity>
            ) : null}
            {b.screenshotCount ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
                {(shotLinks[b.id] ?? []).map((url, i) => (
                  <TouchableOpacity key={i} onPress={() => setViewer(url)}>
                    <Image source={{ uri: url }} style={[styles.shotThumb, { borderColor: theme.border, backgroundColor: theme.surface2 }]} />
                  </TouchableOpacity>
                ))}
                {!shotLinks[b.id] ? <ActivityIndicator color={theme.accent} style={{ marginLeft: 6 }} /> : null}
              </ScrollView>
            ) : null}
            {b.resolvedBy ? (
              <Text style={{ color: theme.muted, fontSize: 11, marginTop: 6 }}>
                {t('bugs.resolvedBy')}: {b.resolvedBy.displayName}
              </Text>
            ) : null}
            <View style={styles.reqActions}>
              {b.status === 'open' ? (
                <Button small variant="success" label={t('bugs.resolveBtn')} loading={busyId === b.id} onPress={() => setStatus(b.id, 'resolved')} />
              ) : (
                <Button small variant="outline" label={t('bugs.reopenBtn')} loading={busyId === b.id} onPress={() => setStatus(b.id, 'open')} />
              )}
              <TouchableOpacity
                onPress={() => remove(b.id)}
                disabled={busyId === b.id}
                accessibilityLabel={t('bugs.deleteBtn')}
                style={[styles.bugDelete, { borderColor: theme.border }]}
              >
                <TrashIcon size={16} color={theme.red} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={{ width: '100%', height: '85%' }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hubHead: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  hubTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hubTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: RADIUS.md,
  },
  hubBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  // Запас під плаваючий міні-плеєр — щоб нижні кнопки не ховались під ним.
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: PLAYER_BAR_HEIGHT + 60 },
  reqCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  bugDelete: { width: 40, height: 40, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  shotThumb: { width: 110, height: 82, borderRadius: RADIUS.sm, borderWidth: 1 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
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
