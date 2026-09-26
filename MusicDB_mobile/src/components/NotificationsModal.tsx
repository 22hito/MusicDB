import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Avatar, Button } from './UI';
import { CheckIcon, CloseIcon } from './Icons';
import { openUserProfile } from './FriendsPanel';
import { FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import type { AdminNotification, ArtistNotification, FriendRequest } from '@/api/types';

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
// події виконавців + вхідні запити в друзі + сповіщення адміна.
export async function loadNotificationCount(api: ReturnType<typeof useMusicApi>, isAdmin: boolean) {
  const [n, fr, adm] = await Promise.all([
    api.getNotifications(1).then((d) => d.unreadCount).catch(() => 0),
    api.getIncomingFriendRequests().then((r) => r.length).catch(() => 0),
    isAdmin ? api.getAdminNotifications(1).then((d) => d.unreadCount).catch(() => 0) : Promise.resolve(0),
  ]);
  return n + fr + adm;
}

// Сповіщення (дзвіночок у шапці) — як випадне меню дзвіночка на сайті: адміністрування,
// запити в друзі (прийняти/відхилити), нові пісні виконавців, на яких ви підписані.
export function NotificationsModal({ visible, onClose, onChanged }: { visible: boolean; onClose: () => void; onChanged: () => void }) {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const insets = useSafeAreaInsets();
  const isAdmin = !!currentUser?.isAdmin;

  const [artist, setArtist] = useState<ArtistNotification[]>([]);
  const [artistUnread, setArtistUnread] = useState(0);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [admin, setAdmin] = useState<AdminNotification[]>([]);
  const [adminUnread, setAdminUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [n, fr, adm] = await Promise.all([
      api.getNotifications(30).catch(() => null),
      api.getIncomingFriendRequests().catch(() => [] as FriendRequest[]),
      isAdmin ? api.getAdminNotifications(30).catch(() => null) : Promise.resolve(null),
    ]);
    setArtist(n?.recent ?? []);
    setArtistUnread(n?.unreadCount ?? 0);
    setIncoming(fr);
    setAdmin(adm?.recent ?? []);
    setAdminUnread(adm?.unreadCount ?? 0);
    setLoading(false);
  }, [api, isAdmin]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      load();
    }
  }, [visible, load]);

  const after = async (p: Promise<unknown>) => {
    await p.catch(() => {});
    await load();
    onChanged();
  };
  const markAll = () => after(Promise.all([api.markNotificationsRead(), isAdmin ? api.markAdminNotificationsRead() : Promise.resolve()]));
  const go = (fn: () => void) => {
    onClose();
    fn();
  };

  const empty = !artist.length && !incoming.length && !admin.length;
  const card = { backgroundColor: theme.surface2, borderColor: theme.border };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]}
          onPress={() => {}}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]}>{t('notif.bellTitle')}</Text>
            {artistUnread || adminUnread ? <Button label={t('notif.markAllRead')} variant="outline" small onPress={markAll} /> : null}
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <CloseIcon size={14} color={theme.muted} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 30 }} />
          ) : empty ? (
            <Text style={{ color: theme.muted, textAlign: 'center', marginVertical: 30 }}>{t('notif.empty')}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 520 }}>
              {admin.length ? <Text style={[styles.section, { color: theme.muted }]}>{t('adminNotif.sectionTitle')}</Text> : null}
              {admin.map((n, i) => (
                <TouchableOpacity
                  key={`a${n.id}`}
                  onPress={() => go(() => router.push('/admin'))}
                  style={[styles.item, card, i < adminUnread && { borderLeftColor: theme.accent, borderLeftWidth: 3 }]}
                >
                  <Text style={{ color: theme.text, fontSize: 14 }}>
                    <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{n.actor?.displayName ?? t('adminNotif.someone')}</Text>{' '}
                    {t(ADMIN_EVENT_KEYS[n.eventType])}
                    {n.source === 'community' ? ` · ${t('home.source.community')}` : ''}
                  </Text>
                  <Text style={[styles.sub, { color: theme.muted }]}>{n.label}</Text>
                  <Text style={[styles.date, { color: theme.muted }]}>{n.createdAt}</Text>
                </TouchableOpacity>
              ))}
              {admin.length && (incoming.length || artist.length) ? (
                <Text style={[styles.section, { color: theme.muted }]}>{t('notif.sectionTitle')}</Text>
              ) : null}
              {incoming.map((r) => (
                <View key={`f${r.requestId}`} style={[styles.item, styles.row, card]}>
                  <TouchableOpacity onPress={() => go(() => openUserProfile(r.userId, r.displayName))} style={styles.who}>
                    <Avatar url={r.avatarUrl} name={r.displayName} size={34} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD }}>{r.displayName}</Text>
                      <Text numberOfLines={1} style={[styles.sub, { color: theme.muted, marginTop: 1 }]}>{t('friends.incomingRequestLabel')}</Text>
                    </View>
                  </TouchableOpacity>
                  <Button label={t('friends.acceptBtn')} small onPress={() => after(api.acceptFriendRequest(r.requestId))} />
                  <Button label={t('friends.rejectBtn')} variant="outline" small onPress={() => after(api.cancelOrRejectFriendRequest(r.requestId))} />
                </View>
              ))}
              {artist.map((n) => (
                <TouchableOpacity
                  key={`n${n.id}`}
                  onPress={() => go(() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(n.artistId) } }))}
                  style={[styles.item, styles.row, card]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: theme.text, fontSize: 14 }}>
                      <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{n.artistName}</Text> — {ARTIST_EVENT_KEYS[n.eventType] ? t(ARTIST_EVENT_KEYS[n.eventType]) : n.eventType}
                    </Text>
                    <Text style={[styles.sub, { color: theme.muted }]}>{n.songLabel}</Text>
                    <Text style={[styles.date, { color: theme.muted }]}>{n.createdAt}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => after(api.markNotificationRead(n.id))}
                    hitSlop={8}
                    accessibilityLabel={t('notif.markOneRead')}
                    style={[styles.check, { borderColor: theme.border }]}
                  >
                    <CheckIcon size={14} color={theme.muted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md },
  title: { flex: 1, fontSize: 16, fontFamily: FONT_SANS_SEMIBOLD },
  section: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },
  item: { borderWidth: 1, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  who: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sub: { fontSize: 13, marginTop: 3 },
  date: { fontSize: 11, marginTop: 3 },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
