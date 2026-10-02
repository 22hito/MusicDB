import React, { useEffect, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSettings } from '@/state/SettingsContext';
import { Button } from './UI';
import { NoteIcon, PauseIcon, PlayIcon, TrophyIcon } from './Icons';
import { FONT_SANS_BOLD, FONT_SANS_MEDIUM, FONT_SANS_SEMIBOLD, FONT_SERIF_BLACK, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

export interface BattleMatchLog {
  size: number;
  winner: Song;
  loser: Song;
}

const MEDALS = { 1: '#e6b94f', 2: '#c9d1dc', 3: '#d49a5e' } as const;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const thumb = (s: Song | null | undefined, size = 'mqdefault') =>
  s?.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/${size}.jpg` : null;

// Невеликий одноразовий салют над обкладинкою: момент рідкісний (кінець турніру) — тут доречна радість.
// Лише transform/opacity на UI-потоці; зі «Зменшити рух» його немає зовсім.
type Piece = { dx: number; dy: number; size: number; round: boolean; color: string; delay: number };
function ConfettiPiece({ p }: { p: Piece }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(p.delay, withTiming(1, { duration: 900 + p.delay * 2, easing: EASE_OUT })));
  }, [t, p.delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.get(),
    transform: [{ translateX: p.dx * t.get() }, { translateY: p.dy * t.get() }, { scale: 0.6 + 0.4 * t.get() }],
  }));
  return (
    <Animated.View
      style={[styles.piece, { width: p.size, height: p.size, borderRadius: p.round ? p.size / 2 : 2, backgroundColor: p.color }, style]}
    />
  );
}
function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i): Piece => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 70 + Math.random() * 90;
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist * 0.75 - 30, size: 5 + Math.random() * 4, round: i % 2 === 0, color: colors[i % colors.length], delay: Math.random() * 120 };
      }),
    [colors],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} p={p} />
      ))}
    </View>
  );
}

// Екран переможця батлу: обкладинка з підсвіткою (без обкладинки — градієнт з кубком), назва пісні
// великим шрифтом, «цеглинки» статистики, головна дія на всю ширину, шлях до перемоги таймлайном
// і п'єдестал 2 · 1 · 3 (третє місце ділять обидва півфіналісти).
export function BattleChampion({
  champion,
  initialSize,
  log,
  roundShort,
  isCurrent,
  isPlaying,
  onListen,
  onRematch,
  onExit,
  bottomInset,
}: {
  champion: Song;
  initialSize: number;
  log: BattleMatchLog[];
  roundShort: (size: number) => string;
  isCurrent: boolean;
  isPlaying: boolean;
  onListen: () => void;
  onRematch: () => void;
  onExit: () => void;
  bottomInset: number;
}) {
  const { theme, t, count } = useSettings();
  const reduced = useReducedMotion();
  const path = log.filter((m) => m.winner.id === champion.id);
  const finalist = log.find((m) => m.size === 2)?.loser;
  const semis = log.filter((m) => m.size === 4).map((m) => m.loser);
  const cover = thumb(champion, 'hqdefault');
  const rounds = Math.round(Math.log2(initialSize));
  const word = (key: Parameters<typeof count>[0], n: number) => count(key, n).replace(/^\S+\s/, '');
  const enter = (delay: number) => (reduced ? undefined : FadeInDown.duration(320).delay(delay).easing(EASE_OUT));

  const stats = [
    { value: initialSize, label: word('count.songs', initialSize) },
    { value: path.length, label: word('count.wins', path.length) },
    { value: rounds, label: word('count.rounds', rounds) },
  ];

  const podiumCol = (place: 1 | 2 | 3, songs: Song[]) => {
    if (!songs.length) return <View style={{ flex: 1 }} />;
    const h = place === 1 ? 92 : place === 2 ? 66 : 48;
    return (
      <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
        {songs.map((s) => (
          <View key={s.id} style={{ alignItems: 'center', width: '100%', marginBottom: 6 }}>
            <View style={[styles.podiumThumb, { borderColor: MEDALS[place], width: songs.length > 1 ? 40 : 52, height: songs.length > 1 ? 40 : 52, backgroundColor: theme.surface2 }]}>
              {thumb(s) ? <Image source={{ uri: thumb(s)! }} style={StyleSheet.absoluteFill} /> : <NoteIcon size={14} color={theme.muted} />}
            </View>
            <Text numberOfLines={1} style={[styles.podiumTitle, { color: theme.text }]}>{s.title}</Text>
            <Text numberOfLines={1} style={[styles.podiumArtist, { color: theme.muted }]}>{s.artist}</Text>
          </View>
        ))}
        <View style={[styles.podiumStep, { height: h, backgroundColor: `${MEDALS[place]}26`, borderColor: `${MEDALS[place]}66` }]}>
          <Text style={[styles.podiumPlace, { color: MEDALS[place] }]}>{place}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ gap: SPACING.md, paddingTop: SPACING.sm, paddingBottom: bottomInset }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(260)} style={[styles.hero, { backgroundColor: theme.surface, borderColor: `${theme.accent}80` }]}>
        {cover ? <Image source={{ uri: cover }} blurRadius={30} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} /> : null}
        <LinearGradient colors={['transparent', theme.surface]} locations={[0, 0.7]} style={StyleSheet.absoluteFill} />

        <View style={{ alignSelf: 'stretch' }}>
          <Animated.View
            entering={reduced ? undefined : ZoomIn.duration(380).easing(EASE_OUT)}
            style={[styles.cover, { borderColor: theme.accent, shadowColor: theme.accent }]}
          >
            {cover ? (
              <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[theme.accentHi, theme.accent, theme.accentLo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
                <TrophyIcon size={56} color={theme.onAccent} />
              </LinearGradient>
            )}
          </Animated.View>
          {reduced ? null : <Confetti colors={[theme.accent, theme.accentHi, MEDALS[2], theme.accent2, MEDALS[3]]} />}
          <View style={[styles.medal, { backgroundColor: theme.accent, borderColor: theme.surface }]}>
            <TrophyIcon size={20} color={theme.onAccent} />
          </View>
        </View>

        <Animated.View entering={enter(80)} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
          <Text style={[styles.kicker, { color: theme.accent }]}>{t('battle.championLabel')}</Text>
          <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>{champion.title}</Text>
          <Text numberOfLines={1} style={[styles.artist, { color: theme.text2 }]}>{champion.artist}</Text>
        </Animated.View>

        <Animated.View entering={enter(140)} style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.stat, { backgroundColor: `${theme.bg}99`, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{s.value}</Text>
              <Text numberOfLines={1} style={[styles.statLabel, { color: theme.muted }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={enter(200)} style={{ alignSelf: 'stretch', gap: SPACING.sm }}>
          <Pressable
            onPress={onListen}
            accessibilityRole="button"
            style={({ pressed }) => [styles.listen, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <LinearGradient colors={[theme.accentHi, theme.accent, theme.accentLo]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {isCurrent && isPlaying ? <PauseIcon size={16} color={theme.onAccent} /> : <PlayIcon size={15} color={theme.onAccent} />}
            <Text style={[styles.listenText, { color: theme.onAccent }]}>{t('battle.listenToWinnerBtn')}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <Button label={t('battle.rematch')} variant="outline" small onPress={onRematch} style={{ flex: 1 }} />
            <Button label={t('battle.exit')} variant="plain" small onPress={onExit} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </Animated.View>

      {path.length ? (
        <Animated.View entering={enter(260)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.muted }]}>{t('battle.pathTitle')}</Text>
          {path.map((m, i) => {
            const final = m.size === 2;
            const last = i === path.length - 1;
            return (
              <View key={`${m.size}-${m.loser.id}`} style={styles.stepRow}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: final ? theme.accent : theme.surface2, borderColor: final ? theme.accent : theme.borderStrong }]} />
                  {!last ? <View style={[styles.line, { backgroundColor: theme.border }]} /> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 14 }}>
                  <Text style={[styles.stepTag, { color: final ? theme.accent : theme.muted }]}>{roundShort(m.size)}</Text>
                  <View style={styles.stepSong}>
                    <View style={[styles.stepThumb, { backgroundColor: theme.surface2 }]}>
                      {thumb(m.loser) ? <Image source={{ uri: thumb(m.loser)! }} style={StyleSheet.absoluteFill} /> : <NoteIcon size={12} color={theme.muted} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 13.5 }}>{m.loser.title}</Text>
                      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{m.loser.artist}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Animated.View>
      ) : null}

      {finalist ? (
        <Animated.View entering={enter(320)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.muted }]}>{t('battle.podiumTitle')}</Text>
          <View style={styles.podium}>
            {podiumCol(2, [finalist])}
            {podiumCol(1, [champion])}
            {podiumCol(3, semis)}
          </View>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', overflow: 'hidden', gap: SPACING.lg },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  piece: { position: 'absolute', left: '50%', top: '50%' },
  medal: { position: 'absolute', alignSelf: 'center', bottom: -22, width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11.5, letterSpacing: 2.4, textTransform: 'uppercase', fontFamily: FONT_SANS_BOLD, marginTop: 14 },
  title: { fontFamily: FONT_SERIF_BLACK, fontSize: 28, lineHeight: 34, textAlign: 'center', marginTop: 6, letterSpacing: -0.3 },
  artist: { fontFamily: FONT_SANS_MEDIUM, fontSize: 15, marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: SPACING.sm, alignSelf: 'stretch' },
  stat: { flex: 1, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontFamily: FONT_SERIF_BLACK, fontSize: 24, lineHeight: 28 },
  statLabel: { fontSize: 11, marginTop: 2, fontFamily: FONT_SANS_MEDIUM },
  listen: { height: 50, borderRadius: RADIUS.pill, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  listenText: { fontFamily: FONT_SANS_SEMIBOLD, fontSize: 15.5 },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg },
  cardTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_SANS_BOLD, marginBottom: SPACING.md },
  stepRow: { flexDirection: 'row', gap: 12 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 2 },
  line: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  stepTag: { fontSize: 11, fontFamily: FONT_SANS_BOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  stepSong: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepThumb: { width: 56, height: 32, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  podiumThumb: { borderRadius: 999, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  podiumTitle: { fontSize: 12, fontFamily: FONT_SANS_SEMIBOLD, maxWidth: '100%', textAlign: 'center' },
  podiumArtist: { fontSize: 11, maxWidth: '100%', textAlign: 'center' },
  podiumStep: { alignSelf: 'stretch', borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md, alignItems: 'center', paddingTop: 6, marginTop: 2 },
  podiumPlace: { fontFamily: FONT_SERIF_BLACK, fontSize: 22 },
});
