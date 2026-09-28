import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { ArtistAvatar } from './ArtistAvatar';
import { ChevronRightIcon } from './Icons';
import { SongMini } from './ChatSongPicker';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

interface Target {
  userId: number;
  name: string;
  avatarUrl: string | null;
}

// «Надіслати в чат» (з вікна «Додати в плейлист»): кому — розмови й друзі; можна додати текст.
export function ShareSongModal({ song, onClose }: { song: Song | null; onClose: () => void }) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!song) return;
    setQ('');
    setNote('');
    setTargets(null);
    Promise.all([api.getConversations().catch(() => []), api.getFriends().catch(() => [])]).then(([convs, friends]) => {
      const byId = new Map<number, Target>();
      convs
        .filter((c) => c.state !== 'pending_outgoing' && c.state !== 'declined')
        .forEach((c) => byId.set(c.userId, { userId: c.userId, name: c.displayName, avatarUrl: c.avatarUrl }));
      friends.forEach((f) => {
        if (!byId.has(f.userId)) byId.set(f.userId, { userId: f.userId, name: f.displayName, avatarUrl: f.avatarUrl });
      });
      setTargets([...byId.values()]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  const send = async (target: Target) => {
    if (!song) return;
    setBusy(target.userId);
    try {
      await api.sendRichMessage(target.userId, note.trim(), song.id, null);
      onClose();
      Alert.alert(t('chat.shareSent', { name: target.name }));
    } catch (e) {
      const status = (e as { status?: number }).status;
      Alert.alert(status === 409 || status === 403 ? t('chat.state.pendingOutgoing') : t('msg.connectionError'));
    } finally {
      setBusy(null);
    }
  };

  const list = (targets ?? []).filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal visible={!!song} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{t('chat.shareTitle')}</Text>
          {song ? (
            <View style={[styles.preview, { backgroundColor: theme.surface2 }]}>
              <SongMini song={song} />
            </View>
          ) : null}
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={4000}
            placeholder={t('chat.shareNote')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('chat.shareTo')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          {!targets ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={list}
              keyExtractor={(p) => String(p.userId)}
              style={{ maxHeight: 300 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ color: theme.muted, padding: 10 }}>{t('chat.shareNoTargets')}</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => send(item)} disabled={busy !== null} style={styles.target}>
                  <ArtistAvatar name={item.name} imageUrl={item.avatarUrl} size={36} />
                  <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{item.name}</Text>
                  {busy === item.userId ? <ActivityIndicator color={theme.accent} /> : <ChevronRightIcon size={14} color={theme.muted} />}
                </TouchableOpacity>
              )}
            />
          )}
          <Button label={t('common.cancel')} variant="outline" small onPress={onClose} style={{ marginTop: SPACING.md, alignSelf: 'flex-end' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { width: 380, maxWidth: '92%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl },
  preview: { borderRadius: RADIUS.md, padding: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
