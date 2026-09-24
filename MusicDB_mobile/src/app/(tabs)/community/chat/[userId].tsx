import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { TrashIcon } from '@/components/Icons';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { DmThread } from '@/api/types';

const STATE_HINT_KEYS = {
  none: 'chat.state.none',
  pending_outgoing: 'chat.state.pendingOutgoing',
  declined: 'chat.state.declined',
  pending_incoming: 'chat.state.pendingIncoming',
} as const;

// Один діалог. Не-другу перше повідомлення надходить як запит — далі пишемо після схвалення.
export default function ChatScreen() {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const params = useLocalSearchParams<{ userId: string; name?: string }>();
  const userId = Number(params.userId);
  const [thread, setThread] = useState<DmThread | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(() => {
    api.getDmThread(userId).then(setThread).catch(() => {});
  }, [api, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () =>
      subscribeRealtime((event, args) => {
        if ((event === 'dmReceived' || event === 'dmSent' || event === 'dmRequestsChanged') && args[0] === userId) load();
      }),
    [subscribeRealtime, load, userId],
  );

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api.sendMessage(userId, body);
      setText('');
    } catch {
      // 409/403 — запит ще не схвалено / відхилено: підказка нижче пояснить після перезавантаження
    } finally {
      setSending(false);
      load();
    }
  };

  // "Видалити чат у себе": у співрозмовника переписка лишається.
  const clearForMe = () =>
    Alert.alert(t('chat.clearBtn'), t('chat.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => api.clearChatForMe(userId).then(() => router.back()).catch(() => {}),
      },
    ]);

  const hintKey = thread ? STATE_HINT_KEYS[thread.state as keyof typeof STATE_HINT_KEYS] : undefined;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <Stack.Screen
        options={{
          title: params.name || t('chat.tab.dm'),
          headerRight: () =>
            thread?.messages.length ? (
              <TouchableOpacity onPress={clearForMe} hitSlop={10} accessibilityLabel={t('chat.clearBtn')}>
                <TrashIcon size={18} color={theme.red} />
              </TouchableOpacity>
            ) : null,
        }}
      />
      {!thread ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={thread.messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: SPACING.lg, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: 'center', marginTop: 30 }}>{t('chat.startConversation')}</Text>}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.isMine
                  ? { alignSelf: 'flex-end', backgroundColor: `${theme.accent}29`, borderColor: `${theme.accent}59` }
                  : { alignSelf: 'flex-start', backgroundColor: theme.surface2, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{item.body}</Text>
              <Text style={[styles.time, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>{item.createdAt}</Text>
            </View>
          )}
        />
      )}
      {hintKey ? (
        <Text style={[styles.hint, { color: theme.muted, borderColor: theme.border }]}>{t(hintKey)}</Text>
      ) : null}
      {thread?.canSend ? (
        <View style={[styles.inputRow, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
            placeholder={t('chat.inputPlaceholderMobile')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          <TouchableOpacity
            onPress={send}
            disabled={sending || !text.trim()}
            style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: sending || !text.trim() ? 0.5 : 1 }]}
          >
            <Text style={{ color: theme.onAccent, fontWeight: '700' }}>{t('chat.sendBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  time: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  hint: { fontSize: 12, lineHeight: 17, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: SPACING.sm, borderTopWidth: 1, paddingBottom: 130 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  sendBtn: { height: 44, borderRadius: RADIUS.md, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
