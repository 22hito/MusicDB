import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings, type StartTab } from '@/state/SettingsContext';
import { TileGrid } from '@/components/UI';
import { ChatIcon, NoteIcon, SparkleIcon, TrophyIcon } from '@/components/Icons';
import {
  ACCENT_KEYS,
  FONT_SANS_BOLD,
  FONT_SANS_REGULAR,
  FONT_SANS_SEMIBOLD,
  FONT_SERIF_BLACK,
  RADIUS,
  SPACING,
  accentSwatch,
  buildTheme,
  type ThemeMode,
  type ThemePref,
} from '@/constants/theme';
import type { Lang } from '@/constants/i18n';

// Мініатюра теми на плитці: тло, картка й акцент саме цієї теми — видно, що обираєш, ще до натискання.
function ThemePreview({ mode, split }: { mode: ThemeMode; split?: ThemeMode }) {
  const { accent, theme } = useSettings();
  const a = buildTheme(mode, accent);
  const b = split ? buildTheme(split, accent) : null;
  const half = (th: typeof a, style: object) => (
    <View style={[styles.previewHalf, { backgroundColor: th.bg }, style]}>
      <View style={[styles.previewBar, { backgroundColor: th.surface2 }]} />
      <View style={[styles.previewDot, { backgroundColor: th.accent }]} />
    </View>
  );
  return (
    <View style={[styles.preview, { borderColor: theme.borderStrong }]}>
      {half(a, b ? { right: '50%' } : { right: 0 })}
      {b ? half(b, { left: '50%' }) : null}
    </View>
  );
}

// Налаштування інтерфейсу. Усе — сітками рівних плиток («як цеглинки»), згрупованими у дві картки:
// «Вигляд» (тема, акцент) і «Застосунок» (стартова вкладка, мова). Діє одразу, зберігається на пристрої.
export function SettingsScreen() {
  const { theme, t, themeMode, setThemeMode, accent, setAccent, lang, setLang, startTab, setStartTab } = useSettings();

  const section = (title: string) => <Text style={[styles.section, { color: theme.muted }]}>{title}</Text>;
  const label = (text: string, hint?: string) => (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[styles.label, { color: theme.text }]}>{text}</Text>
      {hint ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
    </View>
  );
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>{t('settings.sub')}</Text>

        {section(t('settings.section.look'))}
        <View style={card}>
          {label(t('settings.theme'))}
          <TileGrid<ThemePref>
            columns={4}
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { value: 'dark', label: t('theme.dark'), preview: <ThemePreview mode="dark" /> },
              { value: 'gray', label: t('theme.gray'), preview: <ThemePreview mode="gray" /> },
              { value: 'light', label: t('theme.light'), preview: <ThemePreview mode="light" /> },
              { value: 'system', label: t('theme.system'), preview: <ThemePreview mode="light" split="dark" /> },
            ]}
          />

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {label(t('settings.accent'), t('settings.accent.hint'))}
          {/* Ті самі 6 пресетів, що й на сайті, — рівним рядом на всю ширину. */}
          <View style={styles.swatches}>
            {ACCENT_KEYS.map((key) => {
              const [hi, lo] = accentSwatch(key);
              const active = key === accent;
              return (
                <Pressable
                  key={key}
                  onPress={() => setAccent(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`settings.accent.${key}` as 'settings.accent.amber')}
                  hitSlop={4}
                  style={({ pressed }) => [styles.swatchRing, { borderColor: active ? theme.text : 'transparent', transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                >
                  <LinearGradient colors={[hi, lo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch} />
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.accentName, { color: theme.accent }]}>{t(`settings.accent.${accent}` as 'settings.accent.amber')}</Text>
        </View>

        {section(t('settings.section.app'))}
        <View style={card}>
          {label(t('settings.startTab'), t('settings.startTab.hint'))}
          <TileGrid<StartTab>
            columns={2}
            value={startTab}
            onChange={setStartTab}
            options={[
              { value: 'index', label: t('nav.library'), icon: (c) => <NoteIcon size={18} color={c} /> },
              { value: 'top', label: t('nav.topShort'), icon: (c) => <TrophyIcon size={18} color={c} /> },
              { value: 'community', label: t('nav.social'), icon: (c) => <ChatIcon size={18} color={c} /> },
              { value: 'explore', label: t('nav.explore'), icon: (c) => <SparkleIcon size={18} color={c} /> },
            ]}
          />

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {label(t('settings.language'))}
          <TileGrid<Lang>
            columns={2}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'uk', label: t('lang.uk'), icon: (c) => <Text style={[styles.langCode, { color: c }]}>UK</Text> },
              { value: 'en', label: t('lang.en'), icon: (c) => <Text style={[styles.langCode, { color: c }]}>EN</Text> },
            ]}
          />
        </View>

        <Text style={[styles.version, { color: theme.muted }]}>N'Owl · {t('settings.version')} {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Відступи як в інших вкладках + запас під міні-плеєр.
  content: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 140 },
  title: { fontFamily: FONT_SERIF_BLACK, fontSize: 30, lineHeight: 36, marginTop: SPACING.md },
  sub: { fontFamily: FONT_SANS_REGULAR, fontSize: 14, lineHeight: 20, marginTop: 6 },
  section: { fontFamily: FONT_SANS_BOLD, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: SPACING.xl, marginBottom: SPACING.sm, marginLeft: 4 },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg },
  label: { fontFamily: FONT_SANS_SEMIBOLD, fontSize: 15 },
  hint: { fontFamily: FONT_SANS_REGULAR, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.lg },
  preview: { width: '100%', height: 34, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  previewHalf: { position: 'absolute', top: 0, bottom: 0, left: 0, padding: 5, gap: 4 },
  previewBar: { height: 6, borderRadius: 3, width: '80%' },
  previewDot: { width: 9, height: 9, borderRadius: 5 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  accentName: { fontFamily: FONT_SANS_SEMIBOLD, fontSize: 12.5, marginTop: SPACING.sm, textAlign: 'center' },
  langCode: { fontFamily: FONT_SANS_BOLD, fontSize: 13, letterSpacing: 1 },
  version: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
