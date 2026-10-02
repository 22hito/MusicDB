import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePlayer } from '@/player/PlayerContext';
import { Avatar } from '@/components/UI';
import { BellIcon, CloseIcon, SendIcon, TrashIcon } from '@/components/Icons';
import { openUserProfile } from '@/components/FriendsPanel';
import { formatFull, formatStamp } from '@/utils/time';
import { FONT_SANS_BOLD, FONT_SANS_MEDIUM, FONT_SANS_SEMIBOLD, FONT_SERIF_BOLD, PLAYER_BAR_HEIGHT, RADIUS, SPACING } from '@/constants/theme';
import type { ThreadDetail, ThreadPost, UserRef } from '@/api/types';

// Гілка обговорення: перший допис + відповіді. Кожному допису можна відповісти окремо —
// над відповіддю буде цитата, а автор отримає сповіщення. Видаляти може автор або адмін.
// ?post=<id> — прокрутити до допису (перехід зі сповіщення).
export default function ThreadScreen() {
  const { theme, t, lang } = useSettings();
  const { currentUser, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const requireAuth = useRequireAuth();
  const params = useLocalSearchParams<{ id: string; post?: string }>();
  const id = Number(params.id);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<ThreadPost | null>(null);
  const [sending, setSending] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(params.post ? Number(params.post) : null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const offsets = useRef(new Map<number, number>());
  const scrolledToParam = useRef(false);

  const load = useCallback(() => {
    api.getThread(id).then(setThread).catch(() => router.back());
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(
    () =>
      subscribeRealtime((event, args) => {
        if (event === 'threadsChanged' && args[0] === id) load();
      }),
    [subscribeRealtime, load, id],
  );
  // Підсвітка допису (зі сповіщення чи після «до цитати») — на 2 с.
  useEffect(() => {
    if (highlight == null) return;
    const timer = setTimeout(() => setHighlight(null), 2200);
    return () => clearTimeout(timer);
  }, [highlight]);

  const scrollToPost = (postId: number) => {
    const y = offsets.current.get(postId);
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setHighlight(postId);
  };

  const canModerate = (author: UserRef | null) => !!currentUser?.isAdmin || (!!author && author.userId === currentUser?.userId);
  const isMine = (author: UserRef | null) => !!author && author.userId === currentUser?.userId;

  const confirm = (message: string, action: () => void) =>
    Alert.alert(t('modal.deleteTitleGeneric'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: action },
    ]);

  const startReply = (p: ThreadPost) =>
    requireAuth(() => {
      setReplyTo(p);
      inputRef.current?.focus();
    });

  const send = () =>
    requireAuth(async () => {
      const body = reply.trim();
      if (!body) return;
      setSending(true);
      try {
        await api.replyToThread(id, body, replyTo?.id);
        setReply('');
        setReplyTo(null);
        load();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
      } catch {
        Alert.alert(t('msg.connectionError'));
      } finally {
        setSending(false);
      }
    });

  const toggleFollow = () =>
    requireAuth(async () => {
      if (!thread) return;
      const next = !thread.isFollowing;
      setThread({ ...thread, isFollowing: next });
      try {
        if (next) await api.followThread(id);
        else await api.unfollowThread(id);
      } catch {
        setThread((th) => (th ? { ...th, isFollowing: !next } : th));
      }
    });

  if (!thread) return <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />;

  const authorName = (u: UserRef | null) => u?.displayName ?? t('threads.deletedUser');
  const nameLink = (u: UserRef | null, accent = false) => (
    <Text
      onPress={u ? () => openUserProfile(u.userId, u.displayName) : undefined}
      numberOfLines={1}
      style={[styles.name, { color: accent ? theme.accent : theme.text }]}
    >
      {authorName(u)}
    </Text>
  );

  const post = (p: ThreadPost) => {
    const mine = isMine(p.author);
    const op = !!thread.author && p.author?.userId === thread.author.userId;
    return (
      <View
        key={p.id}
        onLayout={(e) => {
          offsets.current.set(p.id, e.nativeEvent.layout.y);
          if (!scrolledToParam.current && params.post && Number(params.post) === p.id) {
            scrolledToParam.current = true;
            setTimeout(() => scrollToPost(p.id), 120);
          }
        }}
        style={styles.postRow}
      >
        <Avatar url={p.author?.avatarUrl} name={authorName(p.author)} size={34} />
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? `${theme.accent}14` : theme.surface,
              borderColor: highlight === p.id ? theme.accent : mine ? `${theme.accent}40` : theme.border,
            },
          ]}
        >
          <View style={styles.metaRow}>
            {nameLink(p.author, mine)}
            {op ? (
              <View style={[styles.opBadge, { borderColor: `${theme.accent}66` }]}>
                <Text style={[styles.opText, { color: theme.accent }]}>{t('threads.authorBadge')}</Text>
              </View>
            ) : null}
            <Text onLongPress={() => Alert.alert(formatFull(p.createdAt))} style={[styles.time, { color: theme.muted }]}>
              {formatStamp(p.createdAt, lang)}
            </Text>
          </View>
          {p.replyTo ? (
            <Pressable
              onPress={() => scrollToPost(p.replyTo!.postId)}
              style={({ pressed }) => [styles.quote, { borderLeftColor: theme.accent, backgroundColor: `${theme.bg}99`, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text numberOfLines={1} style={[styles.quoteName, { color: theme.accent }]}>↪ {authorName(p.replyTo.author)}</Text>
              <Text numberOfLines={2} style={[styles.quoteText, { color: theme.text2 }]}>{p.replyTo.snippet}</Text>
            </Pressable>
          ) : null}
          <Text selectable style={[styles.body, { color: theme.text }]}>{p.body}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => startReply(p)} hitSlop={10} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
              <SendIcon size={13} color={theme.muted} />
              <Text style={[styles.actionText, { color: theme.muted }]}>{t('threads.replyBtn')}</Text>
            </Pressable>
            {canModerate(p.author) ? (
              <Pressable
                hitSlop={10}
                accessibilityLabel={t('common.delete')}
                onPress={() => confirm(t('threads.confirmDeletePost'), () => api.deleteThreadPost(p.id).then(load))}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
              >
                <TrashIcon size={13} color={theme.red} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const authed = !!currentUser?.authenticated;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('chat.tab.threads') }} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xl }} keyboardShouldPersistTaps="handled">
        {/* Перший допис — картка гілки. */}
        <View style={[styles.head, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.headAccent, { backgroundColor: theme.accent }]} />
          <Text style={[styles.title, { color: theme.text }]}>{thread.title}</Text>
          <View style={styles.headMeta}>
            <Avatar url={thread.author?.avatarUrl} name={authorName(thread.author)} size={28} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {nameLink(thread.author)}
              <Text style={[styles.time, { color: theme.muted, marginLeft: 0 }]}>{formatStamp(thread.createdAt, lang)}</Text>
            </View>
            {authed ? (
              <Pressable
                onPress={toggleFollow}
                accessibilityRole="switch"
                accessibilityState={{ checked: !!thread.isFollowing }}
                style={({ pressed }) => [
                  styles.follow,
                  {
                    borderColor: thread.isFollowing ? `${theme.accent}80` : theme.border,
                    backgroundColor: thread.isFollowing ? `${theme.accent}1a` : 'transparent',
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <BellIcon size={13} color={thread.isFollowing ? theme.accent : theme.muted} />
                <Text style={[styles.followText, { color: thread.isFollowing ? theme.accent : theme.text2 }]}>
                  {t(thread.isFollowing ? 'threads.following' : 'threads.follow')}
                </Text>
              </Pressable>
            ) : null}
            {canModerate(thread.author) ? (
              <Pressable
                hitSlop={10}
                accessibilityLabel={t('common.delete')}
                onPress={() => confirm(t('threads.confirmDeleteThread'), () => api.deleteThread(id).then(() => router.back()))}
                style={({ pressed }) => [styles.iconBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
              >
                <TrashIcon size={14} color={theme.red} />
              </Pressable>
            ) : null}
          </View>
          <Text selectable style={[styles.body, { color: theme.text, marginTop: SPACING.md }]}>{thread.body}</Text>
        </View>

        <Text style={[styles.section, { color: theme.muted }]}>
          {thread.posts.length ? `${t('threads.repliesTitle')} · ${thread.posts.length}` : t('threads.noReplies')}
        </Text>
        {thread.posts.map(post)}
      </ScrollView>

      {/* Поле відповіді закріплене внизу (над міні-плеєром), а не загублене в кінці гілки. */}
      {authed ? (
        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: player.isOpen ? PLAYER_BAR_HEIGHT + 18 : SPACING.md }]}>
          {replyTo ? (
            <View style={[styles.replyChip, { borderColor: `${theme.accent}59`, backgroundColor: `${theme.accent}14` }]}>
              <Text numberOfLines={1} style={{ flex: 1, color: theme.text2, fontSize: 12.5 }}>
                ↪ <Text style={{ color: theme.accent, fontFamily: FONT_SANS_SEMIBOLD }}>{authorName(replyTo.author)}</Text>: {replyTo.body}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel={t('common.cancel')}>
                <CloseIcon size={11} color={theme.muted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={10000}
              placeholder={replyTo ? t('notif.thread.replyTo').replace('{name}', authorName(replyTo.author)) : t('threads.replyPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
            />
            <Pressable
              onPress={send}
              disabled={!reply.trim() || sending}
              accessibilityLabel={t('threads.replyBtn')}
              style={({ pressed }) => [styles.sendBtn, { backgroundColor: theme.accent, opacity: !reply.trim() ? 0.45 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
            >
              {sending ? <ActivityIndicator color={theme.onAccent} /> : <SendIcon size={18} color={theme.onAccent} />}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => requireAuth(() => {})} style={[styles.loginHint, { borderTopColor: theme.border, backgroundColor: theme.surface, paddingBottom: player.isOpen ? PLAYER_BAR_HEIGHT + 18 : SPACING.md }]}>
          <Text style={{ color: theme.accent, fontFamily: FONT_SANS_MEDIUM, textAlign: 'center' }}>{t('threads.loginToReply')}</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, overflow: 'hidden' },
  headAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  title: { fontFamily: FONT_SERIF_BOLD, fontSize: 21, lineHeight: 27 },
  headMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SPACING.md },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 11, height: 32 },
  followText: { fontSize: 12.5, fontFamily: FONT_SANS_SEMIBOLD },
  iconBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', fontFamily: FONT_SANS_BOLD, marginTop: SPACING.xl, marginBottom: SPACING.md },
  postRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: SPACING.md },
  bubble: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 16, borderTopLeftRadius: 6, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 13.5, fontFamily: FONT_SANS_SEMIBOLD, flexShrink: 1 },
  opBadge: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 1 },
  opText: { fontSize: 10, fontFamily: FONT_SANS_BOLD, textTransform: 'uppercase', letterSpacing: 0.6 },
  time: { fontSize: 11.5, marginLeft: 'auto' },
  quote: { borderLeftWidth: 3, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 9, marginBottom: 6 },
  quoteName: { fontSize: 12, fontFamily: FONT_SANS_SEMIBOLD },
  quoteText: { fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  body: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { fontSize: 12.5, fontFamily: FONT_SANS_MEDIUM },
  composer: { borderTopWidth: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: 8 },
  replyChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 7 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 46, maxHeight: 130, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  loginHint: { borderTopWidth: 1, paddingTop: SPACING.md, paddingHorizontal: SPACING.lg },
});
