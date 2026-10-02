import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { DownloadIcon, NoteIcon, PaperclipIcon, PlayIcon, QueueIcon, TrashIcon } from '@/components/Icons';
import { openUserProfile } from '@/components/FriendsPanel';
import { AudioPreview } from '@/components/AudioPreview';
import { useAbsoluteUrl } from '@/components/ArtistAvatar';
import { ImageGalleryModal, openExternal, TextModal, VideoModal, type ViewerImage } from '@/components/AttachmentViewers';
import { ChatSongPicker, SongMini } from '@/components/ChatSongPicker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { DirectMessage, DmAttachment, DmThread, PickedAudio, Song } from '@/api/types';
import { formatStamp } from '@/utils/time';

const STATE_HINT_KEYS = {
  none: 'chat.state.none',
  pending_outgoing: 'chat.state.pendingOutgoing',
  declined: 'chat.state.declined',
  pending_incoming: 'chat.state.pendingIncoming',
} as const;
const MAX_FILE = 20 * 1024 * 1024;
const fmtBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Картинка з повідомлення: пряме посилання беремо окремим запитом (Image не несе куку сесії).
// Натиснути — переглядач фото просто в застосунку (галерея всіх фото розмови), а не браузер.
function AttachmentImage({ messageId, onOpen, onLink }: { messageId: number; onOpen: () => void; onLink: (id: number, url: string) => void }) {
  const { theme } = useSettings();
  const api = useMusicApi();
  const absUrl = useAbsoluteUrl();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    api
      .getAttachmentLink(messageId)
      .then((u) => {
        const abs = absUrl(u) ?? u;
        setUrl(abs);
        onLink(messageId, abs);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, messageId]);
  return (
    <Pressable onPress={onOpen} disabled={!url} accessibilityRole="imagebutton" style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}>
      {url ? (
        <ExpoImage source={{ uri: url }} style={styles.image} contentFit="cover" transition={150} recyclingKey={url} />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      )}
    </Pressable>
  );
}

const attExt = (name: string) => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]?.toUpperCase() ?? 'FILE';
type AttType = 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'file';
function attType(a: DmAttachment): AttType {
  if (a.kind !== 'file') return a.kind;
  const ext = attExt(a.name);
  if (ext === 'PDF' || a.contentType === 'application/pdf') return 'pdf';
  if (ext === 'TXT' || a.contentType === 'text/plain') return 'text';
  return 'file';
}

// Один діалог. Не-другу перше повідомлення надходить як запит — далі пишемо після схвалення.
// Можна прикріпити файл (до 20 МБ) і пісню з каталогу — як на сайті.
export default function ChatScreen() {
  const { theme, t, lang } = useSettings();
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

  // ─── Вкладення: кожен тип — так, як ним зручно користуватись ───
  const absUrl = useAbsoluteUrl();
  const link = (id: number, opts?: { download?: boolean; inline?: boolean }) => api.getAttachmentLink(id, opts).then((u) => absUrl(u) ?? u);
  const download = (id: number) => link(id, { download: true }).then(openExternal).catch(() => {});
  const imageLinks = useRef(new Map<number, string>());
  const [gallery, setGallery] = useState<{ images: ViewerImage[]; index: number } | null>(null);
  const [video, setVideo] = useState<{ uri: string; name: string; id: number } | null>(null);
  const [textFile, setTextFile] = useState<{ uri: string; name: string; id: number } | null>(null);

  const openGallery = async (msgId: number) => {
    const msgs = (thread?.messages ?? []).filter((x) => x.attachment && attType(x.attachment) === 'image');
    const urls = await Promise.all(msgs.map((x) => imageLinks.current.get(x.id) ?? link(x.id).catch(() => '')));
    const images = msgs.map((x, k) => ({ uri: urls[k], name: x.attachment!.name, download: () => download(x.id) })).filter((x) => x.uri);
    const index = Math.max(0, msgs.findIndex((x) => x.id === msgId));
    setGallery({ images, index: Math.min(index, images.length - 1) });
  };
  const openAttachment = (m: DirectMessage) => {
    const a = m.attachment!;
    const type = attType(a);
    if (type === 'video') link(m.id).then((uri) => setVideo({ uri, name: a.name, id: m.id })).catch(() => {});
    else if (type === 'text') link(m.id, { inline: true }).then((uri) => setTextFile({ uri, name: a.name, id: m.id })).catch(() => {});
    // PDF — системним переглядачем (у WebView на Android PDF не показується); решта — завантаженням.
    else if (type === 'pdf') link(m.id, { inline: true }).then(openExternal).catch(() => {});
    else download(m.id);
  };

  const fileCard = (m: DirectMessage, preview: boolean) => {
    const a = m.attachment!;
    const type = attType(a);
    return (
      <View style={[styles.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable onPress={() => openAttachment(m)} style={styles.fileMain} accessibilityRole="button" accessibilityLabel={`${a.name}, ${fmtBytes(a.size)}`}>
          <View style={[styles.fileType, { backgroundColor: `${theme.accent}22`, borderColor: `${theme.accent}55` }]}>
            {type === 'video' ? <PlayIcon size={15} color={theme.accent} /> : <Text style={[styles.fileExt, { color: theme.accent }]}>{attExt(a.name)}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{a.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 1 }}>
              {fmtBytes(a.size)}
              {preview ? ` · ${t(type === 'video' ? 'chat.watch' : 'chat.preview')}` : ''}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => download(m.id)} hitSlop={8} accessibilityLabel={t('player.download')} style={({ pressed }) => [styles.fileAct, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
          <DownloadIcon size={16} color={theme.text2} />
        </Pressable>
      </View>
    );
  };

  const renderAttachment = (m: DirectMessage) => {
    const a = m.attachment!;
    const type = attType(a);
    if (type === 'image')
      return <AttachmentImage messageId={m.id} onOpen={() => openGallery(m.id)} onLink={(id, u) => imageLinks.current.set(id, u)} />;
    if (type === 'audio')
      return (
        <View style={{ minWidth: 240, gap: 6 }}>
          <View style={styles.audioHead}>
            <NoteIcon size={14} color={theme.accent} />
            <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontWeight: '600', fontSize: 13 }}>{a.name.replace(/\.[a-z0-9]{1,5}$/i, '')}</Text>
            <Text style={{ color: theme.muted, fontSize: 11 }}>{fmtBytes(a.size)}</Text>
          </View>
          <AudioPreview getUrl={() => link(m.id)} getDownloadUrl={() => link(m.id, { download: true })} />
        </View>
      );
    return fileCard(m, type === 'video' || type === 'pdf' || type === 'text');
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
              <Text style={[styles.time, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>{formatStamp(item.createdAt, lang)}</Text>
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
      <ImageGalleryModal images={gallery?.images ?? []} index={gallery ? gallery.index : null} onClose={() => setGallery(null)} />
      <VideoModal uri={video?.uri ?? null} name={video?.name ?? ''} onClose={() => setVideo(null)} onDownload={video ? () => download(video.id) : undefined} />
      <TextModal uri={textFile?.uri ?? null} name={textFile?.name ?? ''} onClose={() => setTextFile(null)} onDownload={textFile ? () => download(textFile.id) : undefined} />
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
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 8, minWidth: 240 },
  fileMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileType: { width: 40, height: 46, borderRadius: 7, borderTopRightRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  fileExt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },
  fileAct: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  audioHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
