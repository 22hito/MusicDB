import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { CalendarIcon, ChevronRightIcon } from './Icons';
import { CONTROL_HEIGHT, FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';

// Поле дати як <input type="date"> на сайті: показує дд.мм.рррр, по дотику —
// календар. Значення — рядок yyyy-MM-dd (формат API). Календар власний, без
// нативного модуля, тож приходить OTA-оновленням без перезбірки APK.
// Для старих релізів — швидкий перехід: заголовок → роки → місяці → дні.

const MONTHS = {
  uk: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WEEKDAYS = { uk: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'], en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] };

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(v: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '');
  if (!match) return null;
  const y = +match[1];
  const m = +match[2] - 1;
  const d = +match[3];
  return m >= 0 && m < 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
}

export function formatDate(v: string | null | undefined): string {
  const p = parseIso(v);
  return p ? `${pad(p.d)}.${pad(p.m + 1)}.${p.y}` : '';
}

type Mode = 'days' | 'months' | 'years';

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { theme, t, lang } = useSettings();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('days');
  const now = new Date();
  const selected = parseIso(value);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const show = () => {
    setView(selected ? { y: selected.y, m: selected.m } : { y: now.getFullYear(), m: now.getMonth() });
    setMode('days');
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const shift = (dir: 1 | -1) => {
    if (mode === 'days') {
      const m = view.m + dir;
      setView({ y: view.y + Math.floor(m / 12), m: (m + 12) % 12 });
    } else {
      setView({ ...view, y: view.y + dir * (mode === 'years' ? 12 : 1) });
    }
  };

  const yearStart = view.y - (((view.y % 12) + 12) % 12);
  const title =
    mode === 'days' ? `${MONTHS[lang][view.m]} ${view.y}` : mode === 'months' ? String(view.y) : `${yearStart} – ${yearStart + 11}`;

  // Сітка днів: тиждень з понеділка, порожні клітинки до першого числа.
  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const cell = (key: string | number, text: string, active: boolean, marked: boolean, onPress: () => void, wide = false) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[
        wide ? styles.wideCell : styles.dayCell,
        active && { backgroundColor: theme.accent },
        !active && marked && { borderWidth: 1, borderColor: theme.accent },
      ]}
    >
      <Text style={{ color: active ? theme.onAccent : theme.text, fontSize: 15, fontFamily: active ? FONT_SANS_SEMIBOLD : FONT_SANS_REGULAR }}>
        {text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text style={[styles.label, { color: theme.text2 }]}>{label}</Text>
      <TouchableOpacity onPress={show} style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.fieldText, { color: selected ? theme.text : theme.muted }]}>{formatDate(value) || t('date.placeholder')}</Text>
        <CalendarIcon size={17} color={theme.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]}
            onPress={() => {}}
          >
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
            <View style={styles.header}>
              <TouchableOpacity onPress={() => shift(-1)} style={styles.navBtn} hitSlop={8}>
                <View style={{ transform: [{ rotate: '180deg' }] }}>
                  <ChevronRightIcon size={18} color={theme.text} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode(mode === 'years' ? 'days' : 'years')}
                style={[styles.titleBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shift(1)} style={styles.navBtn} hitSlop={8}>
                <ChevronRightIcon size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {mode === 'days' ? (
              <>
                <View style={styles.row}>
                  {WEEKDAYS[lang].map((w) => (
                    <Text key={w} style={[styles.weekday, { color: theme.muted }]}>
                      {w}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((d, i) =>
                    d === null ? (
                      <View key={`e${i}`} style={styles.dayCell} />
                    ) : (
                      cell(
                        i,
                        String(d),
                        !!selected && selected.y === view.y && selected.m === view.m && selected.d === d,
                        now.getFullYear() === view.y && now.getMonth() === view.m && now.getDate() === d,
                        () => pick(toIso(view.y, view.m, d)),
                      )
                    ),
                  )}
                </View>
              </>
            ) : mode === 'months' ? (
              <View style={styles.grid}>
                {MONTHS[lang].map((name, m) =>
                  cell(
                    m,
                    name.slice(0, 3),
                    !!selected && selected.y === view.y && selected.m === m,
                    false,
                    () => {
                      setView({ y: view.y, m });
                      setMode('days');
                    },
                    true,
                  ),
                )}
              </View>
            ) : (
              <View style={styles.grid}>
                {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) =>
                  cell(
                    y,
                    String(y),
                    selected?.y === y,
                    now.getFullYear() === y,
                    () => {
                      setView({ y, m: view.m });
                      setMode('months');
                    },
                    true,
                  ),
                )}
              </View>
            )}

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity onPress={() => pick('')} style={styles.footerBtn}>
                <Text style={{ color: theme.muted, fontSize: 15, fontFamily: FONT_SANS_MEDIUM }}>{t('date.clear')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pick(toIso(now.getFullYear(), now.getMonth(), now.getDate()))} style={styles.footerBtn}>
                <Text style={{ color: theme.accent, fontSize: 15, fontFamily: FONT_SANS_SEMIBOLD }}>{t('date.today')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 7, fontFamily: FONT_SANS_SEMIBOLD },
  field: { height: CONTROL_HEIGHT, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldText: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_REGULAR },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleBtn: { paddingHorizontal: 14, height: 36, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: FONT_SANS_SEMIBOLD },
  row: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontFamily: FONT_SANS_MEDIUM, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  wideCell: { width: '25%', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: SPACING.md, paddingTop: SPACING.sm },
  footerBtn: { paddingVertical: 10, paddingHorizontal: 6 },
});
