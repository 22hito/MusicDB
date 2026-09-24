import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { ChevronRightIcon, SearchIcon } from './Icons';
import { CONTROL_HEIGHT, FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';

// Поле вибору замість нативного <Picker>: той на Android у полі фіксованої
// висоти обрізав нижню частину тексту, і виглядав по-різному на різних
// телефонах. Тут — рядок у стилі інших полів + аркуш зі списком і пошуком.
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  title,
  searchable,
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  title: string;
  searchable?: boolean;
  style?: object;
}) {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ql ? options.filter((o) => o.label.toLowerCase().includes(ql)) : options;
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: theme.surface, borderColor: value ? theme.accent2 : theme.border }, style]}
      >
        <Text numberOfLines={1} style={[styles.fieldText, { color: theme.text }]}>
          {current?.label ?? title}
        </Text>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <ChevronRightIcon size={14} color={theme.muted} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]}
            onPress={() => {}}
          >
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {searchable ? (
              <View style={[styles.search, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                <SearchIcon size={15} color={theme.muted} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={t('navSearch.placeholder').split(',')[0] + '…'}
                  placeholderTextColor={theme.muted}
                  style={[styles.searchInput, { color: theme.text }]}
                />
              </View>
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value || '__all'}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    style={[styles.option, { borderColor: theme.border }, active && { backgroundColor: `${theme.accent}14` }]}
                  >
                    <Text numberOfLines={1} style={[styles.optionText, { color: active ? theme.accent : theme.text }]}>
                      {item.label}
                    </Text>
                    {active ? <Text style={{ color: theme.accent, fontSize: 15 }}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: CONTROL_HEIGHT,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldText: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_MEDIUM },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 16, fontFamily: FONT_SANS_SEMIBOLD, marginBottom: SPACING.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: CONTROL_HEIGHT, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, marginBottom: SPACING.sm },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_REGULAR },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm },
  optionText: { flex: 1, fontSize: 15, fontFamily: FONT_SANS_REGULAR },
});
