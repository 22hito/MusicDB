import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, ErrorState, SectionTitle, SegmentedPicker } from '@/components/UI';
import { SongListBlock } from '@/components/SongListBlock';
import { GenrePickerModal } from '@/components/GenrePickerModal';
import { CloseIcon, ShuffleIcon, SlidersIcon } from '@/components/Icons';
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

const MIN_SONGS = 5; // жанр на колесі — лише з 5+ піснями (в обох режимах)
const CHIPS_LIMIT = 10;
const LEGEND_LIMIT = 16;
const KEY_MODE = 'nowl.wheel.mode';
const KEY_CUSTOM = 'nowl.wheel.customGenres';
type WheelMode = 'random' | 'custom';

// Колесо фортуни: випадковий жанр → перемішаний плейлист із нього. Два режими, як на сайті:
// "Випадкові" — N жанрів із 5+ піснями; "Мій вибір" — жанри, які користувач обрав сам.
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
  const [mode, setMode] = useState<WheelMode>('random');
  const [custom, setCustom] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chipsExpanded, setChipsExpanded] = useState(false);
  const [legendExpanded, setLegendExpanded] = useState(false);

  // Режим і власний вибір пам'ятаються між запусками.
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY_MODE), AsyncStorage.getItem(KEY_CUSTOM)])
      .then(([m, c]) => {
        if (m === 'custom') setMode('custom');
        try {
          const parsed = JSON.parse(c || '[]');
          if (Array.isArray(parsed)) setCustom(parsed.filter((g): g is string => typeof g === 'string'));
        } catch {
          // зіпсоване значення — починаємо з порожнього вибору
        }
      })
      .catch(() => {});
  }, []);
  const saveMode = (m: WheelMode) => {
    setMode(m);
    setResult(null);
    setPlaylist([]);
    AsyncStorage.setItem(KEY_MODE, m).catch(() => {});
  };
  const saveCustom = (next: string[]) => {
    setCustom(next);
    setResult(null);
    setPlaylist([]);
    AsyncStorage.setItem(KEY_CUSTOM, JSON.stringify(next)).catch(() => {});
  };
  // Кут лише накопичується (ніколи не скидається через setValue посеред життя
  // екрана): так повторні оберти на нативному драйвері працюють стабільно.
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationDeg = useRef(0);
  const rotate = useRef(rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] })).current;
  const spinRef = useRef<() => void>(() => {});
  // Змах пальцем по колесу вбік — теж крутить (вертикальний жест лишається прокрутці сторінки).
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.vx) > 0.25 || Math.abs(g.dx) > 60) spinRef.current();
      },
    }),
  ).current;

  const load = useCallback(() => {
    setLoading(true);
    api
      .getSongs('catalog')
      .then((list) => {
        setSongs(list);
        const counts: Record<string, number> = {};
        for (const s of list) for (const g of s.genres) counts[g] = (counts[g] || 0) + 1;
        const eligible = shuffled(Object.keys(counts).filter((g) => counts[g] >= MIN_SONGS));
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

  // Жанри з кількістю пісень (як і для випадкового режиму — від MIN_SONGS) — для вікна вибору.
  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of songs) for (const g of s.genres) counts.set(g, (counts.get(g) || 0) + 1);
    return [...counts.entries()]
      .filter(([, cnt]) => cnt >= MIN_SONGS)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, cnt]) => ({ name, count: cnt }));
  }, [songs]);
  const genres = useMemo(() => {
    if (mode === 'random') return pool.slice(0, count);
    const available = new Set(genreCounts.map((g) => g.name));
    return custom.filter((g) => available.has(g));
  }, [mode, pool, count, custom, genreCounts]);
  const n = genres.length;
  const segAngle = n ? 360 / n : 360;

  const changeCount = (v: number) => {
    setCount(v);
    setResult(null);
    setPlaylist([]);
  };

  const spin = () => {
    if (spinning || n < 2) return;
    const duration = secMin + Math.random() * (secMax - secMin);
    const winner = Math.floor(Math.random() * n);
    const mid = winner * segAngle + segAngle / 2;
    const fullSpins = Math.max(4, Math.round(duration * 1.4)) + Math.floor(Math.random() * 2);
    // Від поточного кута до найближчого положення, де mid під стрілкою, + повні оберти.
    const start = rotationDeg.current;
    const target = start + fullSpins * 360 + ((((360 - mid - start) % 360) + 360) % 360);
    setSpinning(true);
    setResult(null);
    setPlaylist([]);
    Animated.timing(rotation, {
      toValue: target,
      duration: duration * 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      rotation.setValue(target); // на випадок перерваної анімації — фіксуємо фінальний кут
      rotationDeg.current = target;
      const g = genres[winner];
      setResult(g);
      setPlaylist(shuffled(songs.filter((s) => s.genres.includes(g))));
      setSpinning(false);
    });
  };

  useEffect(() => {
    spinRef.current = spin;
  });

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
        {genreCounts.length < 2 ? (
          <EmptyState icon="🎡" label={t('wheel.notEnough')} />
        ) : (
          <>
            <View style={[styles.controls, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SegmentedPicker<WheelMode>
                value={mode}
                onChange={(m) => !spinning && saveMode(m)}
                options={[
                  { value: 'random', label: t('wheel.modeRandom'), icon: (col) => <ShuffleIcon size={14} color={col} /> },
                  { value: 'custom', label: t('wheel.modeCustom'), icon: (col) => <SlidersIcon size={14} color={col} /> },
                ]}
              />
              {mode === 'random' ? (
                <View style={styles.controlRow}>
                  <Text style={[styles.controlLabel, { color: theme.muted }]}>{t('wheel.countLabel')}</Text>
                  {pool.length >= 2 ? (
                    <Stepper value={count} min={2} max={pool.length} onChange={changeCount} disabled={spinning} />
                  ) : (
                    <Text style={{ color: theme.muted, fontSize: 12, flexShrink: 1 }}>{t('wheel.notEnough')}</Text>
                  )}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={styles.chips}>
                    {genres.length ? (
                      <>
                        {(chipsExpanded ? genres : genres.slice(0, CHIPS_LIMIT)).map((g, i) => (
                          <View key={g} style={[styles.chip, { borderColor: segColor(i, genres.length), backgroundColor: `${segColor(i, genres.length)}33` }]}>
                            <Text style={{ color: theme.text, fontSize: 12 }}>{abbrGenre(g)}</Text>
                            <TouchableOpacity hitSlop={8} disabled={spinning} onPress={() => saveCustom(custom.filter((x) => x !== g))}>
                              <CloseIcon size={10} color={theme.muted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {genres.length > CHIPS_LIMIT ? (
                          <TouchableOpacity onPress={() => setChipsExpanded((e) => !e)} style={[styles.dashedChip, { borderColor: theme.border }]}>
                            <Text style={{ color: theme.text, fontSize: 12 }}>
                              {chipsExpanded ? t('wheel.collapse') : t('wheel.more').replace('{n}', String(genres.length - CHIPS_LIMIT))}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {genres.length > 1 ? (
                          <TouchableOpacity disabled={spinning} onPress={() => saveCustom([])} style={[styles.dashedChip, { borderColor: theme.border }]}>
                            <Text style={{ color: theme.muted, fontSize: 12 }}>{t('wheel.clearAll')}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : (
                      <Text style={{ color: theme.muted, fontSize: 12 }}>{t('wheel.customEmpty')}</Text>
                    )}
                  </View>
                  <Button
                    label={t('wheel.pickGenresBtn')}
                    variant="outline"
                    small
                    disabled={spinning}
                    onPress={() => setPickerOpen(true)}
                    style={{ alignSelf: 'flex-start' }}
                  />
                </View>
              )}
              <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: theme.muted }]}>{t('wheel.durationLabel')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Stepper value={secMin} min={1} max={30} disabled={spinning} onChange={(v) => { setSecMin(v); if (v > secMax) setSecMax(v); }} />
                  <Text style={{ color: theme.muted }}>—</Text>
                  <Stepper value={secMax} min={1} max={30} disabled={spinning} onChange={(v) => { setSecMax(v); if (v < secMin) setSecMin(v); }} />
                </View>
              </View>
            </View>

            <View style={{ width: size, height: size + 14, alignSelf: 'center' }} {...pan.panHandlers}>
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

            <Button label={t('wheel.spinBtn')} onPress={spin} disabled={spinning || n < 2} style={{ marginTop: SPACING.lg }} />

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
              {genres.map((g, i) =>
                legendExpanded || i < LEGEND_LIMIT || g === result ? (
                  <View key={g} style={[styles.legendItem, { borderColor: g === result ? theme.accent : theme.border }]}>
                    <View style={[styles.swatch, { backgroundColor: segColor(i, n) }]} />
                    <Text style={{ color: g === result ? theme.accent : theme.text, fontSize: 12 }}>{abbrGenre(g)}</Text>
                  </View>
                ) : null,
              )}
              {genres.length > LEGEND_LIMIT ? (
                <TouchableOpacity onPress={() => setLegendExpanded((e) => !e)} style={[styles.dashedChip, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontSize: 12 }}>
                    {legendExpanded ? t('wheel.collapse') : t('wheel.more').replace('{n}', String(genres.length - LEGEND_LIMIT))}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
      <GenrePickerModal
        visible={pickerOpen}
        genres={genreCounts}
        selected={custom}
        onChange={saveCustom}
        onClose={() => setPickerOpen(false)}
        title={t('wheel.pickTitle')}
        format={abbrGenre}
      />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: 5, paddingLeft: 10, paddingRight: 8 },
  dashedChip: { borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10, justifyContent: 'center' },
});
