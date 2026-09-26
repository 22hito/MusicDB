import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { Heading } from '@/components/UI';
import { ChevronRightIcon, MicIcon, SparkleIcon, SwordsIcon, UsersIcon, WheelIcon } from '@/components/Icons';
import { FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';

// Вкладка "Цікаве" — як на сайті: плитки колеса фортуни, батлу, схожого смаку,
// виконавців і рекомендацій (рекомендації — окремим екраном).
export default function ExploreScreen() {
  const { theme, t } = useSettings();

  const tiles = [
    { key: 'wheel', icon: WheelIcon, title: t('nav.wheel'), sub: t('explore.wheelSub'), href: '/explore/wheel' as const },
    { key: 'battle', icon: SwordsIcon, title: t('nav.battle'), sub: t('explore.battleSub'), href: '/explore/battle' as const },
    { key: 'taste', icon: UsersIcon, title: t('nav.taste'), sub: t('explore.tasteSub'), href: '/explore/taste' as const },
    { key: 'artists', icon: MicIcon, title: t('nav.artists'), sub: t('explore.artistsSub'), href: '/explore/artists' as const },
    { key: 'rec', icon: SparkleIcon, title: t('nav.recommendations'), sub: t('explore.recSub'), href: '/explore/recommendations' as const },
  ];

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 120 }}>
        <Heading pre={t('explore.heading.pre')} accent={t('explore.heading.accent')} />
        {tiles.map(({ key, icon: Icon, title, sub, href }) => (
          <TouchableOpacity
            key={key}
            onPress={() => router.push(href)}
            style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={[styles.tileIcon, { backgroundColor: `${theme.accent}1f`, borderColor: `${theme.accent}4d` }]}>
              <Icon size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 16 }}>{title}</Text>
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
            </View>
            <ChevronRightIcon size={16} color={theme.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 64,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
