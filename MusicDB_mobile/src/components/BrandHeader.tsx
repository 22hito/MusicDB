import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SERIF_BLACK, SPACING } from '@/constants/theme';
import { SearchIcon } from './Icons';
import { SearchModal } from './SearchModal';

// Той самий бренд-рядок, що й у шапці сайту (owl-іконка + золотий серифний
// "N'Owl") — у застосунку його не було зовсім, екрани одразу починались з
// контенту, тож бренд відчувався лише на іконці застосунку.
// Праворуч — глобальний пошук (пісні, виконавці, люди), як у навбарі сайту.
export function BrandHeader() {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.bg, borderBottomColor: theme.border },
      ]}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
      <Image source={require('../../assets/images/owl-header-icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.wordmark, { color: theme.accent, fontFamily: FONT_SERIF_BLACK }]}>N'Owl</Text>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        onPress={() => setSearchOpen(true)}
        hitSlop={10}
        accessibilityLabel={t('navSearch.placeholder')}
        style={[styles.searchBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
      >
        <SearchIcon size={17} color={theme.muted} />
      </TouchableOpacity>
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
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
    fontSize: 20,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
