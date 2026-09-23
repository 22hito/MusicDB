import React from 'react';
import { Stack } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';

// Та сама схема, що й profile/_layout: список усередині вкладки + push-екрани діалогу й гілки.
export default function CommunityLayout() {
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
      <Stack.Screen name="chat/[userId]" options={{ title: '' }} />
      <Stack.Screen name="thread/[id]" options={{ title: '' }} />
    </Stack>
  );
}
