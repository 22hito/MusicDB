import { Alert } from 'react-native';
import { useApiBridge } from '@/api/ApiBridge';
import { useSettings } from '@/state/SettingsContext';

// Аналог перевірки з openRequestPage()/submitRequest() у вебі: без входу — пропонуємо увійти.
export function useRequireAuth() {
  const { currentUser, openLogin } = useApiBridge();
  const { t } = useSettings();

  return function requireAuth(action: () => void, message?: string) {
    if (currentUser?.authenticated) {
      action();
      return;
    }
    Alert.alert(t('auth.loginRequiredTitle'), message || t('auth.loginRequiredGeneric'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.loginBtn'), onPress: () => openLogin() },
    ]);
  };
}
