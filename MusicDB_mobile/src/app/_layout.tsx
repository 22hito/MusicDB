import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { ApiBridgeProvider } from '@/api/ApiBridge';
import { FavoritesProvider } from '@/state/FavoritesContext';
import { PlayerProvider } from '@/player/PlayerContext';
import { ServerSettingsScreen } from '@/screens/ServerSettingsScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    DMMono_300Light,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  return (
    <SettingsProvider>
      <RootInner fontsLoaded={fontsLoaded} />
    </SettingsProvider>
  );
}

function RootInner({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, apiBase, theme } = useSettings();
  const [hidden, setHidden] = useState(false);

  const maybeHideSplash = useCallback(async () => {
    if (fontsLoaded && ready && !hidden) {
      setHidden(true);
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, ready, hidden]);

  useEffect(() => {
    maybeHideSplash();
  }, [maybeHideSplash]);

  if (!fontsLoaded || !ready) {
    return <View style={{ flex: 1, backgroundColor: '#0d0d0f' }} />;
  }

  if (!apiBase) {
    return (
      <>
        <StatusBar style="light" />
        <ServerSettingsScreen onSaved={() => {}} />
      </>
    );
  }

  return (
    <ApiBridgeProvider>
      <FavoritesProvider>
        <PlayerProvider>
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </PlayerProvider>
      </FavoritesProvider>
    </ApiBridgeProvider>
  );
}
