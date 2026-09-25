import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePlayer } from '@/player/PlayerContext';
import { Badge, Button, EmptyState, ErrorState, SectionTitle } from '@/components/UI';
import { SongListBlock } from '@/components/SongListBlock';
import { ArtistAvatar, useAbsoluteUrl } from '@/components/ArtistAvatar';
import { DiscIcon, NoteIcon, PlayIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, FONT_MONO_REGULAR, FONT_SANS_SEMIBOLD, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistDetail, PickedAudio, SimilarArtist, Song } from '@/api/types';

const thumb = (s?: Song) => (s?.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/mqdefault.jpg` : null);
const shortDuration = (d: string) => {
  const m = /^(\d+):(\d+):(\d+)/.exec(d || '');
  if (!m) return d || '';
  return +m[1] ? `${+m[1]}:${m[2]}:${m[3]}` : `${+m[2]}:${m[3]}`;
};
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Сторінка виконавця — як на сайті: шапка (фото/ініціали, статистика, жанри, дії),
// "Популярне", альбоми, "Про виконавця", схожі виконавці, дискографія. Опис і фото — адмін.
export default function ArtistScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const artistId = Number(params.id);
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const requireAuth = useRequireAuth();
  const absUrl = useAbsoluteUrl();

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [similar, setSimilar] = useState<SimilarArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([api.getArtist(artistId), api.getArtistSongs(artistId)]);
      setArtist(a);
      setSongs(s.slice().sort((x, y) => (y.release || '').localeCompare(x.release || '')));
      setLoadError(false);
      setNotFound(false);
      api.getSimilarArtists(artistId).then(setSimilar).catch(() => setSimilar([]));
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
        setArtist({ ...artist, isFollowing: !artist.isFollowing, followerCount: artist.followerCount + (artist.isFollowing ? -1 : 1) });
      } finally {
        setFollowing(false);
      }
    });

  const popular = useMemo(
    () => songs.slice().sort((x, y) => (y.playCount || 0) - (x.playCount || 0) || (y.avgRating || 0) - (x.avgRating || 0)).slice(0, 5),
    [songs],
  );
  const albums = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const s of songs) if (s.album) map.set(s.album, [...(map.get(s.album) || []), s]);
    return [...map.entries()]
      .map(([name, list]) => {
        const sorted = list.slice().sort((x, y) => (x.release || '').localeCompare(y.release || '') || x.title.localeCompare(y.title));
        return { name, songs: sorted, year: (sorted[0].release || '').slice(0, 4), cover: thumb(sorted.find((s) => s.youtubeVideoId)) };
      })
      .sort((x, y) => y.year.localeCompare(x.year));
  }, [songs]);
  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach((s) => s.genres.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g);
  }, [songs]);
  const plays = songs.reduce((sum, s) => sum + (s.playCount || 0), 0);
  const years = songs.map((s) => (s.release || '').slice(0, 4)).filter((y) => /^\d{4}$/.test(y) && y !== '0001').sort();
  const cover = absUrl(artist?.imageUrl) || thumb(songs.find((s) => s.youtubeVideoId));

  const play = (list: Song[], id?: number) => list.length && player.playFrom(list, id ?? list[0].id);

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
          {/* Шапка: розмитий фон з обкладинки, фото/ініціали, статистика, жанри, дії. */}
          <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {cover ? <Image source={{ uri: cover }} blurRadius={24} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} /> : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface, opacity: 0.55 }]} />
            <ArtistAvatar name={artist.name} imageUrl={artist.imageUrl} size={112} />
            <Text style={[styles.kicker, { color: theme.muted }]}>{t('artist.kicker')}</Text>
            <Text style={[styles.name, { color: theme.text }]}>{artist.name}</Text>
            <Text style={[styles.stats, { color: theme.muted }]}>
              {[
                `${artist.songCount} ${t('profile.songsWord')}`,
                albums.length ? `${albums.length} ${t('artist.albumsWord')}` : null,
                `${artist.followerCount} ${t('artist.followers')}`,
                plays ? `${plays} ${t('artist.listenersWord')}` : null,
                years.length ? (years[0] === years[years.length - 1] ? years[0] : `${years[0]}–${years[years.length - 1]}`) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {genres.length ? (
              <View style={styles.genres}>
                {genres.map((g) => (
                  <Badge key={g} label={g.replace(/alternative/gi, 'alt')} />
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              <Button small label={`▶ ${t('artist.playAll')}`} onPress={() => play(songs)} style={{ flex: 1 }} />
              <Button small variant="outline" label={t('artist.shuffle')} onPress={() => play(shuffled(songs))} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <Button
                small
                label={artist.isFollowing ? t('artist.unfollowBtn') : t('artist.followBtn')}
                variant={artist.isFollowing ? 'outline' : 'primary'}
                loading={following}
                onPress={toggleFollow}
                style={{ flex: 1 }}
              />
              {currentUser?.isAdmin ? <Button small variant="outline" label={t('artist.editBtn')} onPress={() => setEditOpen(true)} style={{ flex: 1 }} /> : null}
            </View>
          </View>

          {popular.length ? (
            <>
              <SectionTitle label={t('artist.popular')} />
              {popular.map((s, i) => {
                const th = thumb(s);
                return (
                  <TouchableOpacity key={s.id} onPress={() => play(popular, s.id)} style={styles.popRow}>
                    <Text style={[styles.popN, { color: theme.muted }]}>{i + 1}</Text>
                    <View style={[styles.popCover, { backgroundColor: theme.surface2 }]}>
                      {th ? <Image source={{ uri: th }} style={StyleSheet.absoluteFill} /> : <NoteIcon size={14} color={theme.muted} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: player.current?.id === s.id ? theme.accent : theme.text, fontFamily: FONT_SANS_SEMIBOLD }}>
                        {s.title}
                      </Text>
                      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{s.album || t('table.single')}</Text>
                    </View>
                    <Text style={[styles.popMeta, { color: theme.muted }]}>{shortDuration(s.duration)}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}

          {albums.length ? (
            <>
              <SectionTitle label={t('artist.albums')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                {albums.map((al) => (
                  <TouchableOpacity key={al.name} onPress={() => play(al.songs)} style={{ width: 128 }}>
                    <View style={[styles.albumCover, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                      {al.cover ? <Image source={{ uri: al.cover }} style={StyleSheet.absoluteFill} /> : <DiscIcon size={30} color={theme.muted} />}
                      <View style={[styles.albumPlay, { backgroundColor: theme.accent }]}>
                        <PlayIcon size={12} color={theme.onAccent} />
                      </View>
                    </View>
                    <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 13, marginTop: 6 }}>{al.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>
                      {al.year && al.year !== '0001' ? `${al.year} · ` : ''}
                      {al.songs.length} {t('profile.songsWord')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <SectionTitle label={t('artist.about')} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: artist.bio ? theme.text : theme.muted, fontSize: 14, lineHeight: 21, fontStyle: artist.bio ? 'normal' : 'italic' }}>
              {artist.bio || t(currentUser?.isAdmin ? 'artist.noBioAdmin' : 'artist.noBio')}
            </Text>
          </View>

          {similar.length ? (
            <>
              <SectionTitle label={t('artist.similar')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
                {similar.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => router.push({ pathname: '/explore/artist/[id]', params: { id: String(a.id), name: a.name } })}
                    style={{ width: 84, alignItems: 'center' }}
                  >
                    <ArtistAvatar name={a.name} imageUrl={a.imageUrl} size={64} />
                    <Text numberOfLines={2} style={{ color: theme.text, fontSize: 12, textAlign: 'center', marginTop: 6 }}>{a.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 10, fontFamily: FONT_MONO_REGULAR }}>{a.score}%</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <SectionTitle label={t('artist.discography')} />
          {songs.length ? <SongListBlock songs={songs} /> : <EmptyState icon="🎵" label={t('table.empty')} />}
        </ScrollView>
      )}
      {artist ? (
        <ArtistEditModal
          visible={editOpen}
          artist={artist}
          onClose={() => setEditOpen(false)}
          onSaved={(a) => {
            setArtist(a);
            setEditOpen(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

// Адмін: опис і фото виконавця.
function ArtistEditModal({ visible, artist, onClose, onSaved }: { visible: boolean; artist: ArtistDetail; onClose: () => void; onSaved: (a: ArtistDetail) => void }) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const [bio, setBio] = useState(artist.bio || '');
  const [photo, setPhoto] = useState<PickedAudio | null>(null);
  const [remove, setRemove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setBio(artist.bio || '');
    setPhoto(null);
    setRemove(false);
    setError(null);
  }, [visible, artist]);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (res.canceled || !res.assets.length) return;
    const a = res.assets[0];
    if (a.fileSize && a.fileSize > 5 * 1024 * 1024) return setError(t('artist.photoTooLarge'));
    const mime = a.mimeType || 'image/jpeg';
    setPhoto({ uri: a.uri, name: `artist.${mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'}`, mimeType: mime, size: a.fileSize });
    setRemove(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      let a = await api.updateArtistBio(artist.id, bio);
      if (photo) a = await api.setArtistImage(artist.id, photo);
      else if (remove) a = await api.deleteArtistImage(artist.id);
      onSaved(a);
    } catch (e) {
      setError(`${t('msg.connectionError')}${(e as { body?: string }).body ? `\n${(e as { body?: string }).body}` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const preview = photo ? photo.uri : remove ? null : artist.imageUrl;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.editBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 16, marginBottom: SPACING.md }}>{t('artist.editTitle')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACING.md }}>
            <ArtistAvatar name={artist.name} imageUrl={preview} size={72} />
            <View style={{ flex: 1, gap: 8 }}>
              <Button small variant="outline" label={t('artist.photoUpload')} onPress={pick} />
              {preview ? (
                <Button
                  small
                  variant="plain"
                  label={t('artist.photoRemove')}
                  onPress={() => {
                    setPhoto(null);
                    setRemove(true);
                  }}
                />
              ) : null}
            </View>
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 6, fontFamily: FONT_MONO_MEDIUM }}>{t('artist.about')}</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={5000}
            textAlignVertical="top"
            style={[styles.bioInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
          />
          {error ? <Text style={{ color: theme.red, fontSize: 12, marginTop: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
            <Button small variant="outline" label={t('common.cancel')} onPress={onClose} style={{ flex: 1 }} />
            <Button small label={t('artist.saveBtn')} loading={saving} onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  hero: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', overflow: 'hidden', marginBottom: SPACING.sm },
  kicker: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 12, fontFamily: FONT_SANS_SEMIBOLD },
  name: { fontFamily: FONT_SERIF_BOLD, fontSize: 26, textAlign: 'center', marginTop: 2 },
  stats: { fontSize: 12, textAlign: 'center', marginTop: 6, fontFamily: FONT_MONO_REGULAR },
  genres: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, alignSelf: 'stretch' },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  popN: { width: 16, textAlign: 'right', fontFamily: FONT_MONO_MEDIUM, fontSize: 12 },
  popCover: { width: 56, height: 32, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  popMeta: { fontSize: 11, fontFamily: FONT_MONO_REGULAR },
  albumCover: { width: 128, height: 128, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  albumPlay: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  editBox: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.lg },
  bioInput: { minHeight: 140, maxHeight: 260, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, fontSize: 14 },
});
