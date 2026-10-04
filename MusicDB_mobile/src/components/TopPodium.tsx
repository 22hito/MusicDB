import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useSettings } from '@/state/SettingsContext';
import { avatarColor } from './UI';
import { HeadphonesIcon, HeartIcon, NoteIcon, PauseIcon, PlayIcon } from './Icons';
import { FONT_SANS_BOLD, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, FONT_SERIF_BLACK, RADIUS } from '@/constants/theme';
import type { Song } from '@/api/types';

const MEDALS = ['#e6b94f', '#c9d1dc', '#d49a5e'];

// Подіум Топ 100 — як на сайті: друге, перше (вище), третє місце; обкладинка, медаль,
// назва, виконавець, скільки людей слухали, ♡. Натиснути картку — грати.
export function TopPodium({
  songs,
  currentId,
  isPlaying,
  favoriteIds,
  authenticated,
  onPlay,
  onToggleFavorite,
}: {
  songs: Song[];
  currentId?: number | null;
  isPlaying?: boolean;
  favoriteIds: Set<number>;
  authenticated?: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
}) {
  const { theme, t } = useSettings();
  const order = [1, 0, 2].filter((i) => songs[i]);
  return (
    <View style={styles.row}>
      {order.map((i) => {
        const s = songs[i];
        const medal = MEDALS[i];
        const cur = s.id === currentId;
        const thumb = s.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/mqdefault.jpg` : null;
        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => onPlay(s)}
            style={[
              styles.card,
              i === 0 && styles.first,
              { borderColor: cur ? theme.accent : theme.border, backgroundColor: i === 0 ? `${medal}14` : theme.surface },
            ]}
          >
            <View style={[styles.cover, { backgroundColor: thumb ? theme.surface2 : avatarColor(s.artist) }]}>
              {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} cachePolicy="memory-disk" contentFit="cover" /> : <NoteIcon size={22} color="rgba(255,255,255,0.85)" />}
              {cur ? (
                <View style={[styles.playing, { backgroundColor: theme.accent }]}>
                  {isPlaying ? <PauseIcon size={12} color={theme.onAccent} /> : <PlayIcon size={11} color={theme.onAccent} />}
                </View>
              ) : null}
            </View>
            <View style={[styles.medal, { backgroundColor: medal }, i === 0 && styles.medalFirst]}>
              <Text style={[styles.medalText, i === 0 && { fontSize: 15 }]}>{i + 1}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.title, { color: cur ? theme.accent : theme.text }]}>{s.title}</Text>
            <Text numberOfLines={1} style={[styles.artist, { color: theme.accent }]}>{s.artist}</Text>
            <View style={styles.foot}>
              <View style={styles.plays}>
                <HeadphonesIcon size={12} color={theme.muted} />
                <Text style={{ color: medal, fontFamily: FONT_SANS_BOLD, fontSize: 13 }}>{s.playCount ?? 0}</Text>
              </View>
              {authenticated ? (
                <TouchableOpacity onPress={() => onToggleFavorite(s)} hitSlop={8}>
                  <HeartIcon size={16} color={favoriteIds.has(s.id) ? theme.red : theme.muted} filled={favoriteIds.has(s.id)} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.listeners, { color: theme.muted }]}>{t('top.listeners')}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14 },
  card: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: RADIUS.lg, padding: 8, paddingBottom: 9 },
  first: { paddingTop: 12 },
  cover: { width: '100%', aspectRatio: 1, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  playing: { position: 'absolute', right: 6, bottom: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  medal: { position: 'absolute', top: 4, left: 4, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  medalFirst: { width: 30, height: 30, borderRadius: 15, top: 6, left: 6 },
  medalText: { color: '#1a1406', fontFamily: FONT_SERIF_BLACK, fontSize: 13 },
  title: { fontSize: 13, fontFamily: FONT_SANS_SEMIBOLD },
  artist: { fontSize: 11.5, marginTop: 1, fontFamily: FONT_SANS_REGULAR },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  plays: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listeners: { fontSize: 10, marginTop: 1 },
});
