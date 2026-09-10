import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { FONT_MONO_MEDIUM, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';

export function Heading({ pre, accent }: { pre: string; accent: string }) {
  const { theme } = useSettings();
  return (
    <Text style={{ fontFamily: FONT_SERIF_BOLD, fontSize: 22, color: theme.text, marginBottom: SPACING.lg }}>
      {pre} <Text style={{ color: theme.accent }}>{accent}</Text>
    </Text>
  );
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
  const bg =
    variant === 'primary'
      ? theme.accent
      : variant === 'success'
        ? theme.green
        : variant === 'danger'
          ? theme.red
          : 'transparent';
  const color =
    variant === 'primary' || variant === 'success' ? theme.onAccent : variant === 'danger' ? '#fff' : theme.text;
  const borderColor = variant === 'outline' || variant === 'plain' ? theme.border : bg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.btnText, small && styles.btnTextSmall, { color }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Badge({ label, kind = 'genre' }: { label: string; kind?: 'genre' | 'album' }) {
  const { theme } = useSettings();
  const isAlbum = kind === 'album';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isAlbum ? `${theme.accent}1f` : `${theme.accent2}26`,
          borderColor: isAlbum ? `${theme.accent}4d` : `${theme.accent2}4d`,
        },
      ]}
    >
      <Text
        numberOfLines={isAlbum ? 2 : 1}
        style={[styles.badgeText, { color: isAlbum ? theme.accent : theme.accent2, fontFamily: FONT_MONO_MEDIUM }]}
      >
        {label}
      </Text>
    </View>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  const { theme } = useSettings();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.muted, fontFamily: FONT_MONO_MEDIUM }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.accent, fontFamily: FONT_SERIF_BOLD }]}>{value}</Text>
    </View>
  );
}

export function EmptyState({ icon, label }: { icon: string; label: string }) {
  const { theme } = useSettings();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 32, marginBottom: 10 }}>{icon}</Text>
      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function Field({
  label,
  hint,
  ...rest
}: TextInputProps & { label: string; hint?: string }) {
  const { theme } = useSettings();
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text style={[styles.fieldLabel, { color: theme.muted, fontFamily: FONT_MONO_MEDIUM }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text, fontFamily: FONT_MONO_MEDIUM },
        ]}
        {...rest}
      />
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
  },
  btnText: {
    fontFamily: FONT_MONO_MEDIUM,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  btnTextSmall: {
    fontSize: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginRight: 5,
    marginBottom: 5,
  },
  badgeText: {
    fontSize: 11,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 5,
  },
});
