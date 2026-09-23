import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button, EmptyState, Heading, SegmentedPicker } from '@/components/UI';
import { ChatIcon, PersonIcon } from '@/components/Icons';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { Conversation, DmRequest, ThreadSummary } from '@/api/types';

type Tab = 'dm' | 'requests' | 'threads';

// "Спілкування": особисті повідомлення (друзям — вільно, іншим — через запит),
// вхідні запити на листування і гілки обговорень ком'юніті — як сторінка чату на сайті.
export default function CommunityScreen() {
  const { theme, t } = useSettings();
  const { currentUser, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const requireAuth = useRequireAuth();
  const authed = !!currentUser?.authenticated;

  const [tab, setTab] = useState<Tab>('threads');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<DmRequest[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      if (tab === 'threads') setThreads(await api.getThreads(search.trim()));
      else if (authed && tab === 'dm') setConversations(await api.getConversations());
      else if (authed && tab === 'requests') setRequests(await api.getDmRequests());
      if (authed) api.getDmRequests().then(setRequests).catch(() => {});
    } catch {
      // лишаємо попередні дані
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, tab, authed, search]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(load, tab === 'threads' ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, tab]);

  // Повернулись з діалогу/гілки — оновити лічильники й списки.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(
    () =>
      subscribeRealtime((event) => {
        if (event === 'dmReceived' || event === 'dmSent' || event === 'dmRequestsChanged' || event === 'threadsChanged') load();
      }),
    [subscribeRealtime, load],
  );

  const respond = async (userId: number, accept: boolean) => {
    await api.respondDmRequest(userId, accept).catch(() => {});
    if (accept) router.push({ pathname: '/community/chat/[userId]', params: { userId: String(userId) } });
    load();
  };

  const createThread = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      const th = await api.createThread(newTitle.trim(), newBody.trim());
      setNewTitle('');
      setNewBody('');
      setNewOpen(false);
      router.push({ pathname: '/community/thread/[id]', params: { id: String(th.id) } });
    } finally {
      setCreating(false);
    }
  };

  const Avatar = ({ url }: { url: string | null }) =>
    url ? (
      <Image source={{ uri: url }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
        <PersonIcon size={16} color={theme.muted} />
      </View>
    );

  const tabs: { value: Tab; label: string }[] = [
    { value: 'threads', label: t('chat.tab.threads') },
    { value: 'dm', label: t('chat.tab.dm') },
    { value: 'requests', label: requests.length ? `${t('chat.tab.requests')} (${requests.length})` : t('chat.tab.requests') },
  ];

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accent} />}
      >
        <Heading pre={t('chat.heading.pre')} accent={t('chat.heading.accent')} />
        <View style={{ marginBottom: SPACING.lg }}>
          <SegmentedPicker<Tab> options={tabs} value={tab} onChange={setTab} />
        </View>

        {tab !== 'threads' && !authed ? (
          <View style={{ alignItems: 'center' }}>
            <EmptyState icon="🔒" label={t('chat.loginHint')} />
            <Button label={t('auth.loginBtn')} small onPress={() => requireAuth(() => {})} />
          </View>
        ) : loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
        ) : tab === 'dm' ? (
          <>
            <Text style={[styles.hint, { color: theme.muted }]}>{t('chat.newHintMobile')}</Text>
            {conversations.length === 0 ? (
              <EmptyState icon="💬" label={t('chat.noConversations')} />
            ) : (
              conversations.map((c) => (
                <TouchableOpacity
                  key={c.userId}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => router.push({ pathname: '/community/chat/[userId]', params: { userId: String(c.userId), name: c.displayName } })}
                >
                  <Avatar url={c.avatarUrl} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.rowBetween}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', flexShrink: 1 }}>{c.displayName}</Text>
                      {c.unreadCount ? (
                        <View style={[styles.count, { backgroundColor: theme.accent }]}>
                          <Text style={{ color: theme.onAccent, fontSize: 11, fontWeight: '700' }}>{c.unreadCount}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                      {c.state === 'pending_outgoing' ? `[${t('chat.pendingLabel')}] ` : ''}
                      {c.lastFromMe ? `${t('chat.you')}: ` : ''}
                      {c.lastMessage}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : tab === 'requests' ? (
          <>
            <Text style={[styles.hint, { color: theme.muted }]}>{t('chat.requestsHint')}</Text>
            {requests.length === 0 ? (
              <EmptyState icon="📭" label={t('chat.requestsEmpty')} />
            ) : (
              requests.map((r) => (
                <View key={r.userId} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, flexWrap: 'wrap' }]}>
                  <Avatar url={r.avatarUrl} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{r.displayName}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>{r.createdAt}</Text>
                    <Text style={{ color: theme.text, fontSize: 14, marginTop: 6 }}>{r.preview}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Button label={t('chat.acceptRequest')} small onPress={() => respond(r.userId, true)} />
                    <Button label={t('chat.declineRequest')} variant="outline" small onPress={() => respond(r.userId, false)} />
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('threads.searchPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            />
            <Button
              label={t('threads.newBtn')}
              small
              style={{ alignSelf: 'flex-start', marginBottom: SPACING.md }}
              onPress={() => requireAuth(() => setNewOpen((o) => !o))}
            />
            {newOpen ? (
              <View style={[styles.newThread, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={200}
                  placeholder={t('threads.titleLabel')}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={newBody}
                  onChangeText={setNewBody}
                  multiline
                  maxLength={10000}
                  placeholder={t('threads.bodyLabel')}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, styles.multiline, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
                />
                <Button label={t('threads.createBtn')} small loading={creating} disabled={!newTitle.trim() || !newBody.trim()} onPress={createThread} />
              </View>
            ) : null}
            {threads.length === 0 ? (
              <EmptyState icon="🗨️" label={t('threads.empty')} />
            ) : (
              threads.map((th) => (
                <TouchableOpacity
                  key={th.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => router.push({ pathname: '/community/thread/[id]', params: { id: String(th.id) } })}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{th.title}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
                      {t('threads.by')} {th.author?.displayName ?? t('threads.deletedUser')} · {th.lastPostAt}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ChatIcon size={14} color={theme.muted} />
                    <Text style={{ color: theme.muted, fontFamily: FONT_MONO_REGULAR }}>{th.postCount}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 120 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: SPACING.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  count: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  requestActions: { flexDirection: 'row', gap: 8, width: '100%', justifyContent: 'flex-end', marginTop: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: SPACING.md },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  newThread: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg },
});
