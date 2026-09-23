import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { WebView, type WebViewNavigation } from '@/components/WebViewCompat';
import { useSettings } from '@/state/SettingsContext';
import type { AuthMe, CurrentUser } from './types';

// WebView замість fetch(): бекенд авторизує через Google OAuth + HttpOnly cookie
// сесії (MusicDB.Session), як і в вебі, а системного браузера в застосунку нема.
// 1) логін — у видимому WebView на {apiBase}/auth/login (Google-редіректи як у браузері).
// 2) API-запити йдуть через прихований WebView на {apiBase}/ (той самий origin і
//    cookie) — RN виконує fetch() через injectJavaScript, відповідь — через postMessage.
// Обходить потребу в native-модулях, працює в Expo Go.

interface PendingRequest {
  resolve: (v: { status: number; ok: boolean; body: string }) => void;
  reject: (e: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

export type RealtimeEvent =
  | 'songsChanged'
  | 'requestsChanged'
  | 'adminNotification'
  | 'dmReceived'
  | 'dmSent'
  | 'dmRequestsChanged'
  | 'threadsChanged'
  | 'ratingChanged';

// Ті самі SignalR-події, що слухає сайт (wwwroot/app.js); args — аргументи події
// (напр. userId співрозмовника для dm*, id гілки, [musicId, avg, count] для оцінки).
const REALTIME_EVENTS: RealtimeEvent[] = [
  'songsChanged', 'requestsChanged', 'adminNotification', 'dmReceived', 'dmSent',
  'dmRequestsChanged', 'threadsChanged', 'ratingChanged',
];

interface ApiBridgeState {
  bridgeReady: boolean;
  currentUser: CurrentUser | null;
  authChecked: boolean;
  request: <T = unknown>(path: string, opts?: RequestOptions) => Promise<T>;
  requestRaw: (path: string, opts?: RequestOptions) => Promise<{ status: number; ok: boolean; body: string }>;
  refreshCurrentUser: () => Promise<void>;
  openLogin: () => void;
  logout: () => Promise<void>;
  // Живі оновлення (SignalR) — той самий канал songsChanged/requestsChanged, що
  // й у веб-версії, тож відкриті екрани самі перезавантажують дані, коли
  // хтось інший (адмін, інший пристрій) щось змінив.
  subscribeRealtime: (handler: (event: RealtimeEvent, args: unknown[]) => void) => () => void;
}

// Виконується у прихованому WebView (той самий origin/сесія, що й у fetch-мосту
// вище) — index.html вже підвантажує signalR глобально (CDN <script>) для
// власного (невидимого нам) підключення, тож просто відкриваємо ДРУГЕ
// з'єднання й пересилаємо події назад у RN через postMessage. Не потребує
// окремої бібліотеки чи налаштування cookie — той самий трюк, що й для fetch().
const REALTIME_BRIDGE_SCRIPT = `(function(){
  if (window.__mdbRealtimeStarted) return;
  window.__mdbRealtimeStarted = true;
  function post(ev, args){
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ __mdbRealtime: true, event: ev, args: args || [] })); } catch(e) {}
  }
  function start(attempt){
    if (!window.signalR) {
      if ((attempt || 0) > 20) return;
      setTimeout(function(){ start((attempt || 0) + 1); }, 500);
      return;
    }
    try {
      var conn = new signalR.HubConnectionBuilder().withUrl('/hubs/music').withAutomaticReconnect().build();
      ${JSON.stringify(REALTIME_EVENTS)}.forEach(function(ev){
        conn.on(ev, function(){ post(ev, Array.prototype.slice.call(arguments)); });
      });
      conn.start().catch(function(){});
    } catch(e) {}
  }
  start(0);
  true;
})();`;

const ApiBridgeCtx = createContext<ApiBridgeState | null>(null);

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function ApiBridgeProvider({ children }: { children: React.ReactNode }) {
  const { apiBase, t } = useSettings();
  const bridgeRef = useRef<any>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const pending = useRef<Map<string, PendingRequest>>(new Map());
  const reqCounter = useRef(0);
  const realtimeListeners = useRef<Set<(event: RealtimeEvent, args: unknown[]) => void>>(new Set());

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginVisible, setLoginVisible] = useState(false);

  // Скидаємо стан бриджа, коли міняється адреса сервера.
  useEffect(() => {
    setBridgeReady(false);
    setAuthChecked(false);
    setCurrentUser(null);
  }, [apiBase]);

  const requestRaw = useCallback(
    (path: string, opts: RequestOptions = {}) => {
      return new Promise<{ status: number; ok: boolean; body: string }>((resolve, reject) => {
        if (!apiBase) {
          reject(new Error('API base is not configured'));
          return;
        }
        const id = `r${++reqCounter.current}`;
        const url = `${apiBase}${path}${buildQuery(opts.query)}`;
        const method = opts.method || 'GET';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

        const timeout = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error('Request timed out'));
        }, 25000);
        pending.current.set(id, { resolve, reject, timeout });

        const run = () => {
          const script = `(function(){
            try {
              fetch(${JSON.stringify(url)}, {
                method: ${JSON.stringify(method)},
                headers: ${JSON.stringify(headers)},
                ${bodyStr !== undefined ? `body: ${JSON.stringify(bodyStr)},` : ''}
                credentials: 'include'
              }).then(function(r){
                return r.text().then(function(text){
                  window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(id)}, status: r.status, ok: r.ok, body: text }));
                });
              }).catch(function(e){
                window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(id)}, status: 0, ok: false, error: String((e && e.message) || e) }));
              });
            } catch(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ id: ${JSON.stringify(id)}, status: 0, ok: false, error: String((e && e.message) || e) }));
            }
            true;
          })();`;
          bridgeRef.current?.injectJavaScript(script);
        };

        if (bridgeReady) run();
        else {
          // Чекаємо готовності бриджа (макс ~15с), потім пробуємо все одно —
          // якщо не встигне, спрацює загальний timeout вище.
          const start = Date.now();
          const wait = setInterval(() => {
            if (bridgeReady) {
              clearInterval(wait);
              run();
            } else if (Date.now() - start > 15000) {
              clearInterval(wait);
              run();
            }
          }, 150);
        }
      });
    },
    [apiBase, bridgeReady],
  );

  const request = useCallback(
    async <T = unknown,>(path: string, opts?: RequestOptions): Promise<T> => {
      const res = await requestRaw(path, opts);
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${path}`) as Error & { status?: number; body?: string };
        err.status = res.status;
        err.body = res.body;
        throw err;
      }
      if (!res.body) return undefined as T;
      try {
        return JSON.parse(res.body) as T;
      } catch {
        return res.body as unknown as T;
      }
    },
    [requestRaw],
  );

  const refreshCurrentUser = useCallback(async () => {
    try {
      const me = await request<AuthMe>('/auth/me');
      if (me.authenticated) {
        let extra: { displayName?: string | null; avatarUrl?: string | null } = {};
        try {
          const profile = await request<{ displayName: string | null; avatarUrl: string | null }>('/api/profile');
          extra = { displayName: profile.displayName, avatarUrl: profile.avatarUrl };
        } catch {
          // профіль може бути тимчасово недоступний — не блокуємо авторизацію через це
        }
        setCurrentUser({ ...me, ...extra });
      } else {
        setCurrentUser({ authenticated: false });
      }
    } catch {
      setCurrentUser({ authenticated: false });
    } finally {
      setAuthChecked(true);
    }
  }, [request]);

  useEffect(() => {
    if (bridgeReady) refreshCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady]);

  const openLogin = useCallback(() => setLoginVisible(true), []);

  const logout = useCallback(async () => {
    try {
      await requestRaw('/auth/logout', { method: 'POST' });
    } catch {
      // ігноруємо — усе одно скидаємо локальний стан
    }
    setCurrentUser({ authenticated: false });
  }, [requestRaw]);

  const onBridgeMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        id?: string;
        status?: number;
        ok?: boolean;
        body?: string;
        error?: string;
        __mdbRealtime?: boolean;
        event?: RealtimeEvent;
        args?: unknown[];
      };
      if (data.__mdbRealtime) {
        if (data.event) realtimeListeners.current.forEach((fn) => fn(data.event as RealtimeEvent, data.args || []));
        return;
      }
      if (!data.id) return;
      const p = pending.current.get(data.id);
      if (!p) return;
      pending.current.delete(data.id);
      clearTimeout(p.timeout);
      if (data.error && !data.body) {
        p.reject(new Error(data.error));
      } else {
        p.resolve({ status: data.status || 0, ok: !!data.ok, body: data.body || '' });
      }
    } catch {
      // не наш формат повідомлення — ігноруємо
    }
  }, []);

  const subscribeRealtime = useCallback((handler: (event: RealtimeEvent, args: unknown[]) => void) => {
    realtimeListeners.current.add(handler);
    return () => {
      realtimeListeners.current.delete(handler);
    };
  }, []);

  const onLoginNav = useCallback(
    (navState: WebViewNavigation) => {
      if (!apiBase || navState.loading) return;
      const url = navState.url.replace(/\/+$/, '');
      const root = apiBase.replace(/\/+$/, '');
      if (url === root) {
        setLoginVisible(false);
        setTimeout(() => refreshCurrentUser(), 300);
      }
    },
    [apiBase, refreshCurrentUser],
  );

  const value = useMemo<ApiBridgeState>(
    () => ({
      bridgeReady,
      currentUser,
      authChecked,
      request,
      requestRaw,
      refreshCurrentUser,
      openLogin,
      logout,
      subscribeRealtime,
    }),
    [bridgeReady, currentUser, authChecked, request, requestRaw, refreshCurrentUser, openLogin, logout, subscribeRealtime],
  );

  return (
    <ApiBridgeCtx.Provider value={value}>
      {children}

      {apiBase ? (
        <WebView
          ref={bridgeRef}
          source={{ uri: `${apiBase}/` }}
          onLoadEnd={() => {
            setBridgeReady(true);
            bridgeRef.current?.injectJavaScript(REALTIME_BRIDGE_SCRIPT);
          }}
          onMessage={onBridgeMessage}
          onError={() => setBridgeReady(false)}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          style={styles.hiddenWebview}
        />
      ) : null}

      <Modal visible={loginVisible} animationType="slide" onRequestClose={() => setLoginVisible(false)}>
        <View style={styles.loginModal}>
          <View style={styles.loginHeader}>
            <Text style={styles.loginTitle}>{t('login.title')}</Text>
            <TouchableOpacity onPress={() => setLoginVisible(false)} style={styles.loginCancelBtn}>
              <Text style={styles.loginCancelText}>{t('login.cancel')}</Text>
            </TouchableOpacity>
          </View>
          {apiBase ? (
            <WebView
              source={{ uri: `${apiBase}/auth/login` }}
              onNavigationStateChange={onLoginNav}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              incognito={false}
              // Google блокує вхід із "вбудованих" WebView (disallowed_useragent) —
              // дефолтний User-Agent позначає системний webview. Підміняємо на Chrome;
              // поширений обхід, але не гарантований (Google може посилити перевірку).
              userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
              style={styles.loginWebview}
            />
          ) : null}
        </View>
      </Modal>
    </ApiBridgeCtx.Provider>
  );
}

export function useApiBridge(): ApiBridgeState {
  const ctx = useContext(ApiBridgeCtx);
  if (!ctx) throw new Error('useApiBridge must be used within ApiBridgeProvider');
  return ctx;
}

const styles = StyleSheet.create({
  hiddenWebview: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -2000,
    left: 0,
    opacity: 0,
  },
  loginModal: {
    flex: 1,
    backgroundColor: '#0d0d0f',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2e',
  },
  loginTitle: {
    color: '#e8e8e0',
    fontSize: 16,
    fontWeight: '700',
  },
  loginCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  loginCancelText: {
    color: '#c8a96e',
    fontSize: 14,
  },
  loginWebview: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
