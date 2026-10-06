/**
 * Колесо фортуни: випадковий жанр → перемішаний плейлист цього жанру.
 * Під час обертання параметри заблоковані; на колесі щонайменше 2 жанри. На кожному секторі — легкий
 * вібровідгук і клацання язичка; лампочки обідка «біжать», виграшний сектор підсвічується.
 */
import { endpoints, type Genre, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { wheelColor } from "@musicdb/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Check, Minus, Plus, RotateCcw, X } from "lucide-react-native";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { playList, TrackRow } from "@/components/music";
import { SavePlaylistSheet } from "@/components/save-playlist";
import { TitledScreen } from "@/components/screen";
import { Button, OwlMark, Segmented, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { fonts, useColors, useT } from "@/lib/theme";

const MIN_SONGS = 5;
const MIN_ON_WHEEL = 2;
const KEY = "nowl-wheel";
const BULBS = 20;
type Settings = {
  mode: "random" | "custom";
  count: number;
  secMin: number;
  secMax: number;
  custom: string[];
  eliminate: boolean;
};
const defaults: Settings = { mode: "random", count: 10, secMin: 3, secMax: 6, custom: [], eliminate: false };

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Outcome = { genre: Genre; kind: "winner" | "out"; left: number };

export default function WheelScreen() {
  const t = useT();
  const c = useColors();
  const { data } = useEndpoint(endpoints.genres.list);
  const all = useMemo(
    () =>
      (data?.items ?? [])
        .filter((g) => g.trackCount >= MIN_SONGS)
        .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name)),
    [data],
  );
  const [settings, setSettings] = useState<Settings>(defaults);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings({ ...defaults, ...(JSON.parse(raw) as Partial<Settings>) }))
      .catch(() => {});
  }, []);

  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const [roster, setRoster] = useState<Genre[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [winner, setWinner] = useState<{ genre: Genre; seed: string } | null>(null);
  const [history, setHistory] = useState<Genre[]>([]);
  const [tab, setTab] = useState<"genres" | "playlist" | "history">("genres");
  const [picking, setPicking] = useState(false);
  const inGame = settings.eliminate && roster !== null && !winner;

  /** Зміна налаштувань — не під час обертання; зміна складу — ще й не посеред гри на вибування. */
  const update = (patch: Partial<Settings>, opts: { composition?: boolean } = {}) => {
    if (spinningRef.current) return;
    if (opts.composition && inGame) return;
    setSettings((s) => {
      const next = { ...s, ...patch };
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const order = useMemo(() => shuffled(all), [all]);
  const count = Math.min(Math.max(settings.count, MIN_ON_WHEEL), Math.max(MIN_ON_WHEEL, all.length));
  const base = useMemo(
    () =>
      settings.mode === "custom" ? all.filter((g) => settings.custom.includes(g.id)) : order.slice(0, count),
    [settings.mode, settings.custom, all, order, count],
  );
  const genres = useMemo(
    () => (roster ?? base).filter((g) => !removed.includes(g.id)),
    [roster, base, removed],
  );
  const colorOf = useMemo(() => {
    const list = roster ?? base;
    const map = new Map(list.map((g, i) => [g.id, wheelColor(i, list.length)]));
    return (g: Genre) => map.get(g.id) ?? "#777";
  }, [roster, base]);

  const rotation = useRef(new Animated.Value(0)).current;
  const angle = useRef(0);
  const pin = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const enough = genres.length >= MIN_ON_WHEEL;
  const finished = settings.eliminate && !!winner && !!roster;
  const canSpin = !spinning && !leaving && enough && !finished;
  const locked = spinning || inGame;

  const reset = () => {
    if (spinningRef.current) return;
    setRoster(null);
    setRemoved([]);
    setLeaving(null);
    setOutcome(null);
    setWinner(null);
    setTab("genres");
  };

  const finishWin = (genre: Genre) => {
    setWinner({ genre, seed: Math.random().toString(36).slice(2, 10) });
    setOutcome({ genre, kind: "winner", left: 1 });
    setHistory((h) => [genre, ...h.filter((x) => x.id !== genre.id)].slice(0, 12));
    setTab("playlist");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const spin = () => {
    if (!canSpin) return;
    const wheel = genres;
    if (settings.eliminate && !roster) setRoster(wheel);
    if (!settings.eliminate) setWinner(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dur = settings.secMin + Math.random() * (settings.secMax - settings.secMin);
    const n = wheel.length;
    const seg = 360 / n;
    const landed = Math.floor(Math.random() * n);
    const fullSpins = Math.max(4, Math.round(dur * 1.4)) + Math.floor(Math.random() * 2);
    const target = landed * seg + seg * (0.18 + Math.random() * 0.64);
    const start = angle.current;
    const end = start + fullSpins * 360 + ((((360 - target - start) % 360) + 360) % 360);
    angle.current = end;
    setOutcome(null);
    spinningRef.current = true;
    setSpinning(true);
    let lastSeg = -1;
    let lastBuzz = 0;
    const sub = rotation.addListener(({ value }) => {
      const under = Math.floor(((((360 - (value % 360)) % 360) + 360) % 360) / seg);
      if (under !== lastSeg) {
        if (lastSeg !== -1) {
          pin.setValue(1);
          Animated.spring(pin, { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 14 }).start();
          const now = Date.now();
          if (now - lastBuzz > 45) {
            lastBuzz = now;
            void Haptics.selectionAsync();
          }
        }
        lastSeg = under;
      }
    });
    Animated.timing(rotation, {
      toValue: end,
      duration: dur * 1000,
      easing: Easing.bezier(0.12, 0.72, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      rotation.removeListener(sub);
      spinningRef.current = false;
      setSpinning(false);
      const genre = wheel[landed]!;
      if (!settings.eliminate) return finishWin(genre);
      // На вибування: жанр підсвічується, потім зникає з колеса; лишився один — переможець.
      const left = n - 1;
      setOutcome({ genre, kind: "out", left });
      setLeaving(genre.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      timers.current.push(
        setTimeout(() => {
          setRemoved((r) => [...r, genre.id]);
          setLeaving(null);
          if (left === 1) {
            const last = wheel.find((g) => g.id !== genre.id)!;
            timers.current.push(setTimeout(() => finishWin(last), 350));
          }
        }, 900),
      );
    });
  };

  const size = Math.min(Dimensions.get("window").width - 40, 400);
  const highlight = outcome ? outcome.genre.id : null;

  return (
    <TitledScreen pre={t("wheel.headingPre")} accent={t("wheel.headingAccent")} sub={t("wheel.sub")}>
      {settings.eliminate && roster ? (
        <View style={styles.koBar}>
          <Text variant="small" style={{ color: c.text2, flex: 1 }}>
            {winner ? t("wheel.koDone") : t("wheel.koLeft", { count: genres.length, total: roster.length })}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw size={15} color={c.textMuted} />}
            title={t("wheel.restart")}
            onPress={reset}
            disabled={spinning}
          />
        </View>
      ) : null}
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <View style={{ width: size, height: size }}>
          <Rim size={size} spinning={spinning} won={outcome?.kind === "winner"} />
          <Animated.View
            style={{
              position: "absolute",
              left: size * 0.055,
              top: size * 0.055,
              width: size * 0.89,
              height: size * 0.89,
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                    extrapolate: "extend",
                  }),
                },
              ],
            }}
          >
            <Disc
              genres={genres}
              size={size * 0.89}
              colorOf={colorOf}
              highlight={highlight}
              leaving={leaving}
              accent={c.accent}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.pin,
              {
                left: size / 2 - 17,
                transform: [
                  { rotate: pin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-24deg"] }) },
                ],
              },
            ]}
          >
            <Svg width={34} height={44} viewBox="0 0 40 52">
              <Path
                d="M20 50 C14 38 4 28 4 17 A16 16 0 0 1 36 17 C36 28 26 38 20 50Z"
                fill={c.accent}
                stroke={c.bg}
                strokeWidth={2}
              />
              <Circle cx={20} cy={16} r={6} fill={c.bg} opacity={0.85} />
            </Svg>
          </Animated.View>
          <View
            pointerEvents="none"
            style={[
              styles.hub,
              {
                width: size * 0.2,
                height: size * 0.2,
                left: size * 0.4,
                top: size * 0.4,
                backgroundColor: c.surface1,
                borderColor: `${c.accent}99`,
              },
            ]}
          >
            <OwlMark size={size * 0.12} />
          </View>
          {outcome ? (
            <View
              style={[
                styles.result,
                {
                  width: size * 0.56,
                  height: size * 0.56,
                  left: size * 0.22,
                  top: size * 0.22,
                  backgroundColor: c.surface1,
                  borderColor: outcome.kind === "winner" ? c.accent : c.borderStrong,
                },
              ]}
            >
              <Pressable
                onPress={() => setOutcome(null)}
                style={[styles.close, { borderColor: c.border }]}
                hitSlop={8}
              >
                <X size={14} color={c.textMuted} />
              </Pressable>
              <Text variant="small" muted>
                {outcome.kind === "winner" ? t("wheel.result") : t("wheel.out")}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 22,
                  textAlign: "center",
                  color: outcome.kind === "winner" ? c.accent : c.text2,
                  textDecorationLine: outcome.kind === "winner" ? "none" : "line-through",
                }}
              >
                {outcome.genre.name}
              </Text>
              <Text variant="caption" muted>
                {outcome.kind === "winner"
                  ? t("release.songs", { count: outcome.genre.trackCount })
                  : t("wheel.koLeftShort", { count: outcome.left })}
              </Text>
            </View>
          ) : null}
        </View>
        <Button
          title={spinning ? t("wheel.spinning") : t("wheel.spin")}
          size="lg"
          onPress={spin}
          disabled={!canSpin}
          style={{ marginTop: 16, minWidth: 190 }}
        />
        {finished ? (
          <Text variant="caption" muted style={{ marginTop: 6 }}>
            {t("wheel.koAgain")}
          </Text>
        ) : !enough ? (
          <Text variant="small" style={{ color: c.warning, marginTop: 6 }}>
            {t("wheel.customEmpty")}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface1, borderColor: c.border, opacity: spinning ? 0.55 : 1 },
        ]}
      >
        <View style={styles.setting}>
          <Segmented
            value={settings.mode}
            onChange={(mode) => !locked && update({ mode }, { composition: true })}
            options={[
              { value: "random", label: t("wheel.modeRandom") },
              { value: "custom", label: t("wheel.modeCustom") },
            ]}
          />
          <View style={{ flex: 1 }} />
          {settings.mode === "random" ? (
            <Stepper
              value={count}
              min={MIN_ON_WHEEL}
              max={Math.max(MIN_ON_WHEEL, all.length)}
              disabled={locked}
              onChange={(v) => update({ count: v }, { composition: true })}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              title={t("wheel.pick")}
              disabled={locked}
              onPress={() => !locked && setPicking(true)}
            />
          )}
        </View>
        <View style={styles.setting}>
          <Text variant="small" style={{ flex: 1, color: c.text2 }}>
            {t("wheel.durationShort")}
          </Text>
          <Stepper
            value={settings.secMin}
            min={1}
            max={30}
            disabled={spinning}
            onChange={(v) => update({ secMin: v, secMax: Math.max(v, settings.secMax) })}
          />
          <Text muted>—</Text>
          <Stepper
            value={settings.secMax}
            min={1}
            max={30}
            disabled={spinning}
            onChange={(v) => update({ secMax: v, secMin: Math.min(v, settings.secMin) })}
          />
        </View>
        <View style={styles.setting}>
          <Text variant="small" style={{ flex: 1, color: c.text2 }}>
            {t("wheel.eliminate")}
          </Text>
          <Switch
            value={settings.eliminate}
            disabled={locked}
            onValueChange={(v) => {
              update({ eliminate: v }, { composition: true });
              reset();
            }}
            trackColor={{ true: c.accent, false: c.surface3 }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View
        style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border, paddingHorizontal: 6 }]}
      >
        <View style={[styles.tabs, { borderBottomColor: c.border }]}>
          {(
            [
              ["genres", `${t("wheel.legend")} · ${genres.length}`],
              ["playlist", t("wheel.playlistTab")],
              ["history", t("wheel.history")],
            ] as const
          ).map(([id, label]) => {
            const disabled = id === "playlist" && !winner;
            return (
              <Pressable
                key={id}
                disabled={disabled}
                onPress={() => setTab(id)}
                style={[
                  styles.tab,
                  tab === id && { backgroundColor: c.accentSoft },
                  disabled && { opacity: 0.4 },
                ]}
              >
                <Text
                  variant="small"
                  numberOfLines={1}
                  style={{ color: tab === id ? c.accent : c.textMuted, fontFamily: fonts.semibold }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {tab === "genres" ? (
          <View>
            {genres.map((g) => (
              <View
                key={g.id}
                style={[styles.legendRow, g.id === highlight && { backgroundColor: c.accentSoft }]}
              >
                <View style={[styles.dot, { backgroundColor: colorOf(g) }]} />
                <Text
                  style={[{ flex: 1 }, g.id === highlight && { color: c.accent, fontFamily: fonts.semibold }]}
                >
                  {g.name}
                </Text>
                <Text variant="small" muted>
                  {g.trackCount}
                </Text>
              </View>
            ))}
            {(roster ?? [])
              .filter((g) => removed.includes(g.id))
              .map((g) => (
                <View key={g.id} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: colorOf(g), opacity: 0.4 }]} />
                  <Text muted style={{ flex: 1, textDecorationLine: "line-through" }}>
                    {g.name}
                  </Text>
                </View>
              ))}
          </View>
        ) : tab === "playlist" && winner ? (
          <WheelPlaylist genre={winner.genre} seed={winner.seed} />
        ) : tab === "history" ? (
          history.length ? (
            history.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => {
                  setWinner({ genre: g, seed: Math.random().toString(36).slice(2, 10) });
                  setTab("playlist");
                }}
                style={styles.legendRow}
              >
                <Text style={{ flex: 1 }}>{g.name}</Text>
                <Text variant="small" muted>
                  {g.trackCount}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text muted style={{ textAlign: "center", padding: 20 }}>
              {t("wheel.playlistEmpty")}
            </Text>
          )
        ) : null}
      </View>

      <GenrePicker
        visible={picking}
        genres={all}
        selected={settings.custom}
        onChange={(custom) => update({ custom }, { composition: true })}
        onClose={() => setPicking(false)}
      />
    </TitledScreen>
  );
}

/** Обідок із лампочками: під час обертання «біжать» (перемикаються через одну), після перемоги — блимають. */
function Rim({ size, spinning, won }: { size: number; spinning: boolean; won: boolean }) {
  const c = useColors();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!spinning && !won) return setPhase(0);
    let n = 0;
    const id = setInterval(
      () => {
        n++;
        setPhase(n);
        if (won && n >= 10) clearInterval(id);
      },
      spinning ? 130 : 260,
    );
    return () => clearInterval(id);
  }, [spinning, won]);
  const lit = (i: number) => (spinning ? i % 2 === phase % 2 : won ? phase % 2 === 0 : true);
  return (
    <Svg width={size} height={size} viewBox="-110 -110 220 220" style={StyleSheet.absoluteFill}>
      <Circle r={109} fill={c.surface2} />
      <Circle r={104.5} fill="none" stroke={c.accent} strokeWidth={2.2} />
      <Circle r={96.5} fill="none" stroke={c.accentLo} strokeWidth={1.4} />
      {Array.from({ length: BULBS }, (_, i) => {
        const a = (i / BULBS) * Math.PI * 2;
        return (
          <Circle
            key={i}
            cx={Math.sin(a) * 100.5}
            cy={-Math.cos(a) * 100.5}
            r={2.4}
            fill={lit(i) ? (spinning || won ? "#fff6dc" : c.accent) : c.surface3}
          />
        );
      })}
    </Svg>
  );
}

const Disc = memo(function Disc({
  genres,
  size,
  colorOf,
  highlight,
  leaving,
  accent,
}: {
  genres: Genre[];
  size: number;
  colorOf: (g: Genre) => string;
  highlight: string | null;
  leaving: string | null;
  accent: string;
}) {
  const n = Math.max(1, genres.length);
  const seg = 360 / n;
  const point = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(Math.sin(rad) * r).toFixed(3)} ${(-Math.cos(rad) * r).toFixed(3)}`;
  };
  const fontSize = n <= 6 ? 7.2 : n <= 10 ? 6.4 : n <= 16 ? 5.4 : n <= 28 ? 4.4 : 3.6;
  const maxChars = Math.max(6, Math.round(64 / fontSize));
  return (
    <Svg width={size} height={size} viewBox="-100 -100 200 200">
      <Defs>
        <RadialGradient id="depth" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.22} />
          <Stop offset="0.55" stopColor="#fff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.3} />
        </RadialGradient>
      </Defs>
      {genres.map((g, i) => {
        const a0 = i * seg;
        const a1 = (i + 1) * seg;
        const d =
          n === 1
            ? "M0 -100 A100 100 0 1 1 -0.01 -100 Z"
            : `M0 0 L${point(a0, 100)} A100 100 0 ${seg > 180 ? 1 : 0} 1 ${point(a1, 100)} Z`;
        const mid = a0 + seg / 2;
        const label = g.name.length > maxChars ? `${g.name.slice(0, maxChars - 1)}…` : g.name;
        const flip = mid > 180;
        const dim = highlight !== null && highlight !== g.id;
        return (
          <G key={g.id} opacity={leaving === g.id ? 0.15 : dim ? 0.5 : 1}>
            <Path
              d={d}
              fill={colorOf(g)}
              stroke={highlight === g.id ? "#fff" : "rgba(0,0,0,0.18)"}
              strokeWidth={highlight === g.id ? 1.8 : 0.5}
            />
            <SvgText
              transform={
                flip ? `rotate(${mid + 90}) translate(-24 0)` : `rotate(${mid - 90}) translate(24 0)`
              }
              textAnchor={flip ? "end" : "start"}
              alignmentBaseline="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill="#fff"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={fontSize / 6}
            >
              {label}
            </SvgText>
          </G>
        );
      })}
      <Circle r={100} fill="url(#depth)" />
      {n > 1
        ? genres.map((g, i) => (
            <Line
              key={`s-${g.id}`}
              x1={0}
              y1={0}
              x2={Math.sin((i * seg * Math.PI) / 180) * 100}
              y2={-Math.cos((i * seg * Math.PI) / 180) * 100}
              stroke={accent}
              strokeOpacity={0.55}
              strokeWidth={0.7}
            />
          ))
        : null}
    </Svg>
  );
});

function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.stepper, { borderColor: c.border, backgroundColor: c.surface2 }]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        hitSlop={6}
        style={styles.stepBtn}
        disabled={disabled || value <= min}
      >
        <Minus size={16} color={value <= min ? c.textSubtle : c.text} />
      </Pressable>
      <Text style={{ minWidth: 28, textAlign: "center", fontFamily: fonts.semibold }}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        hitSlop={6}
        style={styles.stepBtn}
        disabled={disabled || value >= max}
      >
        <Plus size={16} color={value >= max ? c.textSubtle : c.text} />
      </Pressable>
    </View>
  );
}

/** Випадкові пісні жанру з тим самим зерном — до 200 для відтворення. */
async function loadGenreTracks(slug: string, seed: string, max = 200) {
  const out: Track[] = [];
  let cursor: string | undefined;
  while (out.length < max) {
    const page = await api.tracks.browse({
      query: { genre: slug, sort: "random", seed, limit: 100, ...(cursor ? { cursor } : {}) },
    });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out.slice(0, max);
}

function WheelPlaylist({ genre, seed }: { genre: Genre; seed: string }) {
  const t = useT();
  const c = useColors();
  const me = useMe().data;
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { genre: genre.slug, sort: "random", seed, limit: 30 },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  const context = { type: "wheel" as const, id: genre.id, name: `${t("nav.wheel")} · ${genre.name}` };
  return (
    <View style={[styles.card, { backgroundColor: c.surface1, borderColor: c.border, paddingHorizontal: 0 }]}>
      <View style={{ paddingHorizontal: 14, gap: 10 }}>
        <Text variant="heading">
          {t("wheel.playlistTitle", { genre: genre.name, count: genre.trackCount })}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            size="sm"
            title={t("wheel.play")}
            loading={busy}
            disabled={!tracks.length}
            onPress={async () => {
              setBusy(true);
              try {
                const all = await loadGenreTracks(genre.slug, seed);
                if (all.length) playList(all, 0, context);
              } finally {
                setBusy(false);
              }
            }}
          />
          {me ? (
            <Button size="sm" variant="outline" title={t("wheel.save")} onPress={() => setSaving(true)} />
          ) : null}
        </View>
      </View>
      <SavePlaylistSheet
        visible={saving}
        onClose={() => setSaving(false)}
        defaultTitle={t("wheel.savedTitle", { genre: genre.name })}
        loadTracks={() => loadGenreTracks(genre.slug, seed)}
      />
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          context={context}
          onPress={() => playList(tracks, i, context)}
        />
      ))}
      {list.hasNextPage ? (
        <Button
          variant="ghost"
          title={t("wheel.more")}
          loading={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

function GenrePicker({
  visible,
  genres,
  selected,
  onChange,
  onClose,
}: {
  visible: boolean;
  genres: Genre[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const set = new Set(selected);
  const shownList = genres.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface2, paddingBottom: insets.bottom + 12 }]}>
        <Text variant="heading">{t("wheel.pickTitle")}</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("wheel.searchGenre")}
          placeholderTextColor={c.textMuted}
          style={[styles.input, { backgroundColor: c.surface3, color: c.text }]}
        />
        <FlatList
          style={{ maxHeight: 380 }}
          data={shownList}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => {
            const on = set.has(item.id);
            return (
              <Pressable
                onPress={() => onChange(on ? selected.filter((x) => x !== item.id) : [...selected, item.id])}
                style={styles.pickRow}
              >
                <View
                  style={[
                    styles.check,
                    on
                      ? { backgroundColor: c.accent, borderColor: c.accent }
                      : { borderColor: c.borderStrong },
                  ]}
                >
                  {on ? <Check size={14} color={c.onAccent} strokeWidth={3} /> : null}
                </View>
                <Text style={{ flex: 1 }}>{item.name}</Text>
                <Text variant="small" muted>
                  {item.trackCount}
                </Text>
              </Pressable>
            );
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <Text style={{ flex: 1, color: selected.length < MIN_ON_WHEEL ? c.warning : c.textMuted }}>
            {t("wheel.selected", { count: selected.length })}
          </Text>
          <Button variant="ghost" size="sm" title={t("wheel.clear")} onPress={() => onChange([])} />
          <Button
            size="sm"
            title={t("common.done")}
            onPress={onClose}
            disabled={selected.length < MIN_ON_WHEEL}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pin: { position: "absolute", top: -12, zIndex: 3, transformOrigin: "50% 30%" },
  hub: {
    position: "absolute",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    zIndex: 2,
    elevation: 6,
  },
  result: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    gap: 4,
    zIndex: 4,
    elevation: 10,
  },
  close: {
    position: "absolute",
    top: "13%",
    right: "17%",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { margin: 16, marginBottom: 0, padding: 14, borderRadius: 18, borderWidth: 1, gap: 12 },
  koBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 10 },
  tabs: { flexDirection: "row", gap: 4, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  setting: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, height: 38 },
  stepBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 10,
  },
  input: { height: 40, borderRadius: 20, paddingHorizontal: 14, fontFamily: fonts.regular },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
