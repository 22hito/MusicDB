import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useFavorites } from '@/state/FavoritesContext';
import { usePlayer } from '@/player/PlayerContext';
import { Avatar, Badge, Button, EmptyState, ErrorState, Field, avatarColor } from '@/components/UI';
import { QueueRow, timeAgo } from '@/components/QueueModal';
import { SongRow } from '@/components/SongRow';
import { BugIcon, ChevronRightIcon, DiscIcon, EditIcon, GlobeIcon, HeadphonesIcon, HeartIcon, LockIcon, PlusIcon, SlidersIcon, TrashIcon, UsersIcon } from '@/components/Icons';
import { BugReportModal } from '@/components/BugReportModal';
import { FONT_SANS_SEMIBOLD, FONT_SERIF_BLACK, PLAYER_BAR_HEIGHT, RADIUS, SPACING } from '@/constants/theme';
import type { HistoryItem, Playlist, Profile, Song } from '@/api/types';

export default function ProfileScreen() {
  const { theme, t, lang } = useSettings();
  const { currentUser, authChecked, openLogin, logout, refreshCurrentUser } = useApiBridge();
  const api = useMusicApi();
  const { favoriteIds, toggleFavorite, reload: reloadFavorites } = useFavorites();
  const player = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarValue, setAvatarValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  // Редагування (фото, нікнейм) — лише після "Редагувати"; "Прослухано" розгортає історію.
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [favY, setFavY] = useState(0);
  const [playlistsY, setPlaylistsY] = useState(0);
  const scrollToY = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  const toggleHistory = () => {
    const open = !historyOpen;
    setHistoryOpen(open);
    if (open) api.getHistory(50).then(setHistory).catch(() => setHistory([]));
  };
  const cancelEdit = () => {
    setDisplayName(profile?.displayName || '');
    setAvatarValue(profile?.avatarUrl || null);
    setEditing(false);
  };

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
      setLoadError(false);
    } catch {
      setLoadError(true);
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
      setEditing(false);
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

  // Публічний плейлист бачать інші: у "Батл рояль" і в публічному профілі.
  const togglePublic = async (pl: Playlist) => {
    setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, isPublic: !pl.isPublic } : p)));
    try {
      await api.setPlaylistPublic(pl.id, !pl.isPublic);
    } catch {
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, isPublic: pl.isPublic } : p)));
    }
  };

  const deletePlaylist = async (id: number) => {
    await api.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  if (!authChecked) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
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

  if (loading && !profile) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (loadError && !profile) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ErrorState label={t('error.loadFailed')} onRetry={loadAll} />
      </SafeAreaView>
    );
  }

  const avatarSrc = avatarValue || currentUser?.picture || null;
  const label = profile?.displayName || profile?.name || profile?.email || '';

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {/* Шапка профілю — як на сайті: розмите фото/колір тлом, аватар, ім'я, жанри (натиснути —
            бібліотека з цим жанром), "Редагувати" (форма — лише за кнопкою), лічильники-кнопки. */}
        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {avatarSrc ? (
            <Image source={{ uri: avatarSrc }} style={styles.heroBg} blurRadius={40} />
          ) : (
            <View style={[styles.heroBg, { backgroundColor: avatarColor(label) }]} />
          )}
          <View style={[styles.heroFade, { backgroundColor: theme.surface }]} />
          <View style={styles.heroMain}>
            <TouchableOpacity disabled={!editing} onPress={pickAvatar} accessibilityLabel={t('profile.avatarHint')} style={[styles.avatarRing, { borderColor: `${theme.accent}88` }]}>
              {avatarSrc ? (
                <Image source={{ uri: avatarSrc }} style={styles.avatar} />
              ) : (
                <Avatar url={null} name={label} size={80} />
              )}
              {editing ? (
                <View style={[styles.avatarEdit, { backgroundColor: theme.accent }]}>
                  <EditIcon size={13} color={theme.onAccent} />
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroLabel, { color: theme.muted }]}>{t('profile.heroLabel')}</Text>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={[styles.heroName, { color: theme.text }]}>{label}</Text>
                {profile?.isAdmin ? (
                  <View style={[styles.adminBadge, { backgroundColor: theme.accent }]}>
                    <Text style={{ color: theme.onAccent, fontSize: 10, fontWeight: '800' }}>ADMIN</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{profile?.email}</Text>
            </View>
            <TouchableOpacity
              onPress={() => (editing ? cancelEdit() : setEditing(true))}
              hitSlop={8}
              accessibilityLabel={t('profile.editBtn')}
              style={[styles.editBtn, { borderColor: editing ? theme.accent : theme.border, backgroundColor: theme.surface2 }]}
            >
              <EditIcon size={15} color={editing ? theme.accent : theme.text} />
            </TouchableOpacity>
          </View>
          {profile?.topGenres?.length ? (
            <View style={styles.heroGenres}>
              {profile.topGenres.map((g) => (
                <TouchableOpacity key={g} onPress={() => router.push({ pathname: '/', params: { genre: g } })} hitSlop={4}>
                  <Badge small label={g} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {editing ? (
            <View style={[styles.editPanel, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
              <View style={styles.editAvatarRow}>
                <Button label={t('profile.changePhoto')} variant="outline" small onPress={pickAvatar} />
                {avatarValue ? (
                  <TouchableOpacity onPress={removeAvatar} hitSlop={6}>
                    <Text style={{ color: theme.accent, fontSize: 13 }}>{t('profile.avatarReset')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Field
                label={t('profile.displayName')}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('profile.displayName.placeholder')}
              />
              <View style={styles.editActions}>
                <Button label={t('common.cancel')} variant="outline" small onPress={cancelEdit} />
                <Button label={t('profile.saveBtn')} onPress={saveProfile} loading={saving} small />
              </View>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            {[
              { key: 'listened', icon: HeadphonesIcon, value: profile?.totalListened ?? 0, label: t('profile.totalListened'), onPress: toggleHistory, active: historyOpen },
              { key: 'favorites', icon: HeartIcon, value: profile?.favoritesCount ?? 0, label: t('profile.favoritesCount'), onPress: () => scrollToY(favY), active: false },
              { key: 'playlists', icon: DiscIcon, value: profile?.playlistsCount ?? 0, label: t('profile.playlistsCount'), onPress: () => scrollToY(playlistsY), active: false },
            ].map(({ key, icon: Icon, value, label: statLabel, onPress, active }) => (
              <TouchableOpacity
                key={key}
                onPress={onPress}
                style={[styles.stat, { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? `${theme.accent}1a` : theme.surface2 }]}
              >
                <View style={[styles.statIcon, { backgroundColor: `${theme.accent}1f`, borderColor: `${theme.accent}47` }]}>
                  <Icon size={16} color={theme.accent} />
                </View>
                <Text style={[styles.statValue, { color: theme.accent }]}>{value}</Text>
                <Text numberOfLines={1} style={[styles.statLabel, { color: theme.muted }]}>{statLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {historyOpen ? (
          <View style={{ marginBottom: SPACING.xl }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{t('queue.recent')}</Text>
              {history.length ? (
                <TouchableOpacity onPress={() => player.playFrom(history.map((h) => h.song), history[0].song.id)} hitSlop={8}>
                  <Text style={{ color: theme.accent, fontSize: 14 }}>{t('artist.playAll')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.historyCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              {history.length ? (
                history.map((h) => (
                  <QueueRow
                    key={h.song.id}
                    song={h.song}
                    meta={timeAgo(h.listenedAt, lang)}
                    current={player.current?.id === h.song.id}
                    onPress={() => player.playFrom(history.map((x) => x.song), h.song.id)}
                  >
                    <TouchableOpacity onPress={() => player.addToQueue(h.song)} hitSlop={8} style={{ padding: 6 }}>
                      <PlusIcon size={16} color={theme.muted} />
                    </TouchableOpacity>
                  </QueueRow>
                ))
              ) : (
                <Text style={{ color: theme.muted, fontSize: 13, padding: 8 }}>{t('queue.recentEmpty')}</Text>
              )}
            </View>
          </View>
        ) : null}

        <View onLayout={(e) => setFavY(e.nativeEvent.layout.y)} />
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

        <View style={styles.sectionHeaderRow} onLayout={(e) => setPlaylistsY(e.nativeEvent.layout.y)}>
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
              <TouchableOpacity
                onPress={() => togglePublic(pl)}
                hitSlop={6}
                style={[styles.publicChip, { borderColor: pl.isPublic ? theme.accent2 : theme.border }]}
              >
                {pl.isPublic ? <GlobeIcon size={12} color={theme.accent2} /> : <LockIcon size={12} color={theme.muted} />}
                <Text style={{ color: pl.isPublic ? theme.accent2 : theme.muted, fontSize: 11 }}>
                  {pl.isPublic ? t('battle.publicBadge') : t('battle.privateBadge')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePlaylist(pl.id)} hitSlop={10} style={{ padding: 6, marginLeft: 6 }}>
                <TrashIcon size={17} color={theme.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {playlists.length ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{t('profile.publicToggleHint')}</Text> : null}

        <View style={{ marginTop: 26, gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/community', params: { tab: 'friends' } })}
            style={[styles.linkRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <UsersIcon size={17} color={theme.accent} />
            <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{t('nav.friends')}</Text>
            <ChevronRightIcon size={14} color={theme.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBugOpen(true)} style={[styles.linkRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <BugIcon size={17} color={theme.accent} />
            <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{t('bugs.menu')}</Text>
            <ChevronRightIcon size={14} color={theme.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={[styles.linkRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <SlidersIcon size={17} color={theme.accent} />
            <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>{t('settings.change')}</Text>
            <ChevronRightIcon size={14} color={theme.muted} />
          </TouchableOpacity>
        </View>

        <Button label={t('auth.logout')} variant="outline" onPress={logout} style={{ marginTop: 26 }} />
        <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 18 }}>N'Owl {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>

      <BugReportModal visible={bugOpen} onClose={() => setBugOpen(false)} />

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
  // Запас під плаваючий міні-плеєр — щоб нижні кнопки не ховались під ним.
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: PLAYER_BAR_HEIGHT + 60 },
  hero: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  heroBg: { position: 'absolute', top: -30, left: -30, right: -30, height: 220, opacity: 0.3 },
  heroFade: { position: 'absolute', top: 120, left: 0, right: 0, bottom: 0, opacity: 0.85 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACING.lg, paddingBottom: SPACING.sm },
  avatarRing: { borderWidth: 3, borderRadius: 46, padding: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: FONT_SANS_SEMIBOLD },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  heroName: { fontSize: 24, lineHeight: 30, fontFamily: FONT_SERIF_BLACK, flexShrink: 1 },
  adminBadge: { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  editBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  heroGenres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  editPanel: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  editAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACING.md },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: -6 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.md },
  stat: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: RADIUS.md, padding: 10, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 22, lineHeight: 26, fontFamily: FONT_SERIF_BLACK },
  statLabel: { fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: FONT_SANS_SEMIBOLD },
  historyCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 6 },
  publicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  newPlaylistBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  listCard: {
    marginBottom: SPACING.xl,
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
    minHeight: 48,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
});
