import React from 'react';
import { Stack } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';

// "Цікаве": плитки колеса фортуни, батлу, схожого смаку, виконавців і рекомендацій.
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
      <Stack.Screen name="recommendations" options={{ title: t('nav.recommendations') }} />
      <Stack.Screen name="artist/[id]" options={{ title: '' }} />
    </Stack>
  );
}
