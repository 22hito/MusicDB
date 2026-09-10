import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { MiniPlayerBar } from '@/player/MiniPlayerBar';
import { NoteIcon, PersonIcon, SendIcon, ShieldIcon, StarIcon, TrophyIcon } from '@/components/Icons';

// Трохи вище за типовий (49-50px), щоб іконки й підписи мали комфортну зону дотику.
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const isAdmin = !!currentUser?.isAdmin;
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('nav.library'),
            tabBarIcon: ({ color, size }) => <NoteIcon color={String(color)} size={size ?? 20} />,
          }}
        />
        <Tabs.Screen
          name="top"
          options={{
            title: t('nav.top'),
            tabBarIcon: ({ color, size }) => <TrophyIcon color={String(color)} size={size ?? 20} />,
          }}
        />
        <Tabs.Screen
          name="request"
          options={{
            title: t('nav.request'),
            tabBarIcon: ({ color, size }) => <SendIcon color={String(color)} size={size ?? 20} />,
          }}
        />
        <Tabs.Screen
          name="recommendations"
          options={{
            title: t('nav.recommendations'),
            tabBarIcon: ({ color, size }) => <StarIcon color={String(color)} size={size ?? 20} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarIcon: ({ color, size }) => <PersonIcon color={String(color)} size={size ?? 20} />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: t('nav.admin.tab'),
            href: isAdmin ? undefined : null,
            tabBarIcon: ({ color, size }) => <ShieldIcon color={String(color)} size={size ?? 20} />,
          }}
        />
      </Tabs>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight }} pointerEvents="box-none">
        <MiniPlayerBar />
      </View>
    </View>
  );
}
