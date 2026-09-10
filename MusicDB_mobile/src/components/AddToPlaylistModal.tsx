import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Playlist } from '@/api/types';

export function AddToPlaylistModal({
  visible,
  musicId,
  onClose,
  onAdded,
}: {
  visible: boolean;
  musicId: number | null;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNewName('');
    setLoading(true);
    api
      .getPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const addTo = async (playlistId: number) => {
    if (!musicId) return;
    setBusy(true);
    try {
      await api.addSongToPlaylist(playlistId, musicId);
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
            {t('profile.addToPlaylistTitle')}
          </Text>

          <ScrollView style={{ maxHeight: 240, marginBottom: 14 }} showsVerticalScrollIndicator={false}>
            {!loading && playlists.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: 14 }}>{t('profile.playlistsEmpty')}</Text>
            ) : null}
            {playlists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                disabled={busy}
                onPress={() => addTo(pl.id)}
                style={[styles.playlistRow, { borderColor: theme.border }]}
              >
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, flex: 1, marginRight: 8 }}>
                  {pl.name}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{pl.songCount}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('profile.newPlaylistPlaceholder')}
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text },
            ]}
          />

          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="outline" onPress={onClose} small />
            <Button label={t('profile.createAndAddBtn')} onPress={createAndAdd} small loading={busy} disabled={!newName.trim()} />
          </View>
        </View>
      </View>
    </Modal>
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
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
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
