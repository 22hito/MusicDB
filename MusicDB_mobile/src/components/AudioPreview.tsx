import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useSettings } from '@/state/SettingsContext';
import { usePlayer } from '@/player/PlayerContext';
import { PauseIcon, PlayIcon } from './Icons';
import { FONT_MONO_REGULAR, RADIUS } from '@/constants/theme';

// Міні-плеєр файлу (прослуховування заявки адміном) — як .mini-audio на сайті:
// кнопка, смуга перемотування, час. Плеєр створюється лише при першому натисканні
// (посилання — через getUrl); грає лише один такий плеєр, основний — на паузу.
let active: { stop: () => void } | null = null;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AudioPreview({ getUrl }: { getUrl: () => Promise<string> }) {
  const { theme } = useSettings();
  const main = usePlayer();
  const ref = useRef<AudioPlayer | null>(null);
  const barWidth = useRef(0);
  const [st, setSt] = useState({ playing: false, time: 0, dur: 0, loading: false, error: false });

  const stop = useCallback(() => ref.current?.pause(), []);
  const me = useRef({ stop });
  me.current.stop = stop;

  useEffect(
    () => () => {
      if (active === me.current) active = null;
      ref.current?.remove();
      ref.current = null;
    },
    [],
  );

  const ensure = async () => {
    if (ref.current) return ref.current;
    setSt((s) => ({ ...s, loading: true, error: false }));
    const url = await getUrl();
    const p = createAudioPlayer({ uri: url }, { updateInterval: 250 });
    p.addListener('playbackStatusUpdate', (s) =>
      setSt({ playing: s.playing, time: s.currentTime || 0, dur: s.duration || 0, loading: !s.isLoaded, error: false }),
    );
    ref.current = p;
    return p;
  };

  const toggle = async () => {
    try {
      const p = await ensure();
      if (p.playing) {
        p.pause();
        return;
      }
      if (active && active !== me.current) active.stop();
      active = me.current;
      if (main.isPlaying) main.pause();
      p.play();
    } catch {
      setSt((s) => ({ ...s, loading: false, error: true }));
    }
  };

  const seek = (x: number) => {
    const p = ref.current;
    if (!p || !st.dur || !barWidth.current) return;
    p.seekTo(Math.max(0, Math.min(1, x / barWidth.current)) * st.dur).catch(() => {});
  };

  const progress = st.dur ? st.time / st.dur : 0;
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface2, borderColor: st.playing ? theme.accent : theme.border }]}>
      <TouchableOpacity onPress={toggle} style={[styles.btn, { backgroundColor: theme.accent }]} hitSlop={6}>
        {st.loading && !st.playing ? (
          <ActivityIndicator size="small" color={theme.onAccent} />
        ) : st.playing ? (
          <PauseIcon size={12} color={theme.onAccent} />
        ) : (
          <PlayIcon size={11} color={theme.onAccent} />
        )}
      </TouchableOpacity>
      <Pressable
        style={styles.barHit}
        onLayout={(e) => (barWidth.current = e.nativeEvent.layout.width)}
        onPress={(e) => seek(e.nativeEvent.locationX)}
      >
        <View style={[styles.bar, { backgroundColor: theme.border }]}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 3 }} />
        </View>
      </Pressable>
      <Text style={[styles.time, { color: st.error ? theme.red : theme.muted }]}>
        {st.error ? '!' : st.dur ? `${fmt(st.time)} / ${fmt(st.dur)}` : fmt(st.time)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, marginTop: 10 },
  btn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  barHit: { flex: 1, paddingVertical: 10, justifyContent: 'center' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  time: { fontFamily: FONT_MONO_REGULAR, fontSize: 11, minWidth: 44, textAlign: 'right' },
});
