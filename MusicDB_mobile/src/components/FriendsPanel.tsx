import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Avatar, Button, EmptyState, SectionTitle } from './UI';
import { ChatIcon } from './Icons';
import { RADIUS, SPACING } from '@/constants/theme';
import type { FriendRequest, PublicUser, UserSearchResult } from '@/api/types';

export function openUserProfile(userId: number, name?: string) {
  router.push({ pathname: '/community/user/[id]', params: { id: String(userId), name: name ?? '' } });
}

// Вкладка "Друзі" у "Спілкуванні": пошук людей, вхідні/надіслані запити, список друзів.
export function FriendsPanel({ onChanged }: { onChanged?: () => void }) {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const [f, i, o] = await Promise.all([
      api.getFriends().catch(() => []),
      api.getIncomingFriendRequests().catch(() => []),
      api.getOutgoingFriendRequests().catch(() => []),
    ]);
    setFriends(f);
    setIncoming(i);
    setOutgoing(o);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(
    async (query: string) => {
      const my = ++seq.current;
      if (query.trim().length < 2) return setResults(null);
      const r = await api.searchUsers(query.trim(), 20).catch(() => []);
      if (my === seq.current) setResults(r);
    },
    [api],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(q), 300);
    return () => clearTimeout(timer);
  }, [q, search]);

  useEffect(
    () =>
      subscribeRealtime((event) => {
        if (event === 'friendsChanged') {
          load();
          if (q.trim().length >= 2) search(q);
        }
      }),
    [subscribeRealtime, load, search, q],
  );

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      // стан перечитаємо нижче
    } finally {
      setBusy(null);
      await load();
      if (q.trim().length >= 2) search(q);
      onChanged?.();
    }
  };

  const unfriend = (u: { userId: number; displayName: string }) =>
    Alert.alert(t('friends.unfriendConfirm', { name: u.displayName }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('friends.unfriendBtn'), style: 'destructive', onPress: () => act(`u${u.userId}`, () => api.unfriend(u.userId)) },
    ]);

  // Кнопка дії для рядка пошуку — залежить від стосунку, як _friendActionButtonHtml на сайті.
  const searchAction = (u: UserSearchResult) => {
    const key = `s${u.userId}`;
    switch (u.relationshipStatus) {
      case 'friends':
        return <Text style={{ color: theme.green, fontSize: 12 }}>{t('friends.friendsBadge')}</Text>;
      case 'pending_outgoing':
        return <Text style={{ color: theme.muted, fontSize: 12 }}>{t('friends.pendingLabel')}</Text>;
      case 'pending_incoming': {
        const req = incoming.find((r) => r.userId === u.userId);
        return req ? (
          <Button small label={t('friends.acceptBtn')} loading={busy === key} onPress={() => act(key, () => api.acceptFriendRequest(req.requestId))} />
        ) : null;
      }
      default:
        return <Button small label={t('friends.addBtn')} loading={busy === key} onPress={() => act(key, () => api.sendFriendRequest(u.userId))} />;
    }
  };

  const row = (key: string, u: { userId: number; displayName: string; avatarUrl: string | null }, sub: string | null, right: React.ReactNode) => (
    <View key={key} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity style={styles.who} onPress={() => openUserProfile(u.userId, u.displayName)}>
        <Avatar url={u.avatarUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700' }}>{u.displayName}</Text>
          {sub ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>{right}</View>
    </View>
  );

  return (
    <View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('friends.searchPlaceholder')}
        placeholderTextColor={theme.muted}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />
      {results ? (
        results.length ? (
          results.map((u) => row(`s${u.userId}`, u, null, searchAction(u)))
        ) : (
          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: SPACING.md }}>{t('friends.searchEmpty')}</Text>
        )
      ) : null}

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <>
          {incoming.length ? <SectionTitle label={`${t('friends.incoming')} (${incoming.length})`} /> : null}
          {incoming.map((r) =>
            row(
              `i${r.requestId}`,
              r,
              t('friends.incomingRequestLabel'),
              <>
                <Button small label={t('friends.acceptBtn')} loading={busy === `a${r.requestId}`} onPress={() => act(`a${r.requestId}`, () => api.acceptFriendRequest(r.requestId))} />
                <Button small variant="outline" label={t('friends.rejectBtn')} onPress={() => act(`r${r.requestId}`, () => api.cancelOrRejectFriendRequest(r.requestId))} />
              </>,
            ),
          )}

          {outgoing.length ? <SectionTitle label={t('friends.outgoing')} /> : null}
          {outgoing.map((r) =>
            row(
              `o${r.requestId}`,
              r,
              t('friends.pendingLabel'),
              <Button small variant="outline" label={t('friends.cancelBtn')} onPress={() => act(`c${r.requestId}`, () => api.cancelOrRejectFriendRequest(r.requestId))} />,
            ),
          )}

          <SectionTitle label={`${t('friends.myFriends')}${friends.length ? ` (${friends.length})` : ''}`} />
          {friends.length === 0 ? (
            <EmptyState icon="🤝" label={t('friends.friendsEmpty')} />
          ) : (
            friends.map((f) =>
              row(
                `f${f.userId}`,
                f,
                null,
                <>
                  <TouchableOpacity
                    hitSlop={8}
                    style={[styles.iconBtn, { borderColor: theme.border }]}
                    onPress={() => router.push({ pathname: '/community/chat/[userId]', params: { userId: String(f.userId), name: f.displayName } })}
                  >
                    <ChatIcon size={16} color={theme.accent} />
                  </TouchableOpacity>
                  <Button small variant="plain" label={t('friends.unfriendBtn')} loading={busy === `u${f.userId}`} onPress={() => unfriend(f)} />
                </>,
              ),
            )
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 160 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  iconBtn: { width: 40, height: 40, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: SPACING.md },
});
