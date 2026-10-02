import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SANS_BOLD, FONT_SANS_SEMIBOLD, RADIUS } from '@/constants/theme';

// Число з кнопками − / + і полем, у яке можна просто вписати значення з клавіатури
// (замість сотні натискань до потрібного). Утримання − / + прокручує значення з прискоренням.
// Нове значення застосовується при «Готово» на клавіатурі або коли поле втрачає фокус;
// поза межами — притискається до min…max, сміття — повертає попереднє.
export function NumberStepper({
  value,
  min,
  max,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { theme } = useSettings();
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const repeat = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef(value);
  live.current = value;

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  useEffect(() => () => stopRepeat(), []);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const commit = () => {
    const n = parseInt(draft.replace(/\D/g, ''), 10);
    const next = Number.isFinite(n) ? clamp(n) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const step = (dir: -1 | 1) => {
    const next = clamp(live.current + dir);
    if (next !== live.current) {
      live.current = next;
      onChange(next);
    }
  };
  // Утримання: перший повтор за 380 мс, далі все швидше (до ~25 кроків на секунду).
  const startRepeat = (dir: -1 | 1) => {
    let delay = 380;
    const tick = () => {
      step(dir);
      delay = Math.max(40, delay * 0.82);
      repeat.current = setTimeout(tick, delay);
    };
    repeat.current = setTimeout(tick, delay);
  };
  function stopRepeat() {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  }

  const btn = (dir: -1 | 1) => {
    const off = disabled || (dir < 0 ? value <= min : value >= max);
    return (
      <Pressable
        disabled={off}
        onPress={() => step(dir)}
        onLongPress={() => startRepeat(dir)}
        onPressOut={stopRepeat}
        delayLongPress={350}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={dir < 0 ? '−' : '+'}
        style={({ pressed }) => [
          styles.btn,
          { borderColor: theme.border, backgroundColor: pressed ? theme.borderStrong : theme.surface2, opacity: off ? 0.4 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Text style={[styles.sign, { color: theme.text }]}>{dir < 0 ? '−' : '+'}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.row}>
      {btn(-1)}
      <TextInput
        value={draft}
        onChangeText={(v) => setDraft(v.replace(/\D/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onSubmitEditing={commit}
        editable={!disabled}
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={String(max).length}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.input,
          { color: theme.accent, backgroundColor: theme.bg, borderColor: focused ? theme.accent : theme.border, opacity: disabled ? 0.5 : 1 },
        ]}
      />
      {btn(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 38, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sign: { fontSize: 20, fontFamily: FONT_SANS_BOLD, lineHeight: 22 },
  input: { width: 52, height: 40, borderWidth: 1, borderRadius: RADIUS.sm, textAlign: 'center', fontSize: 17, fontFamily: FONT_SANS_SEMIBOLD, paddingVertical: 0 },
});
