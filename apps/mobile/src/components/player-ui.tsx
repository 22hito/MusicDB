import { endpoints } from "@musicdb/contracts/client";
import { formatDuration } from "@musicdb/i18n";
import { useEndpoint } from "@musicdb/sdk/react";
import { FEATURES, placeholderGradient } from "@musicdb/tokens";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChevronDown,
  Expand,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Video,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer, usePlayingSource, useVideoFrame } from "@/player/store";
import { LikeButton } from "./music";
import { AccentFill, Cover, IconButton, Segmented, Text, Vinyl } from "./ui";

/** Міні-плеєр — капсула з платівкою, як док на сайті; тонка шкала прогресу по верхньому краю. */
export function MiniPlayer() {
  const c = useColors();
  const t = useT();
  const current = usePlayer((s) => s.current);
  const status = usePlayer((s) => s.status);
  const progress = usePlayer((s) => (s.durationMs ? s.positionMs / s.durationMs : 0));
  const videoHidden = useVideoFrame((s) => s.hidden);
  const source = usePlayingSource((s) => s.kind);
  if (!current) return null;
  const track = current.track;
  const playing = status === "playing" || status === "loading";
  return (
    <Pressable
      onPress={() => router.push("/player")}
      style={[styles.mini, { backgroundColor: c.surface2, borderColor: c.border }]}
    >
      <View style={styles.miniTrack}>
        <View style={[styles.miniFill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
      </View>
      <Vinyl
        src={track.release?.coverUrl}
        seed={track.release?.id ?? track.id}
        playing={status === "playing"}
        size={42}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="small" numberOfLines={1} style={{ fontFamily: fonts.semibold }}>
          {track.title}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {track.artists.map((x) => x.name).join(", ")}
        </Text>
      </View>
      {videoHidden && source === "youtube" ? (
        <IconButton label={t("player.showVideo")} onPress={() => useVideoFrame.getState().setHidden(false)}>
          <Video size={20} color={c.textMuted} />
        </IconButton>
      ) : null}
      <LikeButton track={track} size={20} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? t("player.pause") : t("player.play")}
        onPress={() => playerStore.getState().togglePlay()}
        style={styles.miniPlay}
      >
        <AccentFill style={StyleSheet.absoluteFill} />
        {playing ? (
          <Pause size={18} color={c.onAccent} fill={c.onAccent} />
        ) : (
          <Play size={18} color={c.onAccent} fill={c.onAccent} style={{ marginLeft: 2 }} />
        )}
      </Pressable>
    </Pressable>
  );
}

type Stage = "art" | "lyrics";

/**
 * Повноекранний плеєр: перемикач «Обкладинка/Відео · Текст» на видноті, платівка, що виїжджає з-під
 * обкладинки під час гри, синхронний текст (дотик до рядка — перемотка) і відео на весь екран.
 */
export function FullPlayer() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const current = usePlayer((s) => s.current);
  const context = usePlayer((s) => s.context);
  const [stage, setStage] = useState<Stage>("art");
  const slot = useRef<View>(null);
  const setFrame = useVideoFrame((s) => s.setFrame);
  const setVideoFull = useVideoFrame((s) => s.setFullscreen);
  const track = current?.track;
  const source = usePlayingSource((s) => s.kind);
  const isVideo =
    !!track && (source === "youtube" || (!track.playback.audio && !!track.playback.youtubeVideoId));
  const width = Dimensions.get("window").width - 48;

  // Відео YouTube «стає» на місце обкладинки (або мініатюри у вигляді тексту), поки відкритий плеєр.
  const measure = useCallback(
    () => slot.current?.measureInWindow((x, y, w, h) => w > 0 && setFrame({ x, y, width: w, height: h })),
    [setFrame],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: перевимірюємо й при зміні вигляду
  useEffect(() => {
    if (!isVideo) return;
    const id = setTimeout(measure, 350);
    return () => {
      clearTimeout(id);
      setFrame(null);
    };
  }, [isVideo, stage, measure, setFrame]);
  useEffect(() => () => setVideoFull(false), [setVideoFull]);

  if (!track) return null;
  const [a] = placeholderGradient(track.release?.id ?? track.id);

  return (
    <LinearGradient
      colors={[`${a}cc`, c.bg]}
      locations={[0, 0.7]}
      style={[styles.full, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
    >
      <View style={styles.fullHeader}>
        <IconButton label={t("common.close")} onPress={() => router.back()}>
          <ChevronDown size={28} color="#fff" />
        </IconButton>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            variant="caption"
            style={{ color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1.6 }}
          >
            {t("player.playingFrom")}
          </Text>
          <Text variant="small" numberOfLines={1} style={{ color: "#fff", fontFamily: fonts.semibold }}>
            {context?.name ?? t("player.queue")}
          </Text>
        </View>
        <SleepButton />
        <IconButton label={t("player.queue")} onPress={() => router.push("/queue")}>
          <ListMusic size={22} color="#fff" />
        </IconButton>
      </View>

      {FEATURES.lyrics ? (
        <Segmented
          value={stage}
          onChange={setStage}
          style={{ alignSelf: "center", marginTop: 10 }}
          options={[
            { value: "art", label: isVideo ? t("player.video") : t("player.cover") },
            { value: "lyrics", label: t("player.lyrics") },
          ]}
        />
      ) : null}

      {stage === "art" || !FEATURES.lyrics ? (
        <>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            {isVideo ? (
              <View
                ref={slot}
                collapsable={false}
                onLayout={() => setTimeout(measure, 50)}
                style={{
                  width,
                  height: Math.max(200, (width * 9) / 16),
                  backgroundColor: "#000",
                  borderRadius: 12,
                }}
              />
            ) : (
              <RecordStage width={width} />
            )}
          </View>
          <TitleRow isVideo={isVideo} onVideoFull={() => setVideoFull(true)} />
          <Transport />
        </>
      ) : (
        <>
          <View style={styles.compact}>
            {isVideo ? (
              <View
                ref={slot}
                collapsable={false}
                onLayout={() => setTimeout(measure, 50)}
                style={{ width: 200, height: 112, backgroundColor: "#000", borderRadius: 8 }}
              />
            ) : (
              <Cover
                src={track.release?.coverUrl}
                size={56}
                seed={track.release?.id ?? track.id}
                radius={6}
              />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={2} style={{ color: "#fff" }}>
                {track.title}
              </Text>
              <Text variant="small" numberOfLines={1} style={{ color: "rgba(255,255,255,0.7)" }}>
                {track.artists.map((x) => x.name).join(", ")}
              </Text>
            </View>
          </View>
          <LyricsPanel />
          <Transport compact />
        </>
      )}
    </LinearGradient>
  );
}

/** Обкладинка, з-під якої під час гри виїжджає платівка. */
function RecordStage({ width }: { width: number }) {
  const track = usePlayer((s) => s.current?.track);
  const playing = usePlayer((s) => s.status === "playing");
  const cover = Math.round(width / 1.22);
  const disc = Math.round(cover * 0.94);
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(playing ? cover * 0.22 : cover * 0.04, { duration: 650 }) }],
  }));
  if (!track) return null;
  return (
    <View style={{ width: cover * 1.22, height: cover }}>
      <Animated.View style={[{ position: "absolute", top: (cover - disc) / 2, left: cover - disc }, slide]}>
        <Vinyl
          src={track.release?.coverUrl}
          seed={track.release?.id ?? track.id}
          playing={playing}
          size={disc}
        />
      </Animated.View>
      <Cover
        src={track.release?.coverUrl}
        size={cover}
        seed={track.release?.id ?? track.id}
        radius={12}
        style={styles.bigCover}
      />
    </View>
  );
}

function TitleRow({ isVideo, onVideoFull }: { isVideo: boolean; onVideoFull: () => void }) {
  const t = useT();
  const track = usePlayer((s) => s.current?.track);
  if (!track) return null;
  return (
    <View style={styles.titleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="heading" numberOfLines={1} style={{ color: "#fff" }}>
          {track.title}
        </Text>
        <Text variant="body" numberOfLines={1} style={{ color: "rgba(255,255,255,0.7)" }}>
          {track.artists.map((x) => x.name).join(", ")}
        </Text>
      </View>
      {isVideo ? (
        <IconButton label={t("player.videoFullscreen")} onPress={onVideoFull}>
          <Expand size={22} color="#fff" />
        </IconButton>
      ) : null}
      <LikeButton track={track} size={26} />
    </View>
  );
}

function Transport({ compact }: { compact?: boolean }) {
  const t = useT();
  const c = useColors();
  const status = usePlayer((s) => s.status);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const position = usePlayer((s) => s.positionMs);
  const duration = usePlayer((s) => s.durationMs);
  const [scrub, setScrub] = useState<number | null>(null);
  const playing = status === "playing" || status === "loading";
  const st = playerStore.getState;
  const big = compact ? 58 : 68;
  return (
    <View>
      <Slider
        style={{ marginHorizontal: -8, height: 32 }}
        minimumValue={0}
        maximumValue={Math.max(duration, 1)}
        value={scrub ?? position}
        onValueChange={setScrub}
        onSlidingComplete={(v) => {
          setScrub(null);
          st().seek(v);
        }}
        minimumTrackTintColor={c.accent}
        maximumTrackTintColor="rgba(255,255,255,0.25)"
        thumbTintColor="#fff"
      />
      <View style={styles.times}>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
          {formatDuration(scrub ?? position)}
        </Text>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
          {formatDuration(duration)}
        </Text>
      </View>
      <View style={[styles.controls, compact && { marginTop: 6 }]}>
        <IconButton
          label={shuffle ? t("player.shuffleOn") : t("player.shuffleOff")}
          onPress={() => st().toggleShuffle()}
        >
          <Shuffle size={24} color={shuffle ? c.accent : "#fff"} />
        </IconButton>
        <IconButton label={t("player.previous")} onPress={() => st().previous()} size={52}>
          <SkipBack size={30} color="#fff" fill="#fff" />
        </IconButton>
        <Pressable
          onPress={() => st().togglePlay()}
          style={({ pressed }) => [
            styles.bigPlay,
            { width: big, height: big, borderRadius: big / 2 },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <AccentFill style={StyleSheet.absoluteFill} />
          {playing ? (
            <Pause size={30} color={c.onAccent} fill={c.onAccent} />
          ) : (
            <Play size={30} color={c.onAccent} fill={c.onAccent} style={{ marginLeft: 4 }} />
          )}
        </Pressable>
        <IconButton label={t("player.next")} onPress={() => st().next()} size={52}>
          <SkipForward size={30} color="#fff" fill="#fff" />
        </IconButton>
        <IconButton
          label={
            repeat === "off"
              ? t("player.repeatOff")
              : repeat === "all"
                ? t("player.repeatAll")
                : t("player.repeatOne")
          }
          onPress={() => st().cycleRepeat()}
        >
          {repeat === "one" ? (
            <Repeat1 size={24} color={c.accent} />
          ) : (
            <Repeat size={24} color={repeat === "all" ? c.accent : "#fff"} />
          )}
        </IconButton>
      </View>
    </View>
  );
}

/** Текст пісні: синхронний — з підсвіченим рядком і автопрокруткою (дотик — перемотка), інакше — звичайний. */
function LyricsPanel() {
  const t = useT();
  const c = useColors();
  const track = usePlayer((s) => s.current?.track);
  const position = usePlayer((s) => s.positionMs);
  const { data, isLoading } = useEndpoint(
    endpoints.tracks.lyrics,
    { params: { id: track?.id ?? "" } },
    { enabled: !!track?.hasLyrics },
  );
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<number[]>([]);
  const [boxH, setBoxH] = useState(0);
  const synced = data?.synced ?? null;
  let active = -1;
  if (synced) for (let i = 0; i < synced.length; i++) if (synced[i]!.timeMs <= position + 300) active = i;

  useEffect(() => {
    const y = ys.current[active];
    if (active >= 0 && y != null) scroll.current?.scrollTo({ y: Math.max(0, y - boxH / 3), animated: true });
  }, [active, boxH]);

  if (!track?.hasLyrics) {
    return (
      <View style={styles.lyricsEmpty}>
        <Text muted>{t("track.noLyrics")}</Text>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={styles.lyricsEmpty}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return (
    <ScrollView
      ref={scroll}
      onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
      style={{ flex: 1, marginVertical: 12 }}
      contentContainerStyle={{ paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {synced ? (
        synced.map((l, i) => (
          <Pressable
            key={`${l.timeMs}-${i}`}
            onLayout={(e) => {
              ys.current[i] = e.nativeEvent.layout.y;
            }}
            onPress={() => playerStore.getState().seek(l.timeMs)}
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 24,
                lineHeight: 32,
                marginBottom: 12,
                color:
                  i === active ? "#fff" : i < active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.32)",
              }}
            >
              {l.text || "♪"}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={{ fontSize: 18, lineHeight: 28, color: "rgba(255,255,255,0.9)" }}>{data?.plain}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mini: {
    marginHorizontal: 8,
    marginBottom: 6,
    height: 60,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 8,
    paddingRight: 8,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  miniTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  miniFill: { height: 2 },
  miniPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  full: { flex: 1, paddingHorizontal: 24 },
  fullHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  compact: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  lyricsEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  bigCover: {
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  bigPlay: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
});

/** Таймер сну (як в Apple Music / YouTube Music): пауза через N хвилин або наприкінці пісні. */
function SleepButton() {
  const t = useT();
  const c = useColors();
  const sleep = usePlayer((s) => s.sleep);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sleep?.mode !== "time") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleep]);
  const left =
    sleep?.mode === "time"
      ? (() => {
          const sec = Math.max(0, Math.round((sleep.endsAt - now) / 1000));
          return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
        })()
      : null;
  const set = (v: number | "track" | null) => playerStore.getState().setSleepTimer(v);
  const open = () =>
    Alert.alert(
      t("player.sleep"),
      sleep ? (left ? t("player.sleepLeft", { time: left }) : t("player.sleepTrackLeft")) : undefined,
      [
        ...[15, 30, 60].map((m) => ({ text: t("player.sleepMinutes", { count: m }), onPress: () => set(m) })),
        { text: t("player.sleepTrack"), onPress: () => set("track") },
        ...(sleep
          ? [{ text: t("player.sleepOff"), style: "destructive" as const, onPress: () => set(null) }]
          : []),
        { text: t("common.cancel"), style: "cancel" as const },
      ],
    );
  return (
    <IconButton label={t("player.sleep")} onPress={open}>
      <Moon size={21} color={sleep ? c.accent : "#fff"} fill={sleep ? c.accent : "transparent"} />
      {left ? (
        <Text variant="caption" style={{ position: "absolute", bottom: -6, fontSize: 9, color: c.accent }}>
          {left}
        </Text>
      ) : null}
    </IconButton>
  );
}
