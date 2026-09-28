import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { NoteIcon } from './Icons';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

export const songThumb = (s?: Song | null) => (s?.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/mqdefault.jpg` : null);

// Рядок пісні з мініатюрою — для вибору пісні й карток пісень у чаті.
export function SongMini({ song, right }: { song: Song; right?: React.ReactNode }) {
  const { theme } = useSettings();
  const uri = songThumb(song);
  return (
    <View style={styles.row}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
          <NoteIcon size={14} color={theme.muted} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{song.artist}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13 }}>{song.title}</Text>
      </View>
      {right}
    </View>
  );
}

// Пісня в повідомлення: пошук по обох таблицях (як на сайті).
export function ChatSongPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (s: Song) => void }) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [all, setAll] = useState<Song[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQ('');
    if (!all) api.getSongs('all').then(setAll).catch(() => setAll([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const results = useMemo(() => {
    if (!all) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = words.length
      ? all.filter((s) => {
          const hay = `${s.artist} ${s.title} ${s.album ?? ''}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        })
      : [...all].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    return hits.slice(0, 40);
  }, [all, q]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{t('chat.songPickTitle')}</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder={t('chat.songSearch')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          {!all ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(s) => String(s.id)}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ color: theme.muted, padding: 10 }}>{t('chat.songNotFound')}</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => onPick(item)} style={styles.pick}>
                  <SongMini song={item} />
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
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 64, height: 36, borderRadius: 6 },
  pick: { paddingVertical: 6 },
});
