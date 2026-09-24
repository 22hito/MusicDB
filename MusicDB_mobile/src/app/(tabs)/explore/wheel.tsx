import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, ErrorState, SectionTitle } from '@/components/UI';
import { SongListBlock } from '@/components/SongListBlock';
import { FONT_MONO_MEDIUM, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Та сама палітра, що й WHEEL_COLORS на сайті; понад 12 секторів — HSL за "золотим кутом".
const WHEEL_COLORS = ['#c8a96e', '#8a6fb0', '#4f8c6f', '#b5555a', '#5b84a8', '#c98a4b', '#6fa89e', '#9a6b8f', '#7d9153', '#b0703f', '#5f6fa0', '#a3824f'];
function segColor(i: number, n: number) {
  if (n <= WHEEL_COLORS.length) return WHEEL_COLORS[i % WHEEL_COLORS.length];
  return `hsl(${Math.round((i * 137.508) % 360)}, 38%, 42%)`;
}

function abbrGenre(name: string) {
  return name.replace(/alternative/gi, 'alt');
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Кут рахуємо за годинниковою стрілкою від верху (там стоїть стрілка-вказівник).
function point(c: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: c + r * Math.sin(rad), y: c - r * Math.cos(rad) };
}
function slicePath(c: number, r: number, a0: number, a1: number) {
  const p0 = point(c, r, a0);
  const p1 = point(c, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${c},${c} L${p0.x},${p0.y} A${r},${r} 0 ${large} 1 ${p1.x},${p1.y} Z`;
}

function baseFontSize(n: number) {
  if (n <= 8) return 14;
  if (n <= 16) return 12.5;
  if (n <= 28) return 11;
  if (n <= 45) return 9.8;
  return 8.8;
}

function Stepper({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  const { theme } = useSettings();
  const btn = (label: string, next: number, off: boolean) => (
    <TouchableOpacity
      disabled={off || disabled}
      onPress={() => onChange(next)}
      hitSlop={6}
      style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.surface2, opacity: off || disabled ? 0.4 : 1 }]}
    >
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.stepper}>
      {btn('−', value - 1, value <= min)}
      <Text style={{ color: theme.accent, fontFamily: FONT_MONO_MEDIUM, fontSize: 16, minWidth: 34, textAlign: 'center' }}>{value}</Text>
      {btn('+', value + 1, value >= max)}
    </View>
  );
}

// Колесо фортуни: випадковий жанр (лише жанри з 5+ піснями) → перемішаний плейлист із нього.
export default function WheelScreen() {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const player = usePlayer();
  const { width } = useWindowDimensions();
  const size = Math.min(width - SPACING.lg * 2, 380);
  const c = size / 2;
  const r = c - 4;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pool, setPool] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [secMin, setSecMin] = useState(3);
  const [secMax, setSecMax] = useState(6);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationDeg = useRef(0);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getSongs('catalog')
      .then((list) => {
        setSongs(list);
        const counts: Record<string, number> = {};
        for (const s of list) for (const g of s.genres) counts[g] = (counts[g] || 0) + 1;
        const eligible = shuffled(Object.keys(counts).filter((g) => counts[g] >= 5));
        setPool(eligible);
        setCount(Math.max(1, Math.min(10, eligible.length)));
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const genres = useMemo(() => pool.slice(0, count), [pool, count]);
  const n = genres.length;
  const segAngle = n ? 360 / n : 360;

  const changeCount = (v: number) => {
    setCount(v);
    setResult(null);
    setPlaylist([]);
    rotation.setValue(0);
    rotationDeg.current = 0;
  };

  const spin = () => {
    if (spinning || n < 2) return;
    const duration = secMin + Math.random() * (secMax - secMin);
    const winner = Math.floor(Math.random() * n);
    const mid = winner * segAngle + segAngle / 2;
    const fullSpins = Math.max(4, Math.round(duration * 1.4)) + Math.floor(Math.random() * 2);
    // Від поточного кута (без повних обертів) до положення, де mid під стрілкою.
    const start = rotationDeg.current % 360;
    rotation.setValue(start);
    const target = start + fullSpins * 360 + ((360 - mid - start + 720) % 360);
    setSpinning(true);
    setResult(null);
    setPlaylist([]);
    Animated.timing(rotation, {
      toValue: target,
      duration: duration * 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      rotationDeg.current = target;
      const g = genres[winner];
      setResult(g);
      setPlaylist(shuffled(songs.filter((s) => s.genres.includes(g))));
      setSpinning(false);
    });
  };

  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  // Підписи — як на сайті: від хаба до обідка, шрифт зменшується для довгих назв, далі — трикрапка.
  const hubR = Math.max(18, size * 0.07);
  const font = baseFontSize(n) * Math.min(1.2, Math.max(0.72, c / 220));
  const startR = Math.max(hubR + 8, (1.3 * font * n) / (2 * Math.PI));
  const avail = Math.max(20, r - startR - Math.max(8, r * 0.05));

  if (loading) return <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />;
  if (loadError) return <ErrorState label={t('error.loadFailed')} onRetry={load} />;

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {pool.length < 2 ? (
          <EmptyState icon="🎡" label={t('wheel.notEnough')} />
        ) : (
          <>
            <View style={[styles.controls, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: theme.muted }]}>{t('wheel.countLabel')}</Text>
                <Stepper value={count} min={2} max={pool.length} onChange={changeCount} disabled={spinning} />
              </View>
              <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: theme.muted }]}>{t('wheel.durationLabel')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Stepper value={secMin} min={1} max={30} disabled={spinning} onChange={(v) => { setSecMin(v); if (v > secMax) setSecMax(v); }} />
                  <Text style={{ color: theme.muted }}>—</Text>
                  <Stepper value={secMax} min={1} max={30} disabled={spinning} onChange={(v) => { setSecMax(v); if (v < secMin) setSecMin(v); }} />
                </View>
              </View>
            </View>

            <View style={{ width: size, height: size + 14, alignSelf: 'center' }}>
              <Animated.View style={{ position: 'absolute', top: 14, width: size, height: size, transform: [{ rotate }] }}>
                <Svg width={size} height={size}>
                  {genres.map((g, i) => (
                    <Path key={g} d={slicePath(c, r, i * segAngle, (i + 1) * segAngle)} fill={segColor(i, n)} stroke={theme.bg} strokeWidth={1} />
                  ))}
                  {genres.map((g, i) => {
                    const mid = i * segAngle + segAngle / 2;
                    const label = abbrGenre(g);
                    const fs = Math.max(8, Math.min(font, avail / (label.length * 0.6)));
                    const maxChars = Math.floor(avail / (fs * 0.6));
                    const text = label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
                    return (
                      <G key={`l${g}`} rotation={mid - 90} origin={`${c}, ${c}`}>
                        <SvgText x={c + startR} y={c + fs * 0.35} fill="#fff" fontSize={fs} fontWeight="bold">
                          {text}
                        </SvgText>
                      </G>
                    );
                  })}
                  <Circle cx={c} cy={c} r={hubR} fill={theme.surface} stroke={theme.accent} strokeWidth={2} />
                </Svg>
              </Animated.View>
              {/* Нерухома стрілка зверху. */}
              <Svg width={28} height={26} style={{ position: 'absolute', top: 0, left: c - 14 }}>
                <Polygon points="2,2 26,2 14,24" fill={theme.accent} stroke={theme.bg} strokeWidth={2} />
              </Svg>
            </View>

            <Button label={t('wheel.spinBtn')} onPress={spin} disabled={spinning} style={{ marginTop: SPACING.lg }} />

            {result ? (
              <View style={[styles.result, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                <Text style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_MONO_MEDIUM, textTransform: 'uppercase' }}>{t('wheel.resultLabel')}</Text>
                <Text style={{ color: theme.accent, fontSize: 24, fontFamily: FONT_SERIF_BOLD, marginTop: 4, textAlign: 'center' }}>{abbrGenre(result)}</Text>
                {playlist.length ? (
                  <Button small label={`▶ ${t('wheel.playBtn')}`} onPress={() => player.playFrom(playlist, playlist[0].id)} style={{ marginTop: 12 }} />
                ) : null}
              </View>
            ) : null}

            {playlist.length ? (
              <>
                <SectionTitle label={`${abbrGenre(result || '')} — ${playlist.length}`} />
                <SongListBlock songs={playlist} />
              </>
            ) : (
              <Text style={{ color: theme.muted, textAlign: 'center', marginTop: SPACING.lg, fontSize: 13 }}>{spinning ? '' : t('wheel.playlistEmpty')}</Text>
            )}

            <SectionTitle label={t('wheel.legendTitle')} />
            <View style={styles.legend}>
              {genres.map((g, i) => (
                <View key={g} style={[styles.legendItem, { borderColor: g === result ? theme.accent : theme.border }]}>
                  <View style={[styles.swatch, { backgroundColor: segColor(i, n) }]} />
                  <Text style={{ color: g === result ? theme.accent : theme.text, fontSize: 12 }}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  controls: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, gap: 10 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  controlLabel: { fontSize: 12, flexShrink: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  result: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.lg },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: 4, paddingHorizontal: 9 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
