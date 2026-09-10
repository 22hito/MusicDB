import React from 'react';
import { Stack } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';

export default function ProfileLayout() {
  const { theme } = useSettings();
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
      <Stack.Screen name="playlist/[id]" options={{ title: '' }} />
    </Stack>
  );
}
