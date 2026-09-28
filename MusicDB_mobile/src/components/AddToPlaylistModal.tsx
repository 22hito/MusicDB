import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { SelectField } from './SelectField';
import { ShareSongModal } from './ShareSongModal';
import { ChatIcon, PlayIcon, QueueIcon } from './Icons';
import { usePlayer } from '@/player/PlayerContext';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Playlist, Song } from '@/api/types';

export function AddToPlaylistModal({
  visible,
  musicId,
  song,
  onClose,
  onAdded,
}: {
  visible: boolean;
  musicId: number | null;
  song?: Song | null; // є пісня — зверху "Грати наступною" / "Додати в чергу" (як на сайті)
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { theme, t, count } = useSettings();
  const player = usePlayer();
  const api = useMusicApi();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  // Плейлист — випадаючим списком, як на сайті; 'new' — створити новий (тоді з'являється поле назви).
  const [selected, setSelected] = useState<string>('new');
  const [sharing, setSharing] = useState<Song | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNewName('');
    setLoading(true);
    Promise.all([api.getPlaylists(), AsyncStorage.getItem('lastPlaylistId').catch(() => null)])
      .then(([list, last]) => {
        setPlaylists(list);
        setSelected(list.some((p) => String(p.id) === last) ? last! : list[0] ? String(list[0].id) : 'new');
      })
      .catch(() => {
        setPlaylists([]);
        setSelected('new');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const addTo = async (playlistId: number) => {
    if (!musicId) return;
    setBusy(true);
    try {
      await api.addSongToPlaylist(playlistId, musicId);
      AsyncStorage.setItem('lastPlaylistId', String(playlistId)).catch(() => {});
      onAdded?.();
      onClose();
    } catch {
      // no-op — модалка лишається відкритою, користувач може спробувати ще раз
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name || !musicId) return;
    setBusy(true);
    try {
      const pl = await api.createPlaylist(name);
      await api.addSongToPlaylist(pl.id, musicId);
      onAdded?.();
      onClose();
    } catch {
      // no-op
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ShareSongModal
      song={sharing}
      onClose={() => {
        setSharing(null);
        onClose();
      }}
    />
    <Modal visible={visible && !sharing} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
            {t('profile.addToPlaylistTitle')}
          </Text>

          {song ? (
            <View style={styles.queueRow}>
              <TouchableOpacity
                onPress={() => {
                  player.addToQueue(song, true);
                  onClose();
                }}
                style={[styles.queueBtn, { borderColor: theme.border }]}
              >
                <PlayIcon size={13} color={theme.accent} />
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13 }}>{t('queue.playNext')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  player.addToQueue(song);
                  onClose();
                }}
                style={[styles.queueBtn, { borderColor: theme.border }]}
              >
                <QueueIcon size={15} color={theme.accent} />
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13 }}>{t('queue.add')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {song ? (
            <TouchableOpacity onPress={() => setSharing(song)} style={[styles.queueBtn, styles.shareBtn, { borderColor: theme.border }]}>
              <ChatIcon size={15} color={theme.accent} />
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13 }}>{t('chat.sendToChat')}</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.label, { color: theme.muted }]}>{t('profile.playlistLabel')}</Text>
          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 14 }} />
          ) : (
            <SelectField<string>
              value={selected}
              options={[
                ...playlists.map((pl) => ({ value: String(pl.id), label: `${pl.name} — ${count('count.songs', pl.songCount)}` })),
                { value: 'new', label: `＋ ${t('profile.newPlaylistOption')}` },
              ]}
              onChange={setSelected}
              title={t('profile.playlistLabel')}
              searchable={playlists.length > 8}
              style={{ marginBottom: 14 }}
            />
          )}

          {selected === 'new' ? (
            <TextInput
              value={newName}
              onChangeText={setNewName}
              autoFocus={!loading && playlists.length > 0}
              placeholder={t('profile.newPlaylistPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
            />
          ) : null}

          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="outline" onPress={onClose} small />
            {selected === 'new' ? (
              <Button label={t('profile.createAndAddBtn')} onPress={createAndAdd} small loading={busy} disabled={!newName.trim()} />
            ) : (
              <Button label={t('profile.addBtn')} onPress={() => addTo(Number(selected))} small loading={busy} />
            )}
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 340,
    maxWidth: '90%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  queueRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  shareBtn: { flex: 0, marginBottom: 14 },
  queueBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 8 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
});
