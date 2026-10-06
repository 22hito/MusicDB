import { placeholderGradient } from "@musicdb/tokens";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Music, User } from "lucide-react-native";
import { type ReactNode, useEffect, useId } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text as RNText,
  StyleSheet,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { fonts, useColors } from "@/lib/theme";

type Variant = "hero" | "display" | "heading" | "title" | "body" | "bodyStrong" | "small" | "caption";

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, letterSpacing: -0.4 },
  display: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 29, letterSpacing: -0.2 },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
};

export function Text({
  variant = "body",
  muted,
  accent,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; accent?: boolean }) {
  const c = useColors();
  return (
    <RNText
      {...props}
      style={[variants[variant], { color: accent ? c.accent : muted ? c.textMuted : c.text }, style]}
    />
  );
}

/** Розмір картинки з Deezer CDN під місце показу (економія трафіку). */
export function sized(url: string | null | undefined, px: number) {
  if (!url) return null;
  if (url.includes("dzcdn.net")) {
    const size = px <= 64 ? 56 : px <= 140 ? 120 : px <= 260 ? 250 : px <= 520 ? 500 : 1000;
    return url.replace(/\/\d+x\d+-/, `/${size}x${size}-`);
  }
  return url;
}

export function Cover({
  src,
  size,
  seed,
  round,
  radius = 6,
  style,
}: {
  src: string | null | undefined;
  size: number;
  seed: string;
  round?: boolean;
  radius?: number;
  style?: ViewStyle;
}) {
  const [a, b] = placeholderGradient(seed);
  const r = round ? size / 2 : radius;
  const uri = sized(src, size * 2);
  return (
    <View style={[{ width: size, height: size, borderRadius: r, overflow: "hidden" }, style]}>
      <LinearGradient
        colors={[a, b]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {round ? (
            <User size={size * 0.4} color="rgba(255,255,255,0.7)" />
          ) : (
            <Music size={size * 0.36} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      )}
    </View>
  );
}

export function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}) {
  const [a, b] = placeholderGradient(name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      <LinearGradient colors={[a, b]} style={[StyleSheet.absoluteFill, styles.center]}>
        {!src ? (
          <RNText style={{ color: "#fff", fontFamily: fonts.bold, fontSize: size * 0.42 }}>
            {(name.trim()[0] ?? "?").toUpperCase()}
          </RNText>
        ) : null}
      </LinearGradient>
      {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
    </View>
  );
}

/** Текст заголовка: серифний, одним рядком і одним кольором (без виділеного курсиву). */
export function HlText({
  text,
  accent,
  variant = "heading",
  style,
}: {
  text: string;
  accent?: string;
  variant?: Variant;
  style?: TextStyle;
}) {
  return (
    <Text variant={variant} style={style}>
      {accent !== undefined ? `${text} ${accent}` : text}
    </Text>
  );
}

/** Знак N'Owl (сова з очима-бурштинами) — кольори з теми й акценту. */
export function OwlMark({ size = 28, body, eyes }: { size?: number; body?: string; eyes?: string }) {
  const c = useColors();
  const id = useId().replace(/:/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <SvgGradient id={`owl${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={body ?? c.accentStrong} />
          <Stop offset="1" stopColor={body ?? c.accent} />
        </SvgGradient>
      </Defs>
      <Path d="M6 6.5 10.5 9a9.5 9.5 0 0 1 11 0L26 6.5V18a10 10 0 0 1-20 0V6.5Z" fill={`url(#owl${id})`} />
      <Circle cx={12} cy={15.5} r={4.2} fill={c.bg} />
      <Circle cx={20} cy={15.5} r={4.2} fill={c.bg} />
      <Circle cx={12.6} cy={15.2} r={1.6} fill={eyes ?? c.accent} />
      <Circle cx={20.6} cy={15.2} r={1.6} fill={eyes ?? c.accent} />
      <Path d="M16 19.2 14.6 21.6h2.8L16 19.2Z" fill={c.bg} />
    </Svg>
  );
}

/** Логотип: сова + «N'Owl». */
export function Logo({ size = 26 }: { size?: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <OwlMark size={size} />
      <RNText style={{ color: c.text, fontFamily: fonts.black, fontSize: size * 0.72, letterSpacing: -0.8 }}>
        N'Owl
      </RNText>
    </View>
  );
}

/** Головна дія — бурштиновий градієнт, як у v1. */
export function AccentFill({ style, children }: { style?: ViewStyle; children?: ReactNode }) {
  const c = useColors();
  return (
    <LinearGradient
      colors={[c.accentStrong, c.accent, c.accentLo]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

/** Сегментований перемикач (.seg-switch з v1). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View style={[styles.seg, { borderColor: c.border, backgroundColor: c.surface2 }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, active && { backgroundColor: c.accentSoft }]}
          >
            <RNText
              style={{ color: active ? c.accent : c.textMuted, fontFamily: fonts.semibold, fontSize: 13 }}
            >
              {o.label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  size = "md",
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: "sm" | "md" | "lg";
}) {
  const c = useColors();
  const gradient = variant === "primary" || variant === "accent";
  const bg = {
    primary: "transparent",
    accent: "transparent",
    outline: "transparent",
    ghost: "transparent",
    danger: c.danger,
  }[variant];
  const fg = { primary: c.onAccent, accent: c.onAccent, outline: c.text, ghost: c.textMuted, danger: "#fff" }[
    variant
  ];
  const height = { sm: 34, md: 44, lg: 52 }[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          height,
          paddingHorizontal: size === "sm" ? 14 : 22,
          opacity: disabled ? 0.5 : 1,
        },
        variant === "outline" && { borderWidth: 1, borderColor: c.borderStrong },
        gradient && { overflow: "hidden" },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {gradient ? <AccentFill style={StyleSheet.absoluteFill} /> : null}
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
      <RNText style={{ color: fg, fontFamily: fonts.bold, fontSize: size === "sm" ? 13 : 15 }}>
        {title}
      </RNText>
    </Pressable>
  );
}

export function IconButton({
  children,
  onPress,
  label,
  size = 40,
  style,
  ...props
}: PressableProps & { label: string; size?: number; style?: ViewStyle; children: ReactNode }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? c.accentSoft : c.surface2 }]}
    >
      <RNText style={{ color: active ? c.accent : c.text, fontFamily: fonts.semibold, fontSize: 13 }}>
        {label}
      </RNText>
    </Pressable>
  );
}

export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const c = useColors();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: c.surface2 }, style]} />;
}

const styles = StyleSheet.create({
  vinylShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  center: { alignItems: "center", justifyContent: "center" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999 },
  seg: { flexDirection: "row", alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, padding: 3 },
  segItem: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * Платівка N'Owl (як на сайті): вінілові борозенки, обкладинка — «яблуко» в центрі, обертається під час гри.
 */
export function Vinyl({
  src,
  seed,
  playing,
  size,
  style,
}: {
  src: string | null | undefined;
  seed: string;
  playing: boolean;
  size: number;
  style?: ViewStyle;
}) {
  const c = useColors();
  const rot = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      rot.value = withRepeat(
        withTiming(rot.value + 360, { duration: 7000, easing: Easing.linear }),
        -1,
        false,
      );
    } else cancelAnimation(rot);
    return () => cancelAnimation(rot);
  }, [playing, rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value % 360}deg` }] }));
  const r = size / 2;
  const grooves: number[] = [];
  for (let x = r * 0.3; x < r * 0.97; x += Math.max(1.6, size / 90)) grooves.push(x);
  const label = Math.round(size * 0.56);
  return (
    <View style={[{ width: size, height: size, borderRadius: r }, styles.vinylShadow, style]}>
      <Animated.View style={[{ width: size, height: size, borderRadius: r, overflow: "hidden" }, spin]}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r} fill="#15151c" />
          {grooves.map((g, i) => (
            <Circle
              key={g}
              cx={r}
              cy={r}
              r={g}
              fill="none"
              stroke={i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.35)"}
              strokeWidth={0.8}
            />
          ))}
          <Circle cx={r} cy={r} r={r - 0.5} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <Cover src={src} size={label} seed={seed} round />
        </View>
        <View
          style={{
            position: "absolute",
            left: r - size * 0.04,
            top: r - size * 0.04,
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: c.bg,
          }}
        />
      </Animated.View>
      {/* Відблиск не обертається разом із диском */}
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "transparent", "rgba(255,255,255,0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        pointerEvents="none"
      />
    </View>
  );
}
