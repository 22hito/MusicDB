import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { ChatIcon } from './Icons';
import { FONT_SANS_SEMIBOLD, SPACING } from '@/constants/theme';

// Плашка про новий допис у гілці, де ви учасник (як тост на сайті): з'являється під шапкою,
// зникає за 5 с, натиснути — відкрити гілку. Живе в корені, поверх усіх екранів.
export function ThreadReplyToast() {
  const { theme, t } = useSettings();
  const { subscribeRealtime } = useApiBridge();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [toast, setToast] = useState<{ text: string; threadId: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, threadId: number) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, threadId });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(
    () =>
      subscribeRealtime((event, args) => {
        if (event !== 'threadReply') return;
        const [threadId, name, title, toMe] = args as [number, string | null, string, boolean];
        if (pathname === `/community/thread/${threadId}`) return; // гілку й так відкрито
        show(t(toMe ? 'toast.threadReplyToMe' : 'toast.threadPost').replace('{name}', name || '…').replace('{title}', title), threadId);
      }),
    [subscribeRealtime, show, pathname, t],
  );

  if (!toast) return null;
  return (
    <Animated.View
      entering={reduced ? FadeIn.duration(160) : FadeInUp.duration(260).easing(Easing.bezier(0.23, 1, 0.32, 1))}
      exiting={reduced ? FadeOut.duration(140) : FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + 62 }]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const id = toast.threadId;
          setToast(null);
          router.push({ pathname: '/community/thread/[id]', params: { id: String(id) } });
        }}
        style={({ pressed }) => [styles.toast, { backgroundColor: theme.elevated, borderColor: theme.borderStrong, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <View style={[styles.icon, { backgroundColor: `${theme.accent}22` }]}>
          <ChatIcon size={15} color={theme.accent} />
        </View>
        <Text numberOfLines={2} style={[styles.text, { color: theme.text }]}>{toast.text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, zIndex: 50, elevation: 50 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13.5, lineHeight: 18, fontFamily: FONT_SANS_SEMIBOLD },
});
