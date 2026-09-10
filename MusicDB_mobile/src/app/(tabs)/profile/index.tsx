import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { Badge, Button, EmptyState, Field, Heading, StatCard } from '@/components/UI';
import { SongRow } from '@/components/SongRow';
import { TrashIcon } from '@/components/Icons';
import { RADIUS, SPACING } from '@/constants/theme';
import type { Playlist, Profile, Song } from '@/api/types';

export default function ProfileScreen() {
  const { theme, t } = useSettings();
  const { currentUser, authChecked, openLogin, logout, refreshCurrentUser } = useApiBridge();
  const api = useMusicApi();
  const { favoriteIds, toggleFavorite, reload: reloadFavorites } = useFavorites();
  const player = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarValue, setAvatarValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const authenticated = !!currentUser?.authenticated;

  const loadAll = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const [p, favs, pls] = await Promise.all([
        api.getProfile(),
        api.getFavorites().catch(() => []),
        api.getPlaylists().catch(() => []),
      ]);
      setProfile(p);
      setDisplayName(p.displayName || '');
      setAvatarValue(p.avatarUrl || null);
      setFavorites(favs);
      setPlaylists(pls);
    } finally {
      setLoading(false);
    }
  }, [api, authenticated]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    setAvatarValue(`data:${mime};base64,${asset.base64}`);
  };

  const removeAvatar = () => setAvatarValue(null);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.updateProfile({ displayName: displayName.trim() || null, avatarUrl: avatarValue });
      setProfile(updated);
      await refreshCurrentUser();
    } finally {
      setSaving(false);
    }
  };

  const removeFavorite = async (musicId: number) => {
    await toggleFavorite(musicId);
    setFavorites((prev) => prev.filter((s) => s.id !== musicId));
    loadAll();
  };

  const createPlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    setCreatingPlaylist(true);
    try {
      await api.createPlaylist(name);
      setNewPlaylistOpen(false);
      setNewPlaylistName('');
      const pls = await api.getPlaylists();
      setPlaylists(pls);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const deletePlaylist = async (id: number) => {
    await api.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  if (!authChecked) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={styles.loginPrompt}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>👤</Text>
          <Text style={{ color: theme.text, fontSize: 16, lineHeight: 22, marginBottom: 20, textAlign: 'center' }}>
            {t('auth.loginRequiredGeneric')}
          </Text>
          <Button label={t('auth.loginBtn')} onPress={openLogin} />
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsLink} hitSlop={6}>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t('settings.change')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarSrc = avatarValue || currentUser?.picture || null;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading pre={t('profile.heading.pre')} accent={t('profile.heading.accent')} />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickAvatar}>
              {avatarSrc ? (
                <Image source={{ uri: avatarSrc }} style={[styles.avatar, { borderColor: theme.border }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarPh, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                {profile?.displayName || profile?.name || profile?.email}
              </Text>
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{profile?.email}</Text>
              {profile?.isAdmin ? (
                <View style={[styles.adminBadge, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: theme.onAccent, fontSize: 10, fontWeight: '800' }}>ADMIN</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={removeAvatar} hitSlop={6} style={styles.removeAvatarBtn}>
            <Text style={{ color: theme.accent, fontSize: 13 }}>{t('profile.avatarRemove')}</Text>
          </TouchableOpacity>

          <Field
            label={t('profile.displayName')}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('profile.displayName.placeholder')}
          />
          <Button label={t('profile.saveBtn')} onPress={saveProfile} loading={saving} small />
        </View>

        <View style={styles.statsRow}>
          <StatCard label={t('profile.totalListened')} value={profile?.totalListened ?? 0} />
          <StatCard label={t('profile.favoritesCount')} value={profile?.favoritesCount ?? 0} />
          <StatCard label={t('profile.playlistsCount')} value={profile?.playlistsCount ?? 0} />
        </View>

        {profile?.topGenres?.length ? (
          <View style={{ marginBottom: SPACING.xl }}>
            <Text style={{ color: theme.muted, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('profile.topGenres')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {profile.topGenres.map((g) => (
                <Badge key={g} label={g} />
              ))}
            </View>
          </View>
        ) : null}

        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
          {t('profile.favoritesTitle')}
        </Text>
        {favorites.length === 0 ? (
          <EmptyState icon="💔" label={t('profile.favoritesEmpty')} />
        ) : (
          <View style={[styles.listCard, { borderColor: theme.border }]}>
            {favorites.map((s) => (
              <SongRow
                key={s.id}
                song={s}
                isCurrent={player.current?.id === s.id}
                isPlaying={player.isPlaying}
                isFavorite={favoriteIds.has(s.id)}
                showFavorite
                showAddToPlaylist={false}
                onPlay={() => player.playFrom(favorites, s.id)}
                onToggleFavorite={() => removeFavorite(s.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{t('profile.playlistsTitle')}</Text>
          <TouchableOpacity onPress={() => setNewPlaylistOpen(true)} hitSlop={8} style={styles.newPlaylistBtn}>
            <Text style={{ color: theme.accent, fontSize: 14 }}>{t('profile.newPlaylistBtn')}</Text>
          </TouchableOpacity>
        </View>
        {playlists.length === 0 ? (
          <EmptyState icon="🎧" label={t('profile.playlistsEmpty')} />
        ) : (
          playlists.map((pl) => (
            <TouchableOpacity
              key={pl.id}
              onPress={() => router.push(`/profile/playlist/${pl.id}`)}
              style={[styles.playlistRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{pl.name}</Text>
                <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                  {pl.songCount} {t('profile.songsWord')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deletePlaylist(pl.id)} hitSlop={10} style={{ padding: 6, marginLeft: 6 }}>
                <TrashIcon size={17} color={theme.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        <Button label={t('auth.logout')} variant="outline" onPress={logout} style={{ marginTop: 26 }} />
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsLink} hitSlop={6}>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t('settings.change')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={newPlaylistOpen} transparent animationType="fade" onRequestClose={() => setNewPlaylistOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.newPlaylistBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 14 }}>
              {t('profile.newPlaylistBtn')}
            </Text>
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder={t('profile.newPlaylistPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
              <Button label={t('common.cancel')} variant="outline" small onPress={() => setNewPlaylistOpen(false)} />
              <Button label={t('common.create')} small loading={creatingPlaylist} disabled={!newPlaylistName.trim()} onPress={createPlaylist} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
  },
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 5,
  },
  removeAvatarBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  newPlaylistBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  settingsLink: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlaylistBox: {
    width: 340,
    maxWidth: '90%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
});
