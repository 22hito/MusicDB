import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { DownloadIcon, NoteIcon, PaperclipIcon, PlayIcon, QueueIcon, TrashIcon } from '@/components/Icons';
import { openUserProfile } from '@/components/FriendsPanel';
import { AudioPreview } from '@/components/AudioPreview';
import { ChatSongPicker, SongMini } from '@/components/ChatSongPicker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { DirectMessage, DmThread, PickedAudio, Song } from '@/api/types';

const STATE_HINT_KEYS = {
  none: 'chat.state.none',
  pending_outgoing: 'chat.state.pendingOutgoing',
  declined: 'chat.state.declined',
  pending_incoming: 'chat.state.pendingIncoming',
} as const;
const MAX_FILE = 20 * 1024 * 1024;
const fmtBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Картинка з повідомлення: пряме посилання беремо окремим запитом (Image не несе куку сесії).
function AttachmentImage({ messageId }: { messageId: number }) {
  const { theme } = useSettings();
  const api = useMusicApi();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    api.getAttachmentLink(messageId).then(setUrl).catch(() => {});
  }, [api, messageId]);
  return (
    <TouchableOpacity onPress={() => url && Linking.openURL(url)} disabled={!url}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// Один діалог. Не-другу перше повідомлення надходить як запит — далі пишемо після схвалення.
// Можна прикріпити файл (до 20 МБ) і пісню з каталогу — як на сайті.
export default function ChatScreen() {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const params = useLocalSearchParams<{ userId: string; name?: string }>();
  const userId = Number(params.userId);
  const [thread, setThread] = useState<DmThread | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<PickedAudio | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [picking, setPicking] = useState(false);
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

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_FILE) return Alert.alert(t('chat.fileTooBig'));
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream', size: a.size });
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !file && !song) return;
    setSending(true);
    try {
      if (file || song) await api.sendRichMessage(userId, body, song?.id ?? null, file);
      else await api.sendMessage(userId, body);
      setText('');
      setFile(null);
      setSong(null);
    } catch (e) {
      // 409/403 — запит ще не схвалено / відхилено: підказка нижче пояснить після перезавантаження
      if ((e as { status?: number }).status === 400 && file) Alert.alert(t('chat.fileRejected'));
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

  const openFile = (m: DirectMessage) => api.getAttachmentLink(m.id).then((u) => Linking.openURL(u)).catch(() => {});

  const renderAttachment = (m: DirectMessage) => {
    const a = m.attachment!;
    if (a.kind === 'image') return <AttachmentImage messageId={m.id} />;
    if (a.kind === 'audio')
      return (
        <View style={{ minWidth: 220 }}>
          <AudioPreview getUrl={() => api.getAttachmentLink(m.id)} />
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{a.name}</Text>
        </View>
      );
    return (
      <TouchableOpacity onPress={() => openFile(m)} style={[styles.file, { backgroundColor: theme.surface }]} accessibilityLabel={t('chat.openFile')}>
        <DownloadIcon size={18} color={theme.accent} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{a.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>{fmtBytes(a.size)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const hintKey = thread ? STATE_HINT_KEYS[thread.state as keyof typeof STATE_HINT_KEYS] : undefined;
  const canSendNow = !sending && (!!text.trim() || !!file || !!song);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <Stack.Screen
        options={{
          title: params.name || t('chat.tab.dm'),
          headerTitle: () => (
            <TouchableOpacity onPress={() => openUserProfile(Number(params.userId), params.name)} hitSlop={8}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 17, fontWeight: '600' }}>{params.name || t('chat.tab.dm')}</Text>
            </TouchableOpacity>
          ),
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
              {item.song ? (
                <View style={[styles.songCard, { backgroundColor: theme.surface }]}>
                  <SongMini
                    song={item.song}
                    right={
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => player.playFrom([item.song!], item.song!.id)} style={[styles.roundBtn, { borderColor: theme.border }]}>
                          <PlayIcon size={13} color={theme.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => player.addToQueue(item.song!)} style={[styles.roundBtn, { borderColor: theme.border }]}>
                          <QueueIcon size={14} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    }
                  />
                </View>
              ) : null}
              {item.attachment ? renderAttachment(item) : null}
              {item.body ? <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{item.body}</Text> : null}
              <Text style={[styles.time, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>{item.createdAt}</Text>
            </View>
          )}
        />
      )}
      {hintKey ? (
        <Text style={[styles.hint, { color: theme.muted, borderColor: theme.border }]}>{t(hintKey)}</Text>
      ) : null}
      {thread?.canSend ? (
        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          {song || file ? (
            <View style={styles.pendingRow}>
              {song ? (
                <View style={[styles.chip, { borderColor: `${theme.accent}59`, backgroundColor: `${theme.accent}1F` }]}>
                  <NoteIcon size={13} color={theme.accent} />
                  <Text numberOfLines={1} style={[styles.chipText, { color: theme.text }]}>{song.artist} — {song.title}</Text>
                  <TouchableOpacity onPress={() => setSong(null)} hitSlop={8}>
                    <Text style={{ color: theme.muted, fontSize: 16 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {file ? (
                <View style={[styles.chip, { borderColor: `${theme.accent}59`, backgroundColor: `${theme.accent}1F` }]}>
                  <PaperclipIcon size={13} color={theme.accent} />
                  <Text numberOfLines={1} style={[styles.chipText, { color: theme.text }]}>{file.name}{file.size ? ` · ${fmtBytes(file.size)}` : ''}</Text>
                  <TouchableOpacity onPress={() => setFile(null)} hitSlop={8}>
                    <Text style={{ color: theme.muted, fontSize: 16 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickFile} style={[styles.toolBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]} accessibilityLabel={t('chat.attachFile')}>
              <PaperclipIcon size={18} color={theme.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPicking(true)} style={[styles.toolBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]} accessibilityLabel={t('chat.shareSong')}>
              <NoteIcon size={18} color={theme.muted} />
            </TouchableOpacity>
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
              disabled={!canSendNow}
              style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: canSendNow ? 1 : 0.5 }]}
            >
              {sending ? <ActivityIndicator color={theme.onAccent} /> : <Text style={{ color: theme.onAccent, fontWeight: '700' }}>{t('chat.sendBtn')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <ChatSongPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(s) => {
          setSong(s);
          setPicking(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  time: { fontSize: 10, textAlign: 'right' },
  hint: { fontSize: 12, lineHeight: 17, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.md },
  composer: { borderTopWidth: 1, padding: SPACING.sm, paddingBottom: 130, gap: 8 },
  pendingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingLeft: 10, paddingRight: 8, paddingVertical: 4, maxWidth: '100%' },
  chipText: { fontSize: 12, flexShrink: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  toolBtn: { width: 40, height: 48, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  sendBtn: { height: 48, minWidth: 64, borderRadius: RADIUS.md, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  songCard: { borderRadius: 10, padding: 6, minWidth: 230 },
  roundBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: 230, height: 170, borderRadius: 10 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, minWidth: 210 },
});
