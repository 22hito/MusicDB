/**
 * Оформлення Premium у застосунку: анімовані аватар, банер, фон профілю й фон застосунку.
 *
 * Готові файли — анімований WebP + перший кадр (poster); expo-image грає WebP без нативних модулів.
 * Щоб не садити батарею й трафік: спершу показується poster, анімація вмикається лише на активному екрані,
 * без «зменшеного руху» і коли в налаштуваннях не обрано «статичний фон». Фон застосунку — вертикальний варіант.
 */
import type { CosmeticMedia, CosmeticPreset } from "@musicdb/contracts/client";
import { useMe } from "@musicdb/sdk/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { usePrefs } from "@/lib/theme";

/** Ті самі кольори, що й у готових фонах сайту (globals.css). */
export const PRESETS: Record<CosmeticPreset, { base: string; colors: [string, string, string] }> = {
  aurora: { base: "#0b1020", colors: ["#2ee6a6aa", "#7c5cffaa", "#1fb6ff88"] },
  nebula: { base: "#120a1f", colors: ["#c04bffaa", "#ff4f9a99", "#3b2bff88"] },
  sunset: { base: "#1a0d0a", colors: ["#ff7a3dbb", "#ffbf3d99", "#ff3d6e88"] },
  ocean: { base: "#06131c", colors: ["#00b4d8aa", "#0077b6aa", "#48cae488"] },
  ember: { base: "#140a06", colors: ["#ff5e1fbb", "#ffb02e99", "#b3122a88"] },
};

/** Чи можна зараз програвати анімацію на цьому екрані. */
export function useCosmeticMotion() {
  const { motion, bgMotion } = usePrefs();
  const systemReduced = useReducedMotion();
  const focused = useIsFocused();
  if (!focused || bgMotion === "static" || motion === "reduced") return false;
  return !(motion === "system" && systemReduced);
}

function PresetLayer({ preset, play }: { preset: CosmeticPreset; play: boolean }) {
  const p = PRESETS[preset];
  const drift = useSharedValue(0);
  useEffect(() => {
    if (play)
      drift.value = withRepeat(
        withTiming(1, { duration: 18_000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    else cancelAnimation(drift);
  }, [play, drift]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -40 + drift.value * 80 },
      { translateY: -24 + drift.value * 48 },
      { rotate: `${drift.value * 8}deg` },
      { scale: 1 + drift.value * 0.08 },
    ],
  }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.base, overflow: "hidden" }]}>
      <Animated.View style={[styles.oversize, style]}>
        <LinearGradient
          colors={[p.colors[0], "transparent", p.colors[1], "transparent", p.colors[2]]}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 1, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function CosmeticLayer({ media, portrait = false }: { media: CosmeticMedia; portrait?: boolean }) {
  const play = useCosmeticMotion();
  if (media.preset) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <PresetLayer preset={media.preset} play={play} />
      </View>
    );
  }
  const poster = (portrait && media.posterPortrait) || media.poster;
  const anim = (portrait && media.animPortrait) || media.anim;
  if (!poster) return null;
  return (
    <Image
      source={{ uri: play && anim ? anim : poster }}
      placeholder={{ uri: poster }}
      autoplay={play}
      cachePolicy="disk"
      contentFit="cover"
      transition={0}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/** Фон застосунку з Premium (лише для власника) — під вмістом екрана, з затемненням для читабельності. */
export function ScreenBackground() {
  const me = useMe().data;
  const { colors } = usePrefs();
  const media = me?.premium.active ? me.cosmetics?.siteBackground : null;
  if (!media || (!media.preset && !media.poster)) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <CosmeticLayer media={media} portrait />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.7 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  oversize: { position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%" },
});
