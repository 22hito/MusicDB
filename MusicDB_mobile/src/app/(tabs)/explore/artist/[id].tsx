import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, ErrorState, SectionTitle } from '@/components/UI';
import { SongListBlock } from '@/components/SongListBlock';
import { MicIcon } from '@/components/Icons';
import { FONT_MONO_REGULAR, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistDetail, Song } from '@/api/types';

// Сторінка виконавця: підписка (сповіщення про нові пісні), біо, повна дискографія.
export default function ArtistScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const artistId = Number(params.id);
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const player = usePlayer();
  const requireAuth = useRequireAuth();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([api.getArtist(artistId), api.getArtistSongs(artistId)]);
      setArtist(a);
      setSongs(s);
      setLoadError(false);
      setNotFound(false);
    } catch (e) {
      if ((e as { status?: number }).status === 404) setNotFound(true);
      else setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [api, artistId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = () =>
    requireAuth(async () => {
      if (!artist) return;
      setFollowing(true);
      try {
        if (artist.isFollowing) await api.unfollowArtist(artist.id);
        else await api.followArtist(artist.id);
        setArtist({
          ...artist,
          isFollowing: !artist.isFollowing,
          followerCount: artist.followerCount + (artist.isFollowing ? -1 : 1),
        });
      } finally {
        setFollowing(false);
      }
    });

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ title: artist?.name || params.name || '' }} />
      {loading && !artist ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      ) : notFound ? (
        <EmptyState icon="🎤" label={t('artist.notFound')} />
      ) : loadError || !artist ? (
        <ErrorState label={t('error.loadFailed')} onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.head, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {artist.imageUrl ? (
              <Image source={{ uri: artist.imageUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                <MicIcon size={30} color={theme.accent} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 22 }}>{artist.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_REGULAR, marginTop: 4 }}>
                {artist.songCount} {t('profile.songsWord')} · {artist.followerCount} {t('artist.followers')}
              </Text>
              <Button
                small
                label={artist.isFollowing ? t('artist.unfollowBtn') : t('artist.followBtn')}
                variant={artist.isFollowing ? 'outline' : 'primary'}
                loading={following}
                onPress={toggleFollow}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              />
            </View>
          </View>
          {artist.bio ? <Text style={{ color: theme.text, fontSize: 14, lineHeight: 21, marginBottom: SPACING.md }}>{artist.bio}</Text> : null}

          <SectionTitle
            label={t('artist.discography')}
            right={
              songs.length ? (
                <Button small variant="plain" label={`▶ ${t('wheel.playBtn')}`} onPress={() => player.playFrom(songs, songs[0].id)} />
              ) : undefined
            }
          />
          {songs.length ? <SongListBlock songs={songs} /> : <EmptyState icon="🎵" label={t('table.empty')} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  photo: { width: 84, height: 84, borderRadius: 42 },
});
