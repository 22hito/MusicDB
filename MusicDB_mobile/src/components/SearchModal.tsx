import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { ChatIcon, CloseIcon, PersonIcon, PlayIcon, SearchIcon } from './Icons';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { ArtistSummary, Song, UserSearchResult } from '@/api/types';

// Глобальний пошук, як у навбарі сайту: пісні (обидві таблиці), виконавці, люди.
export function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [artistSongs, setArtistSongs] = useState<{ id: number; songs: Song[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  // Пісні фільтруємо локально (як сайт) — підвантажуємо обидві таблиці при відкритті.
  useEffect(() => {
    if (!visible) return;
    api.getSongs('all').then(setAllSongs).catch(() => {});
  }, [visible, api]);

  useEffect(() => {
    const query = q.trim();
    setArtistSongs(null);
    if (query.length < 2) {
      setSongs([]);
      setArtists([]);
      setUsers([]);
      return;
    }
    const ql = query.toLowerCase();
    setSongs(
      allSongs
        .filter((s) => s.title.toLowerCase().includes(ql) || s.artist.toLowerCase().includes(ql) || (s.album || '').toLowerCase().includes(ql))
        .slice(0, 8),
    );
    const my = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const [a, u] = await Promise.all([
        api.searchArtists(query).catch(() => []),
        currentUser?.authenticated ? api.searchUsers(query).catch(() => []) : Promise.resolve([]),
      ]);
      if (my !== seq.current) return;
      setArtists(a.slice(0, 5));
      setUsers(u);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, allSongs, api, currentUser]);

  const close = () => {
    setQ('');
    onClose();
  };

  const openArtist = async (id: number) => {
    if (artistSongs?.id === id) return setArtistSongs(null);
    setArtistSongs({ id, songs: await api.getArtistSongs(id).catch(() => []) });
  };

  const section = (title: string) => <Text style={[styles.section, { color: theme.muted }]}>{title}</Text>;
  const row = (key: string | number, icon: React.ReactNode, title: string, sub: string | null, onPress: () => void, badge?: string) => (
    <TouchableOpacity key={key} onPress={onPress} style={[styles.row, { borderColor: theme.border }]}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '600' }}>{title}</Text>
        {sub ? <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{sub}</Text> : null}
      </View>
      {badge ? <Text style={{ color: theme.accent, fontSize: 11, fontFamily: FONT_MONO_REGULAR }}>{badge}</Text> : null}
    </TouchableOpacity>
  );

  const nothing = q.trim().length >= 2 && !loading && !songs.length && !artists.length && !users.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + SPACING.sm }}>
        <View style={[styles.bar, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <SearchIcon size={16} color={theme.muted} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('navSearch.placeholder')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text }]}
          />
          <TouchableOpacity onPress={close} hitSlop={10}>
            <CloseIcon size={15} color={theme.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {songs.length ? section(t('navSearch.songs')) : null}
          {songs.map((s) =>
            row(`s${s.id}`, <PlayIcon size={14} color={theme.accent} />, s.title, s.artist, () => {
              player.playFrom(songs, s.id);
              close();
            }, s.source === 'community' ? t('home.source.community') : undefined),
          )}
          {artists.length ? section(t('navSearch.artists')) : null}
          {artists.map((a) => (
            <View key={`a${a.id}`}>
              {row(a.id, <PersonIcon size={15} color={theme.muted} />, a.name, `${a.songCount} ${t('profile.songsWord')}`, () => openArtist(a.id))}
              {artistSongs?.id === a.id
                ? artistSongs.songs.map((s) =>
                    row(`as${s.id}`, <View style={{ width: 14 }} />, s.title, s.album, () => {
                      player.playFrom(artistSongs.songs, s.id);
                      close();
                    }),
                  )
                : null}
            </View>
          ))}
          {users.length ? section(t('navSearch.users')) : null}
          {users.map((u) =>
            row(
              `u${u.userId}`,
              u.avatarUrl ? <Image source={{ uri: u.avatarUrl }} style={styles.avatar} /> : <PersonIcon size={16} color={theme.muted} />,
              u.displayName,
              t('chat.writeBtn'),
              () => {
                close();
                router.push({ pathname: '/community/chat/[userId]', params: { userId: String(u.userId), name: u.displayName } });
              },
            ),
          )}
          {loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 16 }} /> : null}
          {nothing ? (
            <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 20 }}>
              {t('navSearch.empty')}
              {currentUser?.authenticated ? '' : `\n${t('navSearch.loginForUsers')}`}
            </Text>
          ) : null}
          {!currentUser?.authenticated && q.trim().length < 2 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <ChatIcon size={13} color={theme.muted} />
              <Text style={{ color: theme.muted, fontSize: 12 }}>{t('navSearch.loginForUsers')}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  section: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: SPACING.md, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 8, borderBottomWidth: 1 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
});
