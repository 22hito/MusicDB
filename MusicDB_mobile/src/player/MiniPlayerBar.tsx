import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlayer } from './PlayerContext';
import { useSettings } from '@/state/SettingsContext';
import { PLAYER_BAR_HEIGHT, FONT_SERIF_BOLD, FONT_MONO_REGULAR } from '@/constants/theme';
import {
  CloseIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
  VideoIcon,
} from '@/components/Icons';

function fmtSec(s: number) {
  const sec = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function MiniPlayerBar() {
  const p = usePlayer();
  const { theme, t } = useSettings();

  if (!p.isOpen || !p.current) return null;
  const song = p.current;
  const fraction = p.duration > 0 ? p.currentTime / p.duration : 0;
  const loading = p.state === 'loading' || p.state === 'buffering';

  return (
    <View style={[styles.wrap, { backgroundColor: theme.mode === 'dark' ? '#0f0f11' : theme.surface, borderTopColor: theme.border }]}>
      <Slider
        style={styles.seek}
        minimumValue={0}
        maximumValue={1}
        value={Number.isFinite(fraction) ? fraction : 0}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor={theme.mode === 'dark' ? '#1e1e22' : theme.border}
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
          <Text numberOfLines={1} style={[styles.title, { color: theme.text, fontFamily: FONT_SERIF_BOLD }]}>
            {song.title}
            {p.videoNotFound ? t('video.notFoundSuffix') : ''}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>
            {song.artist}
          </Text>
        </View>

        <TouchableOpacity onPress={p.prev} style={styles.iconBtn} hitSlop={8}>
          <PrevIcon size={18} color={theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={p.toggle}
          style={[styles.mainBtn, { backgroundColor: theme.accent }]}
          hitSlop={8}
        >
          {loading ? (
            <View style={styles.loadingDot} />
          ) : p.isPlaying ? (
            <PauseIcon size={17} color={theme.onAccent} />
          ) : (
            <PlayIcon size={17} color={theme.onAccent} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={p.next} style={styles.iconBtn} hitSlop={8}>
          <NextIcon size={18} color={theme.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.subRow}>
        <TouchableOpacity onPress={p.toggleShuffle} style={styles.smallIconBtn} hitSlop={10}>
          <ShuffleIcon size={15} color={p.shuffle ? theme.accent : theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={p.toggleRepeat} style={styles.smallIconBtn} hitSlop={10}>
          <RepeatIcon size={15} color={p.repeat ? theme.accent : theme.muted} />
        </TouchableOpacity>

        <Text style={[styles.time, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>
          {fmtSec(p.currentTime)} — {fmtSec(p.duration)}
        </Text>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={p.toggleVideoPopup}
          style={[styles.smallIconBtn, p.videoPopupOpen && { backgroundColor: `${theme.accent}22` }]}
          hitSlop={10}
        >
          <VideoIcon size={15} color={p.videoPopupOpen ? theme.accent : theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={p.close} style={styles.smallIconBtn} hitSlop={10}>
          <CloseIcon size={13} color={theme.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: PLAYER_BAR_HEIGHT,
    borderTopWidth: 1,
    paddingTop: 2,
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
    height: 42,
  },
  cover: {
    width: 34,
    height: 34,
    borderRadius: 5,
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
    fontSize: 14,
    fontWeight: '700',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  mainBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    height: 30,
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
  },
});
