import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Шрифти — по одному файлу з підшляху, а не з головного модуля пакета: той робить require() усіх 30
// накреслень (кожне ~350 КБ), і Metro клав у кожне OTA-оновлення ~9 МБ шрифтів замість 7 потрібних.
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display/800ExtraBold';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display/900Black';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { ApiBridgeProvider } from '@/api/ApiBridge';
import { FavoritesProvider } from '@/state/FavoritesContext';
import { PlayerProvider } from '@/player/PlayerContext';
import { UpdateBanner } from '@/components/UpdateBanner';
import { ThreadReplyToast } from '@/components/ThreadReplyToast';

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

  // GestureHandlerRootView — без нього жести (колесо, зум графів) мовчки не працюють.
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ApiBridgeProvider>
        <FavoritesProvider>
          <PlayerProvider>
            <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
            <View style={{ flex: 1 }}>
              <Slot />
            </View>
            <ThreadReplyToast />
            <UpdateBanner />
          </PlayerProvider>
        </FavoritesProvider>
      </ApiBridgeProvider>
    </GestureHandlerRootView>
  );
}
