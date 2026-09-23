import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button } from '@/components/UI';
import { TrashIcon } from '@/components/Icons';
import { FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { ThreadDetail, UserRef } from '@/api/types';

// Гілка обговорення: перший допис + відповіді. Видаляти може автор або адмін.
export default function ThreadScreen() {
  const { theme, t } = useSettings();
  const { currentUser, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const requireAuth = useRequireAuth();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

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

  const canModerate = (author: UserRef | null) =>
    !!currentUser?.isAdmin || (!!author && author.userId === currentUser?.userId);

  const confirm = (message: string, action: () => void) =>
    Alert.alert(t('modal.deleteTitleGeneric'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: action },
    ]);

  const send = () =>
    requireAuth(async () => {
      if (!reply.trim()) return;
      setSending(true);
      try {
        await api.replyToThread(id, reply.trim());
        setReply('');
        load();
      } finally {
        setSending(false);
      }
    });

  if (!thread) return <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: t('chat.tab.threads') }} />
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.post, { backgroundColor: theme.surface, borderColor: `${theme.accent}66` }]}>
          <View style={styles.head}>
            <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 19, flex: 1 }}>{thread.title}</Text>
            {canModerate(thread.author) ? (
              <TouchableOpacity
                hitSlop={8}
                onPress={() => confirm(t('threads.confirmDeleteThread'), () => api.deleteThread(id).then(() => router.back()))}
              >
                <TrashIcon size={16} color={theme.red} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {thread.author?.displayName ?? t('threads.deletedUser')} · {thread.createdAt}
          </Text>
          <Text style={[styles.body, { color: theme.text }]}>{thread.body}</Text>
        </View>

        {thread.posts.map((p) => (
          <View key={p.id} style={[styles.post, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.head}>
              <Text style={[styles.meta, { color: theme.muted, flex: 1 }]}>
                {p.author?.displayName ?? t('threads.deletedUser')} · {p.createdAt}
              </Text>
              {canModerate(p.author) ? (
                <TouchableOpacity hitSlop={8} onPress={() => confirm(t('threads.confirmDeletePost'), () => api.deleteThreadPost(p.id).then(load))}>
                  <TrashIcon size={15} color={theme.red} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.body, { color: theme.text }]}>{p.body}</Text>
          </View>
        ))}

        <TextInput
          value={reply}
          onChangeText={setReply}
          multiline
          maxLength={10000}
          placeholder={t('threads.replyPlaceholder')}
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
        />
        <Button label={t('threads.replyBtn')} small loading={sending} disabled={!reply.trim()} onPress={send} style={{ alignSelf: 'flex-end' }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  post: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { fontSize: 12, marginTop: 4, marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  input: { minHeight: 90, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, fontSize: 15, textAlignVertical: 'top', marginTop: SPACING.md, marginBottom: SPACING.sm },
});
