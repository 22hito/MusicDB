import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Text, View, useWindowDimensions } from 'react-native';
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
  const winDims = useWindowDimensions();

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
    <>
      <DebugDimensionsOverlay />
      {/* Явний піксельний розмір замість покладання на те, що flex:1 десь
          вище (Stack/native-screens) коректно розв'яжеться до реального
          вікна — на деяких пристроях/версіях Android з примусовим
          edge-to-edge цей ланцюжок обривається, і контент займає лише
          частину екрана, а решта лишається непрофарбованою. */}
      <View style={{ width: winDims.width, height: winDims.height, backgroundColor: theme.bg }}>
        <ApiBridgeProvider>
          <FavoritesProvider>
            <PlayerProvider>
              <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{ headerShown: false }}
                screenLayout={({ children }) => (
                  <View style={{ flex: 1, borderWidth: 3, borderColor: 'cyan' }}>{children}</View>
                )}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="settings"
                  options={{ presentation: 'modal', headerShown: false }}
                />
              </Stack>
            </PlayerProvider>
          </FavoritesProvider>
        </ApiBridgeProvider>
      </View>
    </>
  );
}

// ТИМЧАСОВА діагностика half-screen бага — плаваючий оверлей поверх усього,
// щоб побачити реальні виміри незалежно від того, де саме ламається layout.
// Прибрати після знаходження причини.
function DebugDimensionsOverlay() {
  const win = Dimensions.get('window');
  const scr = Dimensions.get('screen');
  const hookDims = useWindowDimensions();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        elevation: 999,
        backgroundColor: '#ff00ff',
        padding: 6,
      }}
    >
      <Text style={{ fontSize: 12, color: '#000', fontWeight: '700' }}>
        window={Math.round(win.width)}x{Math.round(win.height)} screen={Math.round(scr.width)}x{Math.round(scr.height)} hook=
        {Math.round(hookDims.width)}x{Math.round(hookDims.height)}
      </Text>
    </View>
  );
}
