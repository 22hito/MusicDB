import React from 'react';
import { Stack } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';

// "Огляд": рекомендації + вхід у колесо фортуни, батл рояль і каталог виконавців
// (на сайті це пункти випадного меню навбару).
export default function ExploreLayout() {
  const { theme, t } = useSettings();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="wheel" options={{ title: t('nav.wheel') }} />
      <Stack.Screen name="battle" options={{ title: t('nav.battle') }} />
      <Stack.Screen name="taste" options={{ title: t('nav.taste') }} />
      <Stack.Screen name="artists" options={{ title: t('nav.artists') }} />
      <Stack.Screen name="artist/[id]" options={{ title: '' }} />
    </Stack>
  );
}
