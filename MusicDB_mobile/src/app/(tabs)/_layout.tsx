import React, { useState } from 'react';
import { Dimensions, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { MiniPlayerBar } from '@/player/MiniPlayerBar';
import { BrandHeader } from '@/components/BrandHeader';
import { NoteIcon, PersonIcon, SendIcon, ShieldIcon, StarIcon, TrophyIcon } from '@/components/Icons';

// Трохи вище за типовий (49-50px), щоб іконки й підписи мали комфортну зону дотику.
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const isAdmin = !!currentUser?.isAdmin;
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  // ТИМЧАСОВА діагностика для half-screen бага — прибрати після знаходження причини.
  const [rootH, setRootH] = useState(0);
  const [wrapH, setWrapH] = useState(0);
  const winH = Dimensions.get('window').height;

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, borderWidth: 3, borderColor: 'red' }}
      onLayout={(e) => setRootH(e.nativeEvent.layout.height)}
    >
      {/* absolute, а не звичайна дитина у flow — щоб гарантовано бути видимим
          незалежно від того, де саме ламається layout (звичайний варіант
          цього напису раніше не показувався взагалі, на відміну від
          рожевого оверлею в app/_layout.tsx, який теж absolute). */}
      <View style={{ position: 'absolute', top: 30, left: 0, right: 0, zIndex: 99998, elevation: 998, backgroundColor: '#ff0', padding: 4 }} pointerEvents="none">
        <Text style={{ fontSize: 11, color: '#000' }}>
          window={Math.round(winH)} root={Math.round(rootH)} wrap={Math.round(wrapH)} insetsTop={Math.round(insets.top)} insetsBottom={Math.round(insets.bottom)}
        </Text>
      </View>
      <BrandHeader />
      {/* <Tabs> не бере flex:1 сам по собі, коли він більше не єдина дитина
          (з'явився BrandHeader-сусід) — без цієї обгортки контент і таббар
          стискались у верхню половину екрана, а решта лишалась порожньою. */}
      <View style={{ flex: 1, borderWidth: 3, borderColor: 'lime' }} onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}>
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
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight }} pointerEvents="box-none">
        <MiniPlayerBar />
      </View>
    </View>
  );
}
