import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { ApiBridgeProvider } from '@/api/ApiBridge';
import { FavoritesProvider } from '@/state/FavoritesContext';
import { PlayerProvider } from '@/player/PlayerContext';
import { UpdateBanner } from '@/components/UpdateBanner';

// Раніше тут був expo-router-івський <Stack> ((tabs) + модальний "settings").
// Виміри (onLayout-логи на кожному рівні дерева) показали, що ЛИШЕ контент
// усередині <Stack> отримував рівно ПОЛОВИНУ висоти екрана — усе нижче
// ((tabs), Tabs, самі екрани) рахувало свій layout правильно відносно того,
// що йому дали. Причина: <Stack> у expo-router — це native-stack, який
// побудований на react-native-screens; на Fabric/New Architecture (Android)
// у ньому є активний, ще не випущений у стабільну версію баг, коли Screen-
// компонент після монтування комітить у Shadow Tree вдвічі менший розмір
// (детально: github.com/software-mansion/react-native-screens/issues/2933,
// підтверджено багатьма незалежними командами, "half screen blank/black").
// Спільнота підтверджує: баг є ТІЛЬКИ в native-stack, не в звичайному
// (не-screens) навігаторі. Ми не використовуємо жодних push/pop-переходів
// на цьому рівні (лише "показати вкладки"; налаштування — теж вкладка),
// тож <Stack> тут був не потрібен — <Slot /> рендерить
// поточний маршрут узагалі без native Screen-контейнера.

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SettingsProvider>
      <RootInner fontsLoaded={fontsLoaded} />
    </SettingsProvider>
  );
}

function RootInner({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, theme } = useSettings();
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
    return <View style={{ flex: 1, backgroundColor: '#090c14' }} />;
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ApiBridgeProvider>
        <FavoritesProvider>
          <PlayerProvider>
            <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
            <UpdateBanner />
          </PlayerProvider>
        </FavoritesProvider>
      </ApiBridgeProvider>
    </View>
  );
}
