// Лише потрібні начертання: імпорт із кореня пакета тягне в бандл усі 18 файлів шрифту.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Inter_900Black } from "@expo-google-fonts/inter/900Black";
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display/600SemiBold";
import { PlayfairDisplay_600SemiBold_Italic } from "@expo-google-fonts/playfair-display/600SemiBold_Italic";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { connectRealtime } from "@musicdb/sdk";
import { ApiProvider, applyRealtimeEvent, startPolling, useMe } from "@musicdb/sdk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { client } from "@/lib/api";
import { sessionCookie } from "@/lib/auth";
import { REALTIME_URL } from "@/lib/config";
import { PrefsProvider, usePrefs } from "@/lib/theme";
import { PlayerEngine } from "@/player/engine";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ApiProvider client={client}>
            <PrefsProvider>
              <Root />
            </PrefsProvider>
          </ApiProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const { colors, dark, motion } = usePrefs();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <ReducedMotionConfig
        mode={
          motion === "full"
            ? ReduceMotion.Never
            : motion === "reduced"
              ? ReduceMotion.Always
              : ReduceMotion.System
        }
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="player"
          options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="queue" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="login" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="report" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen
          name="admin-track"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
      <PlayerEngine />
      <RealtimeSync />
    </View>
  );
}

/** WebSocket з cookie сесії: події сервера оновлюють кеш запитів; повернення в застосунок — перепідключення. */
/** Сервер на Vercel без WebSocket (EXPO_PUBLIC_REALTIME=off) — тоді опитування. */
const REALTIME_ON = process.env.EXPO_PUBLIC_REALTIME !== "off";

function RealtimeSync() {
  const me = useMe().data;
  const qc = useQueryClient();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  useEffect(() => {
    if (!me || REALTIME_ON) return;
    return startPolling(qc, {
      isVisible: () => AppState.currentState === "active",
      inMessages: () => path.current.startsWith("/messages"),
    });
  }, [me, qc]);
  useEffect(() => {
    if (!me || !REALTIME_ON) return;
    const conn = connectRealtime({
      url: REALTIME_URL,
      headers: async () => ({ cookie: await sessionCookie() }),
      onEvent: (event) => applyRealtimeEvent(qc, event),
    });
    const sub = AppState.addEventListener("change", (state) => state === "active" && conn.reconnect());
    return () => {
      sub.remove();
      conn.close();
    };
  }, [me, qc]);
  return null;
}
