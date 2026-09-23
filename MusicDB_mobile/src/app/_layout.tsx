import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { Slot } from 'expo-router';
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
// на цьому рівні (лише "показати вкладки" і "показати налаштування" —
// останнє тепер звичайний <Modal>, як логін чи підтвердження видалення в
// цьому проєкті), тож <Stack> тут був не потрібен — <Slot /> рендерить
// поточний маршрут узагалі без native Screen-контейнера.

SplashScreen.preventAutoHideAsync().catch(() => {});

// Друкується одразу при завантаженні бандла (ще до першого рендеру) — щоб
// однозначно бачити в терміналі, що телефон виконує САМЕ цей, щойно
// перезібраний код, а не застарілий закешований бандл.
console.log('[DBG2] _layout.tsx module loaded — build marker v2 (Slot, no root Stack)');

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
  const { ready, apiBase, theme, settingsModalOpen, closeSettingsModal } = useSettings();
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
    <View
      style={{ flex: 1, backgroundColor: theme.bg }}
      onLayout={(e) => console.log('[DBG2] RootInner outer View', e.nativeEvent.layout)}
    >
      <ApiBridgeProvider>
        <FavoritesProvider>
          <PlayerProvider>
            <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
            <View style={{ flex: 1 }} onLayout={(e) => console.log('[DBG2] Slot wrapper View', e.nativeEvent.layout)}>
              <Slot />
            </View>
            <Modal visible={settingsModalOpen} animationType="slide" onRequestClose={closeSettingsModal}>
              <ServerSettingsScreen onSaved={closeSettingsModal} onCancel={closeSettingsModal} />
            </Modal>
          </PlayerProvider>
        </FavoritesProvider>
      </ApiBridgeProvider>
    </View>
  );
}
