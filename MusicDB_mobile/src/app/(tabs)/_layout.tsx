import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { MiniPlayerBar } from '@/player/MiniPlayerBar';
import { BrandHeader } from '@/components/BrandHeader';
import { ChatIcon, CompassIcon, NoteIcon, PersonIcon, SendIcon, ShieldIcon, TrophyIcon } from '@/components/Icons';

// Трохи вище за типовий (49-50px), щоб іконки й підписи мали комфортну зону дотику.
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const { theme, t } = useSettings();
  const { currentUser, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const isAdmin = !!currentUser?.isAdmin;
  const authed = !!currentUser?.authenticated;

  // Лічильники на вкладках: непрочитані ЛС + запити на листування; нові сповіщення адміна.
  const [communityBadge, setCommunityBadge] = useState(0);
  const [adminBadge, setAdminBadge] = useState(0);
  const refreshBadges = useCallback(() => {
    if (!authed) {
      setCommunityBadge(0);
      setAdminBadge(0);
      return;
    }
    // Спілкування: непрочитані ЛС + запити на листування + вхідні запити в друзі.
    Promise.all([
      api.getDmUnread().catch(() => ({ unread: 0, requests: 0 })),
      api.getIncomingFriendRequests().catch(() => []),
    ]).then(([d, fr]) => setCommunityBadge(d.unread + d.requests + fr.length));
    // Адмін: нові сповіщення + відкриті баг-репорти.
    if (isAdmin)
      Promise.all([
        api.getAdminNotifications(1).then((d) => d.unreadCount).catch(() => 0),
        api.getOpenBugCount().catch(() => 0),
      ]).then(([n, bugs]) => setAdminBadge(n + bugs));
  }, [api, authed, isAdmin]);
  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);
  useEffect(
    () =>
      subscribeRealtime((event) => {
        if (
          event === 'dmReceived' ||
          event === 'dmSent' ||
          event === 'dmRequestsChanged' ||
          event === 'adminNotification' ||
          event === 'friendsChanged' ||
          event === 'bugReportsChanged'
        )
          refreshBadges();
      }),
    [subscribeRealtime, refreshBadges],
  );
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg }}
      onLayout={(e) => console.log('[DBG2] (tabs) outer View', e.nativeEvent.layout)}
    >
      <BrandHeader />
      {/* <Tabs> не бере flex:1 сам по собі, коли він більше не єдина дитина
          (з'явився BrandHeader-сусід) — без цієї обгортки контент і таббар
          стискались у верхню половину екрана, а решта лишалась порожньою. */}
      <View style={{ flex: 1 }} onLayout={(e) => console.log('[DBG2] Tabs wrapper View', e.nativeEvent.layout)}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.muted,
            tabBarStyle: {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              height: tabBarHeight,
              paddingBottom: insets.bottom,
              paddingTop: 8,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('nav.library'),
              tabBarIcon: ({ color, size }) => <NoteIcon color={String(color)} size={size ?? 20} />,
            }}
          />
          <Tabs.Screen
            name="top"
            options={{
              title: t('nav.top'),
              tabBarIcon: ({ color, size }) => <TrophyIcon color={String(color)} size={size ?? 20} />,
            }}
          />
          <Tabs.Screen
            name="community"
            options={{
              title: t('nav.community'),
              tabBarBadge: communityBadge > 0 ? (communityBadge > 99 ? '99+' : communityBadge) : undefined,
              tabBarBadgeStyle: { backgroundColor: theme.accent, color: theme.onAccent },
              tabBarIcon: ({ color, size }) => <ChatIcon color={String(color)} size={size ?? 20} />,
            }}
            listeners={{ tabPress: refreshBadges }}
          />
          {/* Заявка відкривається кнопкою "+ Надіслати запит" у бібліотеці (як на сайті) — у таббарі не показуємо. */}
          <Tabs.Screen
            name="request"
            options={{
              href: null,
              title: t('nav.request'),
              tabBarIcon: ({ color, size }) => <SendIcon color={String(color)} size={size ?? 20} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: t('nav.explore'),
              tabBarIcon: ({ color, size }) => <CompassIcon color={String(color)} size={size ?? 20} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t('nav.profile'),
              tabBarIcon: ({ color, size }) => <PersonIcon color={String(color)} size={size ?? 20} />,
            }}
          />
          <Tabs.Screen
            name="admin"
            options={{
              title: t('nav.admin.tab'),
              href: isAdmin ? undefined : null,
              tabBarBadge: adminBadge > 0 ? (adminBadge > 99 ? '99+' : adminBadge) : undefined,
              tabBarBadgeStyle: { backgroundColor: theme.accent, color: theme.onAccent },
              tabBarIcon: ({ color, size }) => <ShieldIcon color={String(color)} size={size ?? 20} />,
            }}
          />
        </Tabs>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight }} pointerEvents="box-none">
        <MiniPlayerBar />
      </View>
    </View>
  );
}
