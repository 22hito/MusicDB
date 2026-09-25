import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { Button } from './UI';
import { SearchIcon } from './Icons';
import { CONTROL_HEIGHT, FONT_MONO_MEDIUM, FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';

// Вибір кількох жанрів (колесо, режим "Мій вибір") — як вікно вибору жанрів на сайті:
// пошук, жанри-"пігулки" з кількістю пісень, "Очистити" / "Готово".
export function GenrePickerModal({
  visible,
  genres,
  selected,
  onChange,
  onClose,
  title,
  format = (g) => g,
}: {
  visible: boolean;
  genres: { name: string; count: number }[];
  selected: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
  title: string;
  format?: (g: string) => string;
}) {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const chosen = useMemo(() => new Set(selected), [selected]);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ql ? genres.filter((g) => g.name.toLowerCase().includes(ql) || format(g.name).toLowerCase().includes(ql)) : genres;
  }, [genres, q, format]);

  const toggle = (g: string) => onChange(chosen.has(g) ? selected.filter((x) => x !== g) : [...selected, g]);
  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]}
          onPress={() => {}}
        >
          <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={[styles.search, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <SearchIcon size={15} color={theme.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('wheel.searchPlaceholder')}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: SPACING.sm }}>
            {t('wheel.selectedCount').replace('{n}', String(selected.length))}
          </Text>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {list.length ? (
              list.map((g) => {
                const on = chosen.has(g.name);
                return (
                  <TouchableOpacity
                    key={g.name}
                    onPress={() => toggle(g.name)}
                    style={[
                      styles.pill,
                      { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? `${theme.accent}26` : theme.surface },
                    ]}
                  >
                    <Text style={{ color: on ? theme.accent : theme.text, fontSize: 13, fontFamily: FONT_SANS_MEDIUM }}>{format(g.name)}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11, fontFamily: FONT_MONO_MEDIUM }}>{g.count}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: theme.muted, fontSize: 13 }}>{t('wheel.nothingFound')}</Text>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Button label={t('wheel.clearBtn')} variant="outline" small onPress={() => onChange([])} style={{ flex: 1 }} />
            <Button label={t('wheel.doneBtn')} small onPress={close} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 16, fontFamily: FONT_SANS_SEMIBOLD, marginBottom: SPACING.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: CONTROL_HEIGHT, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, marginBottom: SPACING.sm },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_REGULAR },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: 12 },
  footer: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
