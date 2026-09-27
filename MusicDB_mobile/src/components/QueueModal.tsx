import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, NoteIcon, PlayIcon, PlusIcon, SearchIcon } from './Icons';
import { CONTROL_HEIGHT, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { HistoryItem, Song } from '@/api/types';

const UPCOMING_MAX = 40;

export function songThumb(s: Song) {
  return s.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/mqdefault.jpg` : null;
}

// "5 хв тому" — мовою інтерфейсу (Intl, без власних рядків).
export function timeAgo(iso: string | null | undefined, lang: string) {
  if (!iso) return '';
  const sec = (new Date(iso).getTime() - Date.now()) / 1000;
  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'uk', { numeric: 'auto' });
    for (const [u, n] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) if (Math.abs(sec) >= n) return rtf.format(Math.round(sec / n), u);
    return rtf.format(0, 'minute');
  } catch {
    return '';
  }
}

// Рядок пісні черги/історії: обкладинка, назва, виконавець, дії праворуч.
export function QueueRow({ song, meta, current, onPress, children }: { song: Song; meta?: string; current?: boolean; onPress?: () => void; children?: React.ReactNode }) {
  const { theme } = useSettings();
  const thumb = songThumb(song);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.row, current && { backgroundColor: `${theme.accent}1a` }]}>
      <View style={[styles.cover, { backgroundColor: theme.surface2 }]}>
        {thumb ? <Image source={{ uri: thumb }} style={styles.coverImg} /> : <NoteIcon size={16} color={theme.muted} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.title, { color: current ? theme.accent : theme.text }]}>{song.title}</Text>
        <Text numberOfLines={1} style={[styles.sub, { color: theme.muted }]}>{song.artist}{meta ? ` · ${meta}` : ''}</Text>
      </View>
      {children ? <View style={styles.acts}>{children}</View> : null}
    </TouchableOpacity>
  );
}

function IconBtn({ onPress, children, dim }: { onPress: () => void; children: React.ReactNode; dim?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={dim} hitSlop={6} style={[styles.iconBtn, dim && { opacity: 0.3 }]}>
      {children}
    </TouchableOpacity>
  );
}

// Черга — як панель черги на сайті: зараз грає, "Моя черга" (↑↓✕), "Далі" зі списку,
// нещодавно прослухані (з сервера — ті самі, що на сайті) і пошук, щоб зібрати свою чергу.
export function QueueModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, t, lang } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const p = usePlayer();
  const insets = useSafeAreaInsets();
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [allSongs, setAllSongs] = useState<Song[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (currentUser?.authenticated) api.getHistory(30).then(setRecent).catch(() => {});
    if (!allSongs) api.getSongs('all').then(setAllSongs).catch(() => setAllSongs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const found = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (ql.length < 2 || !allSongs) return [];
    return allSongs.filter((s) => `${s.artist} ${s.title} ${s.album || ''}`.toLowerCase().includes(ql)).slice(0, 8);
  }, [q, allSongs]);

  const upcoming = p.queue.slice(p.index + 1);
  const recentShown = recent.filter((r) => r.song.id !== p.current?.id).slice(0, 20);
  const add = (s: Song, next = false) => {
    p.addToQueue(s, next);
    setQ('');
  };

  const Section = ({ title, count, onClear, children }: { title: string; count?: number; onClear?: () => void; children: React.ReactNode }) => (
    <View style={{ marginTop: SPACING.md }}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.muted }]}>
          {title}
          {count ? <Text style={{ color: theme.accent }}>  {count}</Text> : null}
        </Text>
        {onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Text style={{ color: theme.accent, fontSize: 12 }}>{t('queue.clear')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
  const Empty = ({ label }: { label: string }) => <Text style={[styles.empty, { color: theme.muted }]}>{label}</Text>;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.sm }]} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={[styles.headTitle, { color: theme.text }]}>{t('queue.title')}</Text>
            <TouchableOpacity onPress={p.startNewQueue} hitSlop={8}>
              <Text style={{ color: theme.accent, fontSize: 13 }}>{t('queue.new')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={{ marginLeft: 12 }}>
              <CloseIcon size={14} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <View style={[styles.search, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <SearchIcon size={15} color={theme.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('queue.searchPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            {q.trim().length >= 2 ? (
              found.length ? (
                found.map((s) => (
                  <QueueRow key={`f${s.id}`} song={s} onPress={() => add(s)}>
                    <IconBtn onPress={() => add(s, true)}><PlayIcon size={13} color={theme.muted} /></IconBtn>
                    <IconBtn onPress={() => add(s)}><PlusIcon size={16} color={theme.muted} /></IconBtn>
                  </QueueRow>
                ))
              ) : (
                <Empty label={t('queue.searchEmpty')} />
              )
            ) : (
              <>
                {p.current ? (
                  <Section title={t('queue.nowPlaying')}>
                    <QueueRow song={p.current} current onPress={p.toggle} />
                  </Section>
                ) : null}
                <Section title={t('queue.mine')} count={p.userQueue.length} onClear={p.userQueue.length ? p.clearUserQueue : undefined}>
                  {p.userQueue.length ? (
                    p.userQueue.map((s, i) => (
                      <QueueRow key={`m${i}-${s.id}`} song={s} onPress={() => p.playFromUserQueue(i)}>
                        <IconBtn dim={i === 0} onPress={() => p.moveInUserQueue(i, -1)}><ArrowUpIcon size={15} color={theme.muted} /></IconBtn>
                        <IconBtn dim={i === p.userQueue.length - 1} onPress={() => p.moveInUserQueue(i, 1)}><ArrowDownIcon size={15} color={theme.muted} /></IconBtn>
                        <IconBtn onPress={() => p.removeFromUserQueue(i)}><CloseIcon size={12} color={theme.muted} /></IconBtn>
                      </QueueRow>
                    ))
                  ) : (
                    <Empty label={t('queue.mineEmpty')} />
                  )}
                </Section>
                <Section title={t('queue.next')} count={upcoming.length} onClear={upcoming.length ? p.clearUpcoming : undefined}>
                  {upcoming.length ? (
                    <>
                      {upcoming.slice(0, UPCOMING_MAX).map((s, i) => (
                        <QueueRow key={`u${i}-${s.id}`} song={s} onPress={() => p.jumpToUpcoming(i)}>
                          <IconBtn onPress={() => p.removeUpcoming(i)}><CloseIcon size={12} color={theme.muted} /></IconBtn>
                        </QueueRow>
                      ))}
                      {upcoming.length > UPCOMING_MAX ? <Empty label={t('queue.more').replace('{n}', String(upcoming.length - UPCOMING_MAX))} /> : null}
                    </>
                  ) : (
                    <Empty label={t('queue.nextEmpty')} />
                  )}
                </Section>
                <Section title={t('queue.recent')}>
                  {recentShown.length ? (
                    recentShown.map((r) => (
                      <QueueRow key={`r${r.song.id}`} song={r.song} meta={timeAgo(r.listenedAt, lang)} onPress={() => p.playNow(r.song)}>
                        <IconBtn onPress={() => p.addToQueue(r.song)}><PlusIcon size={16} color={theme.muted} /></IconBtn>
                      </QueueRow>
                    ))
                  ) : (
                    <Empty label={t('queue.recentEmpty')} />
                  )}
                </Section>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  headTitle: { flex: 1, fontSize: 18, fontFamily: FONT_SANS_SEMIBOLD },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: CONTROL_HEIGHT - 6, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONT_SANS_REGULAR },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT_SANS_SEMIBOLD },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10 },
  cover: { width: 42, height: 42, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverImg: { width: '100%', height: '100%' },
  title: { fontSize: 14, fontFamily: FONT_SANS_SEMIBOLD },
  sub: { fontSize: 12, marginTop: 1, fontFamily: FONT_SANS_REGULAR },
  acts: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4, paddingVertical: 6 },
});
