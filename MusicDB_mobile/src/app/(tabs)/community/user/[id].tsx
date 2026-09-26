import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Avatar, Badge, Button, EmptyState, ErrorState, SectionTitle, StatCard } from '@/components/UI';
import { SongListBlock } from '@/components/SongListBlock';
import { ChevronRightIcon, GlobeIcon } from '@/components/Icons';
import { FONT_MONO_REGULAR, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { FriendRequest, PublicProfile, Song } from '@/api/types';

// Публічний профіль іншого користувача: "музичний портрет", дія дружби, написати,
// публічні плейлисти (розгортаються тут же). Потребує входу — як і на сайті.
export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const userId = Number(params.id);
  const { theme, t } = useSettings();
  const { currentUser, subscribeRealtime, openLogin } = useApiBridge();
  const api = useMusicApi();
  const authed = !!currentUser?.authenticated;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [incomingReq, setIncomingReq] = useState<FriendRequest | null>(null);
  const [outgoingReq, setOutgoingReq] = useState<FriendRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openPlaylist, setOpenPlaylist] = useState<{ id: number; songs: Song[] } | null>(null);

  const load = useCallback(async () => {
    if (!authed) return setLoading(false);
    try {
      const p = await api.getUserProfile(userId);
      setProfile(p);
      // Щоб прийняти/скасувати запит, потрібен його requestId — він лише в списках запитів.
      if (p.relationshipStatus === 'pending_incoming')
        setIncomingReq((await api.getIncomingFriendRequests().catch(() => [])).find((r) => r.userId === userId) ?? null);
      if (p.relationshipStatus === 'pending_outgoing')
        setOutgoingReq((await api.getOutgoingFriendRequests().catch(() => [])).find((r) => r.userId === userId) ?? null);
      setLoadError(false);
      setNotFound(false);
    } catch (e) {
      if ((e as { status?: number }).status === 404) setNotFound(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [api, userId, authed]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () =>
      subscribeRealtime((event, args) => {
        if (event === 'friendsChanged' && Number(args[0]) === userId) load();
      }),
    [subscribeRealtime, load, userId],
  );

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      // перечитаємо стан нижче
    } finally {
      setBusy(false);
      load();
    }
  };

  const togglePlaylist = async (id: number) => {
    if (openPlaylist?.id === id) return setOpenPlaylist(null);
    const detail = await api.getPlaylist(id).catch(() => null);
    if (detail) setOpenPlaylist({ id, songs: detail.songs });
  };

  const title = profile?.displayName || params.name || '';

  if (!authed) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg, alignItems: 'center' }]}>
        <Stack.Screen options={{ title }} />
        <EmptyState icon="🔒" label={t('auth.loginRequiredGeneric')} />
        <Button label={t('auth.loginBtn')} small onPress={openLogin} />
      </SafeAreaView>
    );
  }

  const status = profile?.relationshipStatus;
  const friendAction =
    status === 'friends' ? (
      <Button
        small
        variant="outline"
        label={t('friends.unfriendBtn')}
        loading={busy}
        onPress={() =>
          Alert.alert(t('friends.unfriendConfirm', { name: title }), undefined, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('friends.unfriendBtn'), style: 'destructive', onPress: () => act(() => api.unfriend(userId)) },
          ])
        }
      />
    ) : status === 'pending_incoming' && incomingReq ? (
      <>
        <Button small label={t('friends.acceptBtn')} loading={busy} onPress={() => act(() => api.acceptFriendRequest(incomingReq.requestId))} />
        <Button small variant="outline" label={t('friends.rejectBtn')} onPress={() => act(() => api.cancelOrRejectFriendRequest(incomingReq.requestId))} />
      </>
    ) : status === 'pending_outgoing' ? (
      <Button
        small
        variant="outline"
        label={`${t('friends.pendingLabel')} · ${t('friends.cancelBtn')}`}
        loading={busy}
        onPress={() => outgoingReq && act(() => api.cancelOrRejectFriendRequest(outgoingReq.requestId))}
      />
    ) : status === 'none' ? (
      <Button small label={t('friends.addBtn')} loading={busy} onPress={() => act(() => api.sendFriendRequest(userId))} />
    ) : null;

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title }} />
      {loading && !profile ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      ) : notFound ? (
        <EmptyState icon="👤" label={t('profile.public.notFound')} />
      ) : loadError || !profile ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.head, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Avatar url={profile.avatarUrl} size={72} name={profile.displayName} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 20 }}>{profile.displayName}</Text>
              {profile.memberSince ? (
                <Text style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_REGULAR, marginTop: 3 }}>
                  {t('profile.public.memberSince')} {profile.memberSince}
                </Text>
              ) : null}
              {status === 'friends' ? <Text style={{ color: theme.green, fontSize: 12, marginTop: 3 }}>{t('friends.friendsBadge')}</Text> : null}
            </View>
          </View>
          {status !== 'self' ? (
            <View style={styles.actions}>
              {friendAction}
              <Button
                small
                variant="outline"
                label={t('profile.public.writeBtn')}
                onPress={() => router.push({ pathname: '/community/chat/[userId]', params: { userId: String(userId), name: profile.displayName } })}
              />
            </View>
          ) : null}

          <View style={styles.stats}>
            <StatCard label={t('profile.totalListened')} value={profile.totalListened} />
            <StatCard label={t('profile.favoritesCount')} value={profile.favoritesCount} />
            <StatCard label={t('profile.playlistsCount')} value={profile.publicPlaylists.length} />
          </View>

          {profile.topGenres.length ? (
            <>
              <SectionTitle label={t('profile.topGenres')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {profile.topGenres.map((g) => (
                  <Badge key={g} label={g} />
                ))}
              </View>
            </>
          ) : null}

          <SectionTitle label={t('profile.public.playlistsTitle')} />
          {profile.publicPlaylists.length === 0 ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t('profile.public.playlistsEmpty')}</Text>
          ) : (
            profile.publicPlaylists.map((p) => (
              <View key={p.id}>
                <TouchableOpacity
                  onPress={() => togglePlaylist(p.id)}
                  style={[styles.plRow, { backgroundColor: theme.surface, borderColor: openPlaylist?.id === p.id ? theme.accent : theme.border }]}
                >
                  <GlobeIcon size={16} color={theme.accent2} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600' }}>{p.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{p.songCount} {t('profile.songsWord')}</Text>
                  </View>
                  <View style={{ transform: [{ rotate: openPlaylist?.id === p.id ? '90deg' : '0deg' }] }}>
                    <ChevronRightIcon size={14} color={theme.muted} />
                  </View>
                </TouchableOpacity>
                {openPlaylist?.id === p.id && openPlaylist.songs.length ? <SongListBlock songs={openPlaylist.songs} /> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  stats: { flexDirection: 'row', gap: 10, marginTop: SPACING.lg },
  plRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.md, padding: 14, marginBottom: SPACING.sm },
});
