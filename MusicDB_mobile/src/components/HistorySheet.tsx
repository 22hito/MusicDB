import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button } from './UI';
import { QueueRow } from './QueueModal';
import { CloseIcon, PlusIcon, SearchIcon } from './Icons';
import { dayGroup } from '@/utils/time';
import { FONT_SANS_BOLD, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { HistoryItem } from '@/api/types';

const PAGE = 50;
const pad = (n: number) => String(n).padStart(2, '0');

// Уся історія прослуховувань окремим аркушем: групами за днями (сьогодні, вчора, цього тижня, місяці),
// довантаження сторінками під час прокрутки, пошук серед завантаженого. У профілі лишаються 5 останніх —
// сторінка не перетворюється на нескінченну стрічку, навіть коли прослуханих сотні.
export function HistorySheet({ visible, total, onClose }: { visible: boolean; total: number; onClose: () => void }) {
  const { theme, t, lang } = useSettings();
  const api = useMusicApi();
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [q, setQ] = useState('');
  const offset = useRef(0);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    try {
      const page = await api.getHistory(PAGE, offset.current);
      offset.current += PAGE;
      if (!page.length) setDone(true);
      setItems((prev) => {
        const seen = new Set(prev.map((h) => h.song.id));
        return [...prev, ...page.filter((h) => !seen.has(h.song.id))];
      });
    } catch {
      setDone(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [api, done]);

  useEffect(() => {
    if (!visible) return;
    offset.current = 0;
    setItems([]);
    setDone(false);
    setQ('');
  }, [visible]);
  useEffect(() => {
    if (visible && !items.length && !done) loadMore();
  }, [visible, items.length, done, loadMore]);

  const filtered = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? items.filter((h) => words.every((w) => `${h.song.artist} ${h.song.title}`.toLowerCase().includes(w))) : items;
  }, [items, q]);
  const sections = useMemo(() => {
    const out: { title: string; data: HistoryItem[] }[] = [];
    for (const h of filtered) {
      const title = dayGroup(new Date(h.listenedAt), lang);
      if (out[out.length - 1]?.title !== title) out.push({ title, data: [] });
      out[out.length - 1].data.push(h);
    }
    return out;
  }, [filtered, lang]);

  const songs = filtered.map((h) => h.song);
  const time = (iso: string) => {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: SPACING.md }]}>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: theme.text }]}>{t('history.title')}</Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, marginTop: 2 }}>{t('history.total', { n: total })}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')} style={[styles.close, { backgroundColor: theme.surface2 }]}>
            <CloseIcon size={12} color={theme.text2} />
          </Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: theme.surface, borderColor: q ? theme.accent : theme.border }]}>
          <SearchIcon size={15} color={theme.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('history.search')}
            placeholderTextColor={theme.muted}
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <View style={styles.actions}>
          <Button label={`▶ ${t('artist.playAll')}`} small disabled={!songs.length} onPress={() => songs.length && player.playFrom(songs, songs[0].id)} style={{ flex: 1 }} />
          <Button label={t('history.queueAll')} small variant="outline" disabled={!songs.length} onPress={() => player.addManyToQueue(songs)} style={{ flex: 1 }} />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(h) => String(h.song.id)}
          stickySectionHeadersEnabled
          initialNumToRender={16}
          windowSize={9}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!q) loadMore();
          }}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: insets.bottom + SPACING.xl }}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.section, { color: theme.muted, backgroundColor: theme.bg }]}>{section.title}</Text>
          )}
          renderItem={({ item: h }) => (
            <QueueRow song={h.song} meta={time(h.listenedAt)} current={player.current?.id === h.song.id} onPress={() => player.playFrom(songs, h.song.id)}>
              <Pressable onPress={() => player.addToQueue(h.song)} hitSlop={10} accessibilityLabel={t('queue.add')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.5 }]}>
                <PlusIcon size={16} color={theme.muted} />
              </Pressable>
            </QueueRow>
          )}
          ListEmptyComponent={
            loading ? null : <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 40 }}>{q ? t('table.empty') : t('queue.recentEmpty')}</Text>
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : q && !done ? (
              // Пошук іде серед завантаженого — можна довантажити старіше.
              <Button label={t('history.loadOlder')} small variant="plain" onPress={loadMore} style={{ marginTop: SPACING.sm }} />
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  title: { fontSize: 20, fontFamily: FONT_SANS_BOLD },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, height: 46, marginHorizontal: SPACING.lg },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  section: { fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: FONT_SANS_SEMIBOLD, paddingTop: SPACING.md, paddingBottom: 6 },
  add: { padding: 6 },
});
