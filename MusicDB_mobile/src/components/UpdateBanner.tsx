import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SANS_MEDIUM, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';

const RECHECK_MS = 15 * 60 * 1000;

// Оновлення "по повітрю" (EAS Update): новий JS-код завантажується у фоні —
// при запуску (expo-updates робить це сам) і при кожному поверненні в застосунок
// (не частіше ніж раз на 15 хв). Щойно завантажено — плашка "Перезапустити".
// У Expo Go / режимі розробки оновлення вимкнені (Updates.isEnabled = false).
export function UpdateBanner() {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const check = async () => {
      if (Date.now() - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // немає мережі — спробуємо наступного разу
      }
    };
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!Updates.isEnabled || !isUpdatePending) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + SPACING.sm }]}>
      <View style={[styles.banner, { backgroundColor: theme.elevated, borderColor: theme.accent }]}>
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
          {t('update.ready')}
        </Text>
        <TouchableOpacity onPress={() => Updates.reloadAsync().catch(() => {})} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={[styles.btnText, { color: theme.onAccent }]}>{t('update.restart')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000, elevation: 30 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 520,
    marginHorizontal: SPACING.lg,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  text: { flex: 1, fontSize: 13.5, fontFamily: FONT_SANS_MEDIUM },
  btn: { borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 13, fontFamily: FONT_SANS_SEMIBOLD },
});
