import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Avatar, Button, SegmentedPicker } from './UI';
import { BellIcon, ChatIcon, CheckIcon, CloseIcon, MicIcon, ShieldIcon } from './Icons';
import { openUserProfile } from './FriendsPanel';
import { formatStamp } from '@/utils/time';
import { FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { AdminNotification, ArtistNotification, FriendRequest, ThreadNotification } from '@/api/types';

const ADMIN_EVENT_KEYS = {
  request_submitted: 'adminNotif.request_submitted',
  request_approved: 'adminNotif.request_approved',
  request_rejected: 'adminNotif.request_rejected',
  song_added: 'adminNotif.song_added',
  bug_reported: 'adminNotif.bug_reported',
} as const;

const ARTIST_EVENT_KEYS: Record<string, 'notif.event.songAdded' | 'notif.event.songRemoved' | 'notif.event.lyricsAdded'> = {
  song_added: 'notif.event.songAdded',
  song_removed: 'notif.event.songRemoved',
  lyrics_added: 'notif.event.lyricsAdded',
};

// Скільки непрочитаного — для бейджа дзвіночка (та сама сума, що й на сайті):
// події виконавців + вхідні запити в друзі + нові дописи в обговореннях + сповіщення адміна.
export async function loadNotificationCount(api: ReturnType<typeof useMusicApi>, isAdmin: boolean) {
  const [n, fr, th, adm] = await Promise.all([
    api.getNotifications(1).then((d) => d.unreadCount).catch(() => 0),
    api.getIncomingFriendRequests().then((r) => r.length).catch(() => 0),
    api.getThreadNotifications(1).then((d) => d.unreadCount).catch(() => 0),
    isAdmin ? api.getAdminNotifications(1).then((d) => d.unreadCount).catch(() => 0) : Promise.resolve(0),
  ]);
  return n + fr + th + adm;
}

type Tab = 'general' | 'threads';

// Сповіщення (дзвіночок у шапці): дві вкладки.
// «Загальні» — адміністрування, запити в друзі (прийняти/відхилити), нові пісні виконавців.
// «Обговорення» — нові дописи в гілках, де ви писали; на допис можна відповісти просто звідси.
export function NotificationsModal({ visible, onClose, onChanged }: { visible: boolean; onClose: () => void; onChanged: () => void }) {
  const { theme, t, lang } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const insets = useSafeAreaInsets();
  const isAdmin = !!currentUser?.isAdmin;

  const [tab, setTab] = useState<Tab>('general');
  const [artist, setArtist] = useState<ArtistNotification[]>([]);
  const [artistUnread, setArtistUnread] = useState(0);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [admin, setAdmin] = useState<AdminNotification[]>([]);
  const [adminUnread, setAdminUnread] = useState(0);
  const [threads, setThreads] = useState<ThreadNotification[]>([]);
  const [threadsUnread, setThreadsUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  // Відповідь просто зі сповіщення: на який допис відповідаємо, текст, стан.
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const [n, fr, th, adm] = await Promise.all([
      api.getNotifications(30).catch(() => null),
      api.getIncomingFriendRequests().catch(() => [] as FriendRequest[]),
      api.getThreadNotifications(30).catch(() => null),
      isAdmin ? api.getAdminNotifications(30).catch(() => null) : Promise.resolve(null),
    ]);
    setArtist(n?.recent ?? []);
    setArtistUnread(n?.unreadCount ?? 0);
    setIncoming(fr);
    setThreads(th?.recent ?? []);
    setThreadsUnread(th?.unreadCount ?? 0);
    setAdmin(adm?.recent ?? []);
    setAdminUnread(adm?.unreadCount ?? 0);
    setLoading(false);
    return { general: (n?.unreadCount ?? 0) + fr.length + (adm?.unreadCount ?? 0), threads: th?.unreadCount ?? 0 };
  }, [api, isAdmin]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setReplyTo(null);
    setReply('');
    setSent(new Set());
    // Відкриваємо ту вкладку, де є нове (обговорення — якщо нове лише там).
    load().then((c) => setTab(c.general === 0 && c.threads > 0 ? 'threads' : 'general'));
  }, [visible, load]);

  const after = async (p: Promise<unknown>) => {
    await p.catch(() => {});
    await load();
    onChanged();
  };
  const markAll = () =>
    after(
      tab === 'threads'
        ? api.markThreadNotificationsRead()
        : Promise.all([api.markNotificationsRead(), isAdmin ? api.markAdminNotificationsRead() : Promise.resolve()]),
    );
  const go = (fn: () => void) => {
    onClose();
    fn();
  };
  const openThread = (id: number, postId?: number) =>
    go(() => router.push({ pathname: '/community/thread/[id]', params: postId ? { id: String(id), post: String(postId) } : { id: String(id) } }));

  const sendReply = async (n: ThreadNotification) => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.replyToThread(n.threadId, body, n.postId);
      setSent((s) => new Set(s).add(n.postId));
      setReplyTo(null);
      setReply('');
      await load();
      onChanged();
    } catch {
      // лишаємо текст — можна спробувати ще раз
    } finally {
      setSending(false);
    }
  };

  const generalUnread = artistUnread + incoming.length + adminUnread;
  const generalEmpty = !artist.length && !incoming.length && !admin.length;
  const card = { backgroundColor: theme.surface2, borderColor: theme.border };
  const unreadDot = <View style={[styles.dot, { backgroundColor: theme.accent }]} />;
  const kindIcon = (icon: React.ReactNode) => <View style={[styles.kind, { backgroundColor: `${theme.accent}1a` }]}>{icon}</View>;

  const general = (
    <>
      {admin.length ? <Text style={[styles.section, { color: theme.muted }]}>{t('adminNotif.sectionTitle')}</Text> : null}
      {admin.map((n, i) => (
        <Pressable
          key={`a${n.id}`}
          onPress={() => go(() => router.push('/admin'))}
          style={({ pressed }) => [styles.item, styles.row, card, pressed && styles.pressed]}
        >
          {kindIcon(<ShieldIcon size={15} color={theme.accent} />)}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.main, { color: theme.text }]}>
              <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{n.actor?.displayName ?? t('adminNotif.someone')}</Text> {t(ADMIN_EVENT_KEYS[n.eventType])}
              {n.source === 'community' ? ` · ${t('home.source.community')}` : ''}
            </Text>
            <Text numberOfLines={2} style={[styles.sub, { color: theme.text2 }]}>{n.label}</Text>
            <Text style={[styles.date, { color: theme.muted }]}>{formatStamp(n.createdAt, lang)}</Text>
          </View>
          {i < adminUnread ? unreadDot : null}
        </Pressable>
      ))}
      {admin.length && (incoming.length || artist.length) ? <Text style={[styles.section, { color: theme.muted }]}>{t('notif.sectionTitle')}</Text> : null}
      {incoming.map((r) => (
        <View key={`f${r.requestId}`} style={[styles.item, card, { gap: 10 }]}>
          <Pressable onPress={() => go(() => openUserProfile(r.userId, r.displayName))} style={styles.row}>
            <Avatar url={r.avatarUrl} name={r.displayName} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD }}>{r.displayName}</Text>
              <Text numberOfLines={1} style={[styles.sub, { color: theme.muted, marginTop: 1 }]}>{t('friends.incomingRequestLabel')}</Text>
            </View>
            {unreadDot}
          </Pressable>
          <View style={styles.actions}>
            <Button label={t('friends.acceptBtn')} small onPress={() => after(api.acceptFriendRequest(r.requestId))} style={{ flex: 1 }} />
            <Button label={t('friends.rejectBtn')} variant="outline" small onPress={() => after(api.cancelOrRejectFriendRequest(r.requestId))} style={{ flex: 1 }} />
          </View>
        </View>
      ))}
      {artist.map((n) => (
        <Pressable
          key={`n${n.id}`}
          onPress={() => go(() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(n.artistId) } }))}
          style={({ pressed }) => [styles.item, styles.row, card, pressed && styles.pressed]}
        >
          {kindIcon(<MicIcon size={15} color={theme.accent} />)}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.main, { color: theme.text }]}>
              <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{n.artistName}</Text> — {ARTIST_EVENT_KEYS[n.eventType] ? t(ARTIST_EVENT_KEYS[n.eventType]) : n.eventType}
            </Text>
            <Text numberOfLines={2} style={[styles.sub, { color: theme.text2 }]}>{n.songLabel}</Text>
            <Text style={[styles.date, { color: theme.muted }]}>{formatStamp(n.createdAt, lang)}</Text>
          </View>
          <Pressable
            onPress={() => after(api.markNotificationRead(n.id))}
            hitSlop={10}
            accessibilityLabel={t('notif.markOneRead')}
            style={({ pressed }) => [styles.check, { borderColor: theme.border, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
          >
            <CheckIcon size={14} color={theme.muted} />
          </Pressable>
        </Pressable>
      ))}
      {generalEmpty ? <Empty icon={<BellIcon size={22} color={theme.muted} />} text={t('notif.empty')} /> : null}
    </>
  );

  const discussions = (
    <>
      {threads.map((n) => {
        const replying = replyTo === n.postId;
        const name = n.author?.displayName ?? t('threads.deletedUser');
        return (
          <View key={`t${n.postId}`} style={[styles.item, card, n.unread && { borderColor: `${theme.accent}66` }]}>
            <Pressable onPress={() => openThread(n.threadId, n.postId)} style={styles.row}>
              <Avatar url={n.author?.avatarUrl} name={name} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={[styles.main, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{name}</Text>{' '}
                  {t(n.toMe ? 'notif.thread.toMe' : 'notif.thread.posted')}{' '}
                  <Text style={{ color: theme.accent, fontFamily: FONT_SANS_MEDIUM }}>«{n.threadTitle}»</Text>
                </Text>
                <Text style={[styles.date, { color: theme.muted }]}>{formatStamp(n.createdAt, lang)}</Text>
              </View>
              {n.unread ? unreadDot : null}
            </Pressable>
            <View style={[styles.quote, { borderLeftColor: theme.accent, backgroundColor: `${theme.bg}80` }]}>
              <Text numberOfLines={4} style={[styles.quoteText, { color: theme.text2 }]}>{n.body}</Text>
            </View>
            {sent.has(n.postId) ? (
              <View style={[styles.row, { marginTop: 10, gap: 6 }]}>
                <CheckIcon size={14} color={theme.green} />
                <Text style={{ color: theme.green, fontSize: 13, fontFamily: FONT_SANS_MEDIUM }}>{t('notif.thread.sent')}</Text>
              </View>
            ) : replying ? (
              <View style={[styles.composer, { borderColor: theme.accent, backgroundColor: theme.bg }]}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  autoFocus
                  multiline
                  maxLength={10000}
                  placeholder={t('notif.thread.replyTo').replace('{name}', name)}
                  placeholderTextColor={theme.muted}
                  style={[styles.composerInput, { color: theme.text }]}
                />
                <View style={styles.actions}>
                  <Button label={t('common.cancel')} variant="plain" small onPress={() => setReplyTo(null)} style={{ flex: 1 }} />
                  <Button label={t('notif.thread.send')} small loading={sending} disabled={!reply.trim()} onPress={() => sendReply(n)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <View style={[styles.actions, { marginTop: 10 }]}>
                <Button
                  label={t('notif.thread.reply')}
                  variant="outline"
                  small
                  onPress={() => {
                    setReplyTo(n.postId);
                    setReply('');
                  }}
                  style={{ flex: 1 }}
                />
                <Button label={t('notif.thread.open')} variant="plain" small onPress={() => openThread(n.threadId, n.postId)} style={{ flex: 1 }} />
              </View>
            )}
          </View>
        );
      })}
      {!threads.length ? <Empty icon={<ChatIcon size={22} color={theme.muted} />} text={t('notif.thread.empty')} /> : null}
    </>
  );

  const unreadHere = tab === 'threads' ? threadsUnread : artistUnread + adminUnread;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]}
            onPress={() => {}}
          >
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
            <View style={styles.head}>
              <Text style={[styles.title, { color: theme.text }]}>{t('notif.bellTitle')}</Text>
              {unreadHere ? (
                <Pressable onPress={markAll} hitSlop={8} style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}>
                  <CheckIcon size={13} color={theme.accent} />
                  <Text style={{ color: theme.accent, fontSize: 13, fontFamily: FONT_SANS_MEDIUM }}>{t('notif.markAllRead')}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')} style={[styles.close, { backgroundColor: theme.surface2 }]}>
                <CloseIcon size={12} color={theme.text2} />
              </Pressable>
            </View>
            <View style={{ marginBottom: SPACING.md }}>
              <SegmentedPicker<Tab>
                fill
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setReplyTo(null);
                }}
                options={[
                  { value: 'general', label: t('notif.tab.general'), icon: (c) => <BellIcon size={14} color={c} />, badge: generalUnread },
                  { value: 'threads', label: t('notif.tab.threads'), icon: (c) => <ChatIcon size={14} color={c} />, badge: threadsUnread },
                ]}
              />
            </View>
            {loading ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {tab === 'general' ? general : discussions}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.surface2 }]}>{icon}</View>
      <Text style={{ color: theme.muted, textAlign: 'center', fontSize: 13.5, lineHeight: 19, fontFamily: FONT_SANS_REGULAR }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: SPACING.lg, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: SPACING.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  title: { flex: 1, fontSize: 17, fontFamily: FONT_SANS_SEMIBOLD },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 6, marginBottom: 8, fontFamily: FONT_SANS_SEMIBOLD },
  item: { borderWidth: 1, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  kind: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  main: { fontSize: 14, lineHeight: 19 },
  sub: { fontSize: 13, marginTop: 3 },
  date: { fontSize: 11.5, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  quote: { borderLeftWidth: 3, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  quoteText: { fontSize: 13.5, lineHeight: 19 },
  composer: { borderWidth: 1, borderRadius: RADIUS.md, padding: 8, marginTop: 10, gap: 8 },
  composerInput: { minHeight: 64, maxHeight: 140, fontSize: 15, textAlignVertical: 'top', paddingHorizontal: 4, paddingVertical: 4 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
