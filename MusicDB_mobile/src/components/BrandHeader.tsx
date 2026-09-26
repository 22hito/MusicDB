import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { FONT_SANS_SEMIBOLD, FONT_SERIF_BLACK, SPACING } from '@/constants/theme';
import { Avatar } from './UI';
import { BellIcon, SearchIcon } from './Icons';
import { SearchModal } from './SearchModal';
import { NotificationsModal, loadNotificationCount } from './NotificationsModal';

// Шапка — як на мобільному сайті: сова + "N'Owl", праворуч пошук (пісні, виконавці, люди),
// дзвіночок сповіщень із лічильником і аватар (відкриває профіль). Гостю — кнопка входу.
export function BrandHeader() {
  const { theme, t } = useSettings();
  const { currentUser, openLogin, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const authed = !!currentUser?.authenticated;
  const isAdmin = !!currentUser?.isAdmin;

  const refresh = useCallback(() => {
    if (!authed) {
      setNotifCount(0);
      return;
    }
    loadNotificationCount(api, isAdmin).then(setNotifCount).catch(() => {});
  }, [api, authed, isAdmin]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  // Окремої події на сповіщення виконавців немає — як і сайт, оновлюємо на songsChanged.
  useEffect(
    () =>
      subscribeRealtime((event) => {
        if (event === 'songsChanged' || event === 'adminNotification' || event === 'friendsChanged') refresh();
      }),
    [subscribeRealtime, refresh],
  );

  const label = currentUser?.displayName || currentUser?.name || currentUser?.email || '';
  const onProfile = pathname.startsWith('/profile');

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.bg, borderBottomColor: theme.border },
      ]}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
      <Image source={require('../../assets/images/owl-header-icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.wordmark, { color: theme.accent, fontFamily: FONT_SERIF_BLACK }]}>N'Owl</Text>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        onPress={() => setSearchOpen(true)}
        hitSlop={8}
        accessibilityLabel={t('navSearch.placeholder')}
        style={[styles.roundBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
      >
        <SearchIcon size={17} color={theme.muted} />
      </TouchableOpacity>
      {authed ? (
        <>
          <TouchableOpacity
            onPress={() => setNotifOpen(true)}
            hitSlop={8}
            accessibilityLabel={t('notif.bellTitle')}
            style={[styles.roundBtn, { borderColor: notifOpen ? theme.accent : theme.border, backgroundColor: theme.surface }]}
          >
            <BellIcon size={17} color={theme.muted} />
            {notifCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.red, borderColor: theme.bg }]}>
                <Text style={styles.badgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            hitSlop={8}
            accessibilityLabel={t('nav.profile')}
            style={[styles.avatarRing, { borderColor: onProfile ? theme.accent : 'transparent' }]}
          >
            <Avatar url={currentUser?.avatarUrl || currentUser?.picture} name={label} size={34} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity onPress={openLogin} style={[styles.loginBtn, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.onAccent, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 13 }}>{t('auth.loginBtn')}</Text>
        </TouchableOpacity>
      )}
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      {authed ? <NotificationsModal visible={notifOpen} onClose={() => setNotifOpen(false)} onChanged={refresh} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  logo: {
    width: 20,
    height: 20 * (324 / 180),
  },
  wordmark: {
    fontSize: 20,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 21,
    padding: 1,
  },
  loginBtn: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
