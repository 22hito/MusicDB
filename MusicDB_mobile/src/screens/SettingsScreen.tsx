import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '@/state/SettingsContext';
import { Card, SegmentedPicker } from '@/components/UI';
import { ContrastIcon, MonitorIcon, MoonIcon, SunIcon } from '@/components/Icons';
import {
  ACCENT_KEYS,
  FONT_SANS_REGULAR,
  FONT_SANS_SEMIBOLD,
  FONT_SERIF_BLACK,
  SPACING,
  accentSwatch,
  type ThemePref,
} from '@/constants/theme';
import type { Lang } from '@/constants/i18n';

// Налаштування інтерфейсу — як картка "Вигляд" на сторінці налаштувань сайту:
// тема, акцентний колір, мова. Адреси сервера тут немає (див. SettingsContext).
// Вкладка таббару "Налаштування" (як на мобільному сайті).
export function SettingsScreen() {
  const { theme, t, themeMode, setThemeMode, accent, setAccent, lang, setLang } = useSettings();

  const label = (text: string) => <Text style={[styles.label, { color: theme.text }]}>{text}</Text>;

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>{t('settings.sub')}</Text>

        <Card style={{ gap: SPACING.xl }}>
          <View>
            {label(t('settings.theme'))}
            <SegmentedPicker<ThemePref>
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: 'dark', label: t('theme.dark'), icon: (c) => <MoonIcon size={15} color={c} /> },
                { value: 'gray', label: t('theme.gray'), icon: (c) => <ContrastIcon size={15} color={c} /> },
                { value: 'light', label: t('theme.light'), icon: (c) => <SunIcon size={15} color={c} /> },
                { value: 'system', label: t('theme.system'), icon: (c) => <MonitorIcon size={15} color={c} /> },
              ]}
            />
          </View>

          {/* Ті самі 6 пресетів акценту, що й на сайті. */}
          <View>
            {label(t('settings.accent'))}
            <Text style={[styles.hint, { color: theme.muted }]}>{t('settings.accent.hint')}</Text>
            <View style={styles.swatches}>
              {ACCENT_KEYS.map((key) => {
                const [hi, lo] = accentSwatch(key);
                const active = key === accent;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setAccent(key)}
                    accessibilityLabel={t(`settings.accent.${key}` as 'settings.accent.amber')}
                    style={[styles.swatchRing, { borderColor: active ? theme.text : 'transparent' }]}
                  >
                    <LinearGradient colors={[hi, lo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            {label(t('settings.language'))}
            <SegmentedPicker<Lang>
              value={lang}
              onChange={setLang}
              options={[
                { value: 'uk', label: t('lang.uk') },
                { value: 'en', label: t('lang.en') },
              ]}
            />
          </View>
        </Card>

        <Text style={[styles.version, { color: theme.muted }]}>N'Owl {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Відступи як в інших вкладках + запас під міні-плеєр.
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 140 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 22 },
  title: { fontFamily: FONT_SERIF_BLACK, fontSize: 30, lineHeight: 36, marginTop: SPACING.md },
  sub: { fontFamily: FONT_SANS_REGULAR, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: SPACING.xl },
  label: { fontFamily: FONT_SANS_SEMIBOLD, fontSize: 15, marginBottom: 10 },
  hint: { fontFamily: FONT_SANS_REGULAR, fontSize: 12.5, lineHeight: 18, marginTop: -4, marginBottom: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
});
