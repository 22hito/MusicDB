/**
 * Керування поверх відео на весь екран. Живе всередині контейнера з WebView (його рушій повертає
 * горизонтально й розтягує на весь екран), тож макет тут — альбомний. Дотик показує/ховає панелі,
 * через 3 с вони ховаються самі.
 */

import { formatDuration } from "@musicdb/i18n";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { Minimize2, Pause, Play, SkipBack, SkipForward } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useColors, useT } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";
import { AccentFill, IconButton, Text } from "./ui";

export function VideoFullscreenControls({ onExit }: { onExit: () => void }) {
  const t = useT();
  const c = useColors();
  const track = usePlayer((s) => s.current?.track);
  const playing = usePlayer((s) => s.status === "playing" || s.status === "loading");
  const position = usePlayer((s) => s.positionMs);
  const duration = usePlayer((s) => s.durationMs);
  const [shown, setShown] = useState(true);
  const [scrub, setScrub] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poke = useCallback(() => {
    setShown(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 3000);
  }, []);

  useEffect(() => {
    poke();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poke]);

  const st = playerStore.getState;
  const act = (fn: () => void) => () => {
    fn();
    poke();
  };

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => (shown ? setShown(false) : poke())}>
      {shown && track ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "transparent"]}
            style={styles.top}
            pointerEvents="box-none"
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="title" numberOfLines={1} style={{ color: "#fff" }}>
                {track.title}
              </Text>
              <Text variant="small" numberOfLines={1} style={{ color: "rgba(255,255,255,0.75)" }}>
                {track.artists.map((a) => a.name).join(", ")}
              </Text>
            </View>
            <Pressable
              onPress={onExit}
              accessibilityRole="button"
              accessibilityLabel={t("player.exitFullscreen")}
              style={styles.exit}
            >
              <Minimize2 size={16} color="#fff" />
              <Text variant="small" style={{ color: "#fff", fontWeight: "600" }}>
                {t("player.exit")}
              </Text>
            </Pressable>
          </LinearGradient>

          <View style={styles.center} pointerEvents="box-none">
            <IconButton label={t("player.previous")} onPress={act(() => st().previous())} size={56}>
              <SkipBack size={30} color="#fff" fill="#fff" />
            </IconButton>
            <Pressable onPress={act(() => st().togglePlay())} style={styles.play} accessibilityRole="button">
              <AccentFill style={StyleSheet.absoluteFill} />
              {playing ? (
                <Pause size={30} color={c.onAccent} fill={c.onAccent} />
              ) : (
                <Play size={30} color={c.onAccent} fill={c.onAccent} style={{ marginLeft: 3 }} />
              )}
            </Pressable>
            <IconButton label={t("player.next")} onPress={act(() => st().next())} size={56}>
              <SkipForward size={30} color="#fff" fill="#fff" />
            </IconButton>
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)"]}
            style={styles.bottom}
            pointerEvents="box-none"
          >
            <Text variant="caption" style={styles.time}>
              {formatDuration(scrub ?? position)}
            </Text>
            <Slider
              style={{ flex: 1, height: 32 }}
              minimumValue={0}
              maximumValue={Math.max(duration, 1)}
              value={scrub ?? position}
              onValueChange={(v) => {
                setScrub(v);
                poke();
              }}
              onSlidingComplete={(v) => {
                setScrub(null);
                st().seek(v);
              }}
              minimumTrackTintColor={c.accent}
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#fff"
            />
            <Text variant="caption" style={styles.time}>
              {formatDuration(duration)}
            </Text>
          </LinearGradient>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 14,
  },
  time: { color: "rgba(255,255,255,0.8)", width: 40, textAlign: "center" },
  exit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
});
