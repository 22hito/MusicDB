import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlayer } from './PlayerContext';
import { useSettings } from '@/state/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { PLAYER_BAR_HEIGHT, FONT_SANS_BOLD, FONT_SANS_MEDIUM, FONT_SANS_REGULAR, RADIUS } from '@/constants/theme';
import {
  CloseIcon,
  LyricsIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
  StarIcon,
  VideoIcon,
} from '@/components/Icons';
import { RatingModal } from '@/components/RatingModal';
import { LyricsModal } from '@/components/LyricsModal';

function fmtSec(s: number) {
  const sec = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function MiniPlayerBar() {
  const p = usePlayer();
  const { theme, t } = useSettings();
  const [ratingOpen, setRatingOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  if (!p.isOpen || !p.current) return null;
  const song = p.current;
  const fraction = p.duration > 0 ? p.currentTime / p.duration : 0;
  const loading = p.state === 'loading' || p.state === 'buffering';

  return (
    // Плаваюча картка, як .player-bar на телефоні: легкий акцентний градієнт поверх поверхні.
    <View style={[styles.wrap, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
      <LinearGradient
        colors={[`${theme.accent}2e`, `${theme.elevated}00`, `${theme.accent2}26`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Slider
        style={styles.seek}
        minimumValue={0}
        maximumValue={1}
        value={Number.isFinite(fraction) ? fraction : 0}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.borderStrong}
        thumbTintColor={theme.accent}
        onSlidingComplete={(v) => p.seekFraction(v)}
      />

      <View style={styles.mainRow}>
        <View style={[styles.cover, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
          {p.videoId ? (
            <Image source={{ uri: `https://img.youtube.com/vi/${p.videoId}/mqdefault.jpg` }} style={styles.coverImg} />
          ) : (
            <Text style={{ color: theme.muted, fontSize: 18 }}>♪</Text>
          )}
        </View>

        <View style={styles.meta}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {song.title}
            {p.videoNotFound ? t('video.notFoundSuffix') : ''}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, { color: theme.accent }]}>
            {song.artist}
          </Text>
        </View>

        <TouchableOpacity onPress={p.prev} style={styles.iconBtn} hitSlop={8}>
          <PrevIcon size={18} color={theme.text2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={p.toggle}
          style={[styles.mainBtn, { backgroundColor: theme.text }]}
          hitSlop={8}
        >
          {loading ? (
            <View style={styles.loadingDot} />
          ) : p.isPlaying ? (
            <PauseIcon size={17} color={theme.bg} />
          ) : (
            <PlayIcon size={17} color={theme.bg} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={p.next} style={styles.iconBtn} hitSlop={8}>
          <NextIcon size={18} color={theme.text2} />
        </TouchableOpacity>
      </View>

      <View style={styles.subRow}>
        <TouchableOpacity onPress={p.toggleShuffle} style={styles.smallIconBtn} hitSlop={10}>
          <ShuffleIcon size={15} color={p.shuffle ? theme.accent : theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={p.toggleRepeat} style={styles.smallIconBtn} hitSlop={10}>
          <RepeatIcon size={15} color={p.repeat ? theme.accent : theme.muted} />
        </TouchableOpacity>

        <Text style={[styles.time, { color: theme.muted }]}>
          {fmtSec(p.currentTime)} — {fmtSec(p.duration)}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Текст пісні — як кнопка "Текст" (караоке) у плеєрі сайту. */}
        <TouchableOpacity onPress={() => setLyricsOpen(true)} style={styles.smallIconBtn} hitSlop={10} accessibilityLabel={t('player.karaoke')}>
          <LyricsIcon size={15} color={lyricsOpen ? theme.accent : theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRatingOpen(true)} style={styles.smallIconBtn} hitSlop={10}>
          <StarIcon size={15} color={song.avgRating != null ? theme.accent : theme.muted} />
        </TouchableOpacity>
        {/* Файл пісні ком'юніті — без відео. */}
        {song.audioUrl ? null : (
          <TouchableOpacity
            onPress={p.toggleVideoPopup}
            style={[styles.smallIconBtn, p.videoPopupOpen && { backgroundColor: `${theme.accent}22` }]}
            hitSlop={10}
          >
            <VideoIcon size={15} color={p.videoPopupOpen ? theme.accent : theme.muted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={p.close} style={styles.smallIconBtn} hitSlop={10}>
          <CloseIcon size={13} color={theme.muted} />
        </TouchableOpacity>
      </View>
      <RatingModal song={ratingOpen ? song : null} onClose={() => setRatingOpen(false)} />
      <LyricsModal song={lyricsOpen ? song : null} onClose={() => setLyricsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: PLAYER_BAR_HEIGHT,
    marginHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  seek: {
    width: '100%',
    height: 14,
    marginTop: -6,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    height: 46,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontFamily: FONT_SANS_BOLD,
  },
  artist: {
    fontSize: 13,
    marginTop: 1,
    fontFamily: FONT_SANS_MEDIUM,
  },
  iconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  mainBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 26,
    gap: 6,
  },
  smallIconBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  time: {
    fontSize: 11,
    marginLeft: 4,
    fontFamily: FONT_SANS_REGULAR,
    fontVariant: ['tabular-nums'],
  },
});
