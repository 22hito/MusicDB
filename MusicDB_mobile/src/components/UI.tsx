import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSettings } from '@/state/SettingsContext';
import {
  FONT_SANS_MEDIUM,
  FONT_SANS_REGULAR,
  FONT_SANS_SEMIBOLD,
  FONT_SERIF_BLACK,
  CONTROL_HEIGHT,
  RADIUS,
  SPACING,
} from '@/constants/theme';
import { PersonIcon } from './Icons';

// Заголовок сторінки як .section-heading на сайті: Playfair Display 900,
// друге слово — акцентом.
export function Heading({ pre, accent }: { pre: string; accent: string }) {
  const { theme } = useSettings();
  return (
    <Text style={{ fontFamily: FONT_SERIF_BLACK, fontSize: 28, lineHeight: 34, color: theme.text, marginBottom: SPACING.lg, letterSpacing: -0.3 }}>
      {pre} <Text style={{ color: theme.accent }}>{accent}</Text>
    </Text>
  );
}

// Картка-поверхня: .card на сайті (surface, тонка рамка, радіус 18).
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useSettings();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'outline' | 'success' | 'danger' | 'plain';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: any;
}) {
  const { theme } = useSettings();
  const color =
    variant === 'primary'
      ? theme.onAccent
      : variant === 'success'
        ? theme.bg
        : variant === 'danger'
          ? theme.onRed
          : variant === 'plain'
            ? theme.text2
            : theme.text;
  const bg = variant === 'success' ? theme.green : variant === 'danger' ? theme.red : variant === 'outline' ? theme.surface : 'transparent';
  const borderColor = variant === 'outline' ? theme.borderStrong : variant === 'plain' ? 'transparent' : bg;
  const content = loading ? (
    <ActivityIndicator size="small" color={color} />
  ) : (
    <Text numberOfLines={1} style={[styles.btnText, small && styles.btnTextSmall, { color }]}>
      {label}
    </Text>
  );

  // Відгук — у мить дотику (стиснення 0.97), а не після відпускання: так кнопка відчувається «живою».
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'primary' && styles.btnPrimary,
        style,
      ]}
    >
      {/* Основна кнопка — градієнт --accent-grad (hi → accent → lo), як "Увійти через Google". */}
      {variant === 'primary' ? (
        <LinearGradient
          colors={[theme.accentHi, theme.accent, theme.accentLo]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

// Жанр — фіолетова "таблетка" (--accent2), альбом — акцентна, як у таблиці сайту.
export function Badge({ label, kind = 'genre', active, small }: { label: string; kind?: 'genre' | 'album'; active?: boolean; small?: boolean }) {
  const { theme } = useSettings();
  const c = kind === 'album' ? theme.accent : theme.accent2;
  return (
    <View style={[styles.badge, small && styles.badgeSmall, { backgroundColor: active ? `${c}40` : `${c}1f`, borderColor: active ? c : `${c}59` }]}>
      <Text numberOfLines={kind === 'album' ? 2 : 1} style={[styles.badgeText, small && styles.badgeTextSmall, { color: c }]}>
        {label}
      </Text>
    </View>
  );
}

// Картка статистики — як .stat-card: дрібна розріджена мітка + велике число Playfair.
export function StatCard({ label, value, style, onPress }: { label: string; value: number | string; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { theme } = useSettings();
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      <Text numberOfLines={1} style={[styles.statLabel, { color: theme.muted }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.accent }]}>{value}</Text>
    </Wrap>
  );
}

export function EmptyState({ icon, label }: { icon: string; label: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 32, marginBottom: 10 }}>{icon}</Text>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', fontFamily: FONT_SANS_REGULAR }}>{label}</Text>
    </View>
  );
}

// На відміну від EmptyState — для випадку, коли завантаження саме ЗЛАМАЛОСЬ
// (немає з'єднання/сервер недоступний), а не просто немає даних.
export function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  const { theme, t } = useSettings();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 32, marginBottom: 10 }}>⚠️</Text>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16, fontFamily: FONT_SANS_REGULAR }}>
        {label}
      </Text>
      <Button label={t('common.retry')} variant="outline" small onPress={onRetry} />
    </View>
  );
}

// Сегментований перемикач — як .seg-switch на сайті: спільна рамка, активний
// сегмент підсвічений поверхнею, а не заливкою акцентом.
export function SegmentedPicker<T extends string>({
  options,
  value,
  onChange,
  fill,
}: {
  options: { value: T; label: string; icon?: (color: string) => React.ReactNode; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
  fill?: boolean; // на всю ширину, одним рядком (вкладки спілкування, перемикач таблиць)
}) {
  const { theme } = useSettings();
  return (
    <View style={[styles.segmented, fill && styles.segmentedFill, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        const color = active ? theme.text : theme.muted;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentBtn, fill && styles.segmentBtnFill, active && { backgroundColor: theme.surface2 }]}
          >
            {opt.icon ? opt.icon(active ? theme.accent : theme.muted) : null}
            <Text numberOfLines={1} style={[styles.segmentText, { color }]}>{opt.label}</Text>
            {/* Лічильник (як .count-badge на сайті): запити, непрочитані. */}
            {opt.badge ? (
              <View style={[styles.segmentBadge, { backgroundColor: theme.accent }]}>
                <Text style={[styles.segmentBadgeText, { color: theme.onAccent }]}>{opt.badge > 99 ? '99+' : opt.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Field({ label, hint, style, ...rest }: TextInputProps & { label: string; hint?: string }) {
  const { theme } = useSettings();
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text style={[styles.fieldLabel, { color: theme.text2 }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        {...rest}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, style]}
      />
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

// Аватар без фото (ні з Google, ні свого) — ініціали на кольоровому тлі, колір
// стабільний для імені; та сама палітра й логіка, що avatarHtml на сайті.
const AVATAR_COLORS = ['#c8a96e', '#8a6fb0', '#4f8c6f', '#b5555a', '#5b84a8', '#c98a4b', '#6fa89e', '#9a6b8f', '#7d9153', '#b0703f', '#5f6fa0', '#a3824f'];
export function avatarColor(name: string | null | undefined) {
  let h = 0;
  for (const ch of String(name || '?')) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function avatarInitials(name: string | null | undefined) {
  const words = String(name || '').trim().split(/[\s._\-@]+/).filter(Boolean);
  return words.slice(0, 2).map((w) => [...w][0]).join('').toUpperCase() || '?';
}

// Кругла аватарка користувача: фото або ініціали (name); без імені — силует.
export function Avatar({ url, size = 40, name }: { url: string | null | undefined; size?: number; name?: string | null }) {
  const { theme, apiBase } = useSettings();
  // Своя аватарка в посиланнях на автора — відносна адреса /api/users/{id}/avatar (див. UserDirectoryService.AvatarLink).
  const src = url?.startsWith('/') ? `${apiBase}${url}` : url;
  if (src)
    return (
      <Image
        source={{ uri: src }}
        recyclingKey={src}
        cachePolicy="memory-disk"
        contentFit="cover"
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surface2 }}
      />
    );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: name ? avatarColor(name) : theme.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {name ? (
        <Text style={{ color: '#fff', fontFamily: FONT_SERIF_BLACK, fontSize: Math.round(size * 0.38) }}>{avatarInitials(name)}</Text>
      ) : (
        <PersonIcon size={Math.round(size * 0.42)} color={theme.muted} />
      )}
    </View>
  );
}

// Заголовок секції всередині екрана (дрібні розріджені великі літери, як мітки на сайті).
export function SectionTitle({ label, right }: { label: string; right?: React.ReactNode }) {
  const { theme } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.lg, marginBottom: SPACING.sm }}>
      <Text style={{ color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: FONT_SANS_SEMIBOLD }}>{label}</Text>
      {right}
    </View>
  );
}

// Плитки рівної ширини, що лягають сіткою «як цеглинки» (тема, стартова вкладка, мова, вкладки адмінки) —
// на відміну від SegmentedPicker не переносяться рваним рядком. columns — скільки в рядку.
export function TileGrid<T extends string>({
  options,
  value,
  onChange,
  columns,
  compact,
}: {
  options: { value: T; label: string; icon?: (color: string) => React.ReactNode; preview?: React.ReactNode; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
  columns: number;
  compact?: boolean; // іконка поруч із підписом, нижча плитка (вкладки адмінки)
}) {
  const { theme } = useSettings();
  return (
    <View style={styles.tiles} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value;
        const color = active ? theme.accent : theme.text2;
        return (
          <View key={opt.value} style={{ width: `${100 / columns}%`, padding: 4 }}>
          <Pressable
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tile,
              compact && styles.tileCompact,
              {
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? `${theme.accent}1c` : theme.surface2,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            {opt.preview ?? (opt.icon ? opt.icon(color) : null)}
            <Text numberOfLines={1} style={[styles.tileText, { color: active ? theme.text : theme.text2 }]}>
              {opt.label}
            </Text>
            {opt.badge ? (
              <View style={[styles.tileBadge, { backgroundColor: theme.accent }]}>
                <Text style={[styles.segmentBadgeText, { color: theme.onAccent }]}>{opt.badge > 99 ? '99+' : opt.badge}</Text>
              </View>
            ) : null}
          </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Сітка плиток: від'ємні поля + внутрішній відступ = однакові проміжки між плитками.
  tiles: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  tile: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 1,
    minHeight: 72,
  },
  tileCompact: { flexDirection: 'row', minHeight: 48, paddingVertical: 10, gap: 8 },
  tileText: { fontSize: 13, fontFamily: FONT_SANS_SEMIBOLD, flexShrink: 1 },
  tileBadge: { position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  btn: {
    minHeight: CONTROL_HEIGHT,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnPrimary: {
    borderWidth: 0,
    borderRadius: RADIUS.pill,
  },
  btnSmall: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md + 2,
  },
  btnText: {
    fontFamily: FONT_SANS_SEMIBOLD,
    fontSize: 15,
  },
  btnTextSmall: {
    fontSize: 13.5,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: FONT_SANS_MEDIUM,
  },
  // Компактний (картки пісень): відступи між чипами задає контейнер через gap.
  badgeSmall: { paddingVertical: 2, paddingHorizontal: 8, marginRight: 0, marginBottom: 0 },
  badgeTextSmall: { fontSize: 11 },
  statCard: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    // Компактніше — як лічильники на мобільному сайті.
    paddingVertical: SPACING.md,
    paddingHorizontal: 14,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 6,
    fontFamily: FONT_SANS_SEMIBOLD,
  },
  statValue: {
    fontSize: 27,
    lineHeight: 32,
    fontFamily: FONT_SERIF_BLACK,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 16,
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 2,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  segmentedFill: {
    alignSelf: 'stretch',
    flexWrap: 'nowrap',
  },
  segmentBtnFill: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 5,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: FONT_SANS_SEMIBOLD,
    flexShrink: 1,
  },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    fontSize: 10.5,
    fontFamily: FONT_SANS_SEMIBOLD,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 7,
    fontFamily: FONT_SANS_SEMIBOLD,
  },
  input: {
    minHeight: CONTROL_HEIGHT,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONT_SANS_REGULAR,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
    fontFamily: FONT_SANS_REGULAR,
  },
});
