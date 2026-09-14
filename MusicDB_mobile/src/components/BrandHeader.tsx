import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SERIF_BOLD, SPACING } from '@/constants/theme';

// Той самий бренд-рядок, що й у шапці сайту (owl-іконка + золотий серифний
// "N'Owl") — у застосунку його не було зовсім, екрани одразу починались з
// контенту, тож бренд відчувався лише на іконці застосунку.
export function BrandHeader() {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.bg, borderBottomColor: theme.border },
      ]}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
      <Image source={require('../../assets/images/owl-header-icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.wordmark, { color: theme.accent, fontFamily: FONT_SERIF_BOLD }]}>N'Owl</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  logo: {
    width: 20,
    height: 20 * (324 / 180),
  },
  wordmark: {
    fontSize: 18,
  },
});
