import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { WebView } from '@/components/WebViewCompat';
import { CloseIcon } from '@/components/Icons';
import { useMusicApi } from '@/api/endpoints';
import { useApiBridge } from '@/api/ApiBridge';
import { useSettings } from '@/state/SettingsContext';
import { PLAYER_BAR_HEIGHT } from '@/constants/theme';
import type { Song } from '@/api/types';

const BAD_WORDS = [
  'cover',
  'reaction',
  'lyric',
  'lyrics',
  '8d audio',
  'slowed',
  'reverb',
  'nightcore',
  '1 hour',
  'remix',
  'karaoke',
  'instrumental',
  'tiktok',
  'sped up',
  'unofficial',
  'fan made',
  'fan-made',
  'bootleg',
];

interface YTSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string };
}

// Пробуємо ключі по черзі (кожен зі свого GCP-проєкту — квота 10000/добу рахується
// на проєкт, не на ключ), переходимо на наступний при 403/429. mutable-масив
// keys, щоб caller міг запам'ятати обраний індекс між викликами (див. keyIdxRef).
async function fetchVideoId(
  artist: string,
  title: string,
  apiKeys: string[],
  keyIdxRef: { current: number },
): Promise<string | null> {
  if (!apiKeys.length) return null;
  const q = encodeURIComponent(`${artist} ${title} official video`);

  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const apiKey = apiKeys[keyIdxRef.current];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        // maxResults=10 (не 6) — більший пул кандидатів для відсіювання перезаливів.
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${q}&key=${apiKey}`,
        { signal: controller.signal },
      );
      clearTimeout(timer);
      if (!res.ok) {
        if ((res.status === 403 || res.status === 429) && apiKeys.length > 1) {
          keyIdxRef.current = (keyIdxRef.current + 1) % apiKeys.length;
          continue; // квота вичерпана на цьому ключі — пробуємо наступний
        }
        return null;
      }
      const data = await res.json();
      const items: YTSearchItem[] = data.items || [];
      if (!items.length) return null;
      const artistLower = artist.toLowerCase();
      const score = (item: YTSearchItem) => {
        const t = (item.snippet?.title || '').toLowerCase();
        const ch = (item.snippet?.channelTitle || '').toLowerCase();
        // Канал з іменем артиста, VEVO, авто-канал "Артист - Topic" (не підробити)
        // або "official" у назві — надійні ознаки офіційного джерела.
        const channelLooksOfficial =
          ch.includes(artistLower) || ch.includes('vevo') || ch.includes(' - topic') || ch.includes('official');
        let s = 0;
        if (channelLooksOfficial) s += 4;
        // "official video" у назві саме по собі нічого не гарантує — так само
        // підписують неякісні перезаливи. Довіряємо йому лише коли канал і сам
        // виглядає офіційним, інакше — оцінка йде в мінус.
        if (t.includes('official video') || t.includes('official music video')) {
          s += channelLooksOfficial ? 2 : -2;
        } else if (t.includes('official')) {
          s += channelLooksOfficial ? 1 : -1;
        }
        if (BAD_WORDS.some((w) => t.includes(w))) s -= 5;
        return s;
      };
      const best = [...items].sort((a, b) => score(b) - score(a))[0];
      return best?.id?.videoId || null;
    } catch {
      return null;
    }
  }
  return null; // усі ключі вичерпали квоту
}

type PlayState = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended';

interface PlayerState {
  queue: Song[];
  index: number;
  current: Song | null;
  videoId: string | null;
  videoNotFound: boolean;
  state: PlayState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: boolean;
  volume: number;
  videoPopupOpen: boolean;
  isOpen: boolean;
  playFrom: (list: Song[], songId: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  seekFraction: (fraction: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleVideoPopup: () => void;
  pause: () => void;
  // "Док" для відео: екран (батл) передає прямокутник у координатах вікна — той
  // самий WebView-плеєр малюється в ньому (звук не переривається). null — сховати.
  setVideoDock: (rect: VideoDock | null) => void;
}

export interface VideoDock {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PlayerCtx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { theme, t, apiBase } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const engineRef = useRef<any>(null);

  const [ytApiKeys, setYtApiKeys] = useState<string[]>([]) // ключі — лише з /config, не вписувати в код;
  const ytKeyIdxRef = useRef(0);
  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        if (cfg?.youtubeApiKeys?.length) setYtApiKeys(cfg.youtubeApiKeys);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoNotFound, setVideoNotFound] = useState(false);
  const [state, setState] = useState<PlayState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [videoPopupOpen, setVideoPopupOpen] = useState(false);
  const [videoDock, setVideoDock] = useState<VideoDock | null>(null);
  const [, setEngineReady] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const listenLoggedRef = useRef(false);
  const requestSeqRef = useRef(0);

  const current = queue[index] || null;
  const isOpen = queue.length > 0;
  const isPlaying = state === 'playing';

  const postCommand = useCallback((cmd: Record<string, unknown>) => {
    engineRef.current?.postMessage(JSON.stringify(cmd));
  }, []);

  const _loadCurrent = useCallback(
    async (song: Song) => {
      const mySeq = ++requestSeqRef.current;
      listenLoggedRef.current = false;
      setVideoId(null);
      setVideoNotFound(false);
      setState('loading');
      setCurrentTime(0);
      setDuration(0);
      // Пісня таблиці_2 з завантаженим файлом — грає <audio> у тій самій
      // сторінці-плеєрі (mobile-player.html), з тими самими подіями state/time.
      if (song.audioUrl) {
        setVideoPopupOpen(false);
        postCommand({ cmd: 'loadAudio', url: `${apiBase}${song.audioUrl}`, autoplay: true });
        return;
      }
      // Закешований раніше videoId (уже підтверджений — будь-яким клієнтом)
      // рятує від нового звернення до YouTube Search API (100 одиниць квоти).
      // Ком'юніті-пісні не шукаємо: відео до них вказує лише автор чи адмін.
      let vid = song.youtubeVideoId;
      if (!vid && song.source !== 'community') {
        vid = await fetchVideoId(song.artist, song.title, ytApiKeys, ytKeyIdxRef);
        if (vid) api.setYoutubeVideo(song.id, vid).catch(() => {});
      }
      if (mySeq !== requestSeqRef.current) return; // користувач уже перемкнув пісню
      if (!vid) {
        setVideoNotFound(true);
        setState('idle');
        return;
      }
      setVideoId(vid);
      postCommand({ cmd: 'load', videoId: vid, autoplay: true });
    },
    [ytApiKeys, api, postCommand, apiBase],
  );

  useEffect(() => {
    if (current && pageReady) {
      _loadCurrent(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, pageReady]);

  const playFrom = useCallback((list: Song[], songId: number) => {
    setQueue(list);
    const idx = list.findIndex((s) => s.id === songId);
    setIndex(idx >= 0 ? idx : 0);
  }, []);

  const toggle = useCallback(() => {
    if (state === 'playing') postCommand({ cmd: 'pause' });
    else postCommand({ cmd: 'play' });
  }, [state, postCommand]);

  const next = useCallback(() => {
    if (!queue.length) return;
    setIndex((i) => (shuffle ? Math.floor(Math.random() * queue.length) : (i + 1) % queue.length));
  }, [queue.length, shuffle]);

  const prev = useCallback(() => {
    if (!queue.length) return;
    if (currentTime > 3) {
      postCommand({ cmd: 'seekTo', seconds: 0 });
      return;
    }
    setIndex((i) => (i - 1 + queue.length) % queue.length);
  }, [queue.length, currentTime, postCommand]);

  const close = useCallback(() => {
    postCommand({ cmd: 'stop' });
    setQueue([]);
    setIndex(0);
    setVideoId(null);
    setState('idle');
    setVideoPopupOpen(false);
  }, [postCommand]);

  const seekFraction = useCallback(
    (fraction: number) => {
      if (!duration) return;
      postCommand({ cmd: 'seekTo', seconds: duration * fraction });
    },
    [duration, postCommand],
  );

  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      postCommand({ cmd: 'setVolume', volume: v });
    },
    [postCommand],
  );

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleRepeat = useCallback(() => setRepeat((r) => !r), []);
  const toggleVideoPopup = useCallback(() => setVideoPopupOpen((o) => !o), []);
  const pause = useCallback(() => postCommand({ cmd: 'pause' }), [postCommand]);

  const onEngineMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      let data: any;
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (data.type === 'pageReady') {
        setPageReady(true);
      } else if (data.type === 'ready') {
        setEngineReady(true);
        postCommand({ cmd: 'setVolume', volume });
      } else if (data.type === 'state') {
        if (data.state === 'ended') {
          if (repeat) {
            postCommand({ cmd: 'seekTo', seconds: 0 });
            postCommand({ cmd: 'play' });
          } else {
            next();
          }
        } else {
          setState(data.state);
        }
      } else if (data.type === 'time') {
        setCurrentTime(data.current || 0);
        setDuration(data.duration || 0);
        if (!listenLoggedRef.current && currentUser?.authenticated && current) {
          const threshold = Math.min(20, (data.duration || 0) / 2);
          if (data.current >= threshold && threshold > 0) {
            listenLoggedRef.current = true;
            api.logListen(current.id).catch(() => {});
          }
        }
      } else if (data.type === 'error') {
        setVideoNotFound(true);
        setState('idle');
      }
    },
    [postCommand, volume, repeat, next, currentUser, current, api],
  );

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      index,
      current,
      videoId,
      videoNotFound,
      state,
      isPlaying,
      currentTime,
      duration,
      shuffle,
      repeat,
      volume,
      videoPopupOpen,
      isOpen,
      playFrom,
      toggle,
      next,
      prev,
      close,
      seekFraction,
      setVolume,
      toggleShuffle,
      toggleRepeat,
      toggleVideoPopup,
      pause,
      setVideoDock,
    }),
    [
      pause,
      queue,
      index,
      current,
      videoId,
      videoNotFound,
      state,
      isPlaying,
      currentTime,
      duration,
      shuffle,
      repeat,
      volume,
      videoPopupOpen,
      isOpen,
      playFrom,
      toggle,
      next,
      prev,
      close,
      seekFraction,
      setVolume,
      toggleShuffle,
      toggleRepeat,
      toggleVideoPopup,
    ],
  );

  // Хук, а не Dimensions.get: при повороті екрана ширина має перерахуватись.
  const { width: screenWidth } = useWindowDimensions();
  const popupWidth = Math.min(320, screenWidth - 24);
  // Док має пріоритет над попапом, але лише коли є що показати (відео, не аудіофайл).
  const docked = !!videoDock && !!videoId && !current?.audioUrl;

  return (
    <PlayerCtx.Provider value={value}>
      {children}

      {/* Прихований (або, коли відкрито попап, видимий) WebView з YouTube IFrame API.
          Це ЄДИНИЙ екземпляр — переключаємо лише стиль, тому звук не переривається. */}
      <View
        pointerEvents={videoPopupOpen || docked ? 'auto' : 'none'}
        style={
          docked && videoDock
            ? [styles.dock, { left: videoDock.x, top: videoDock.y, width: videoDock.width, height: videoDock.height }]
            : videoPopupOpen
            ? [
                styles.popupCard,
                { width: popupWidth, bottom: PLAYER_BAR_HEIGHT + 16, backgroundColor: theme.mode === 'dark' ? '#161924' : '#111' },
              ]
            : styles.hiddenEngine
        }
      >
        {videoPopupOpen && !docked ? (
          <View style={styles.popupHeader}>
            <Text style={styles.popupHeaderText}>{t('videoPopup.title')}</Text>
            <TouchableOpacity onPress={toggleVideoPopup} style={styles.popupCloseBtn} hitSlop={10}>
              <CloseIcon size={14} color="#9398a5" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={docked ? { flex: 1 } : videoPopupOpen ? styles.popupFrame : styles.hiddenFrame}>
          <WebView
            ref={engineRef}
            // Раніше — source={{html, baseUrl:'https://www.youtube.com'}}: підроблений
            // origin, який YouTube на реальних пристроях відхиляв ("Це відео
            // недоступне", код 152) — той самий клас проблеми, що й помилка 153
            // у pop-out вікні десктоп-застосунку. Тепер — справжня сторінка
            // нашого домену (mobile-player.html, той самий HTML/протокол), з
            // генуїнним https-origin, як у вебі й на десктопі.
            source={{ uri: `${apiBase}/mobile-player.html` }}
            onMessage={onEngineMessage}
            allowsInlineMediaPlayback
            // Кнопка "на весь екран" у контролах YouTube: на Android без цього
            // WebView просто ігнорує запит на повноекранний режим.
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: '#000' }}
          />
        </View>
      </View>
    </PlayerCtx.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

const styles = StyleSheet.create({
  hiddenEngine: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -3000,
    left: 0,
    opacity: 0,
  },
  dock: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    zIndex: 400,
    elevation: 6,
  },
  hiddenFrame: {
    width: 1,
    height: 1,
  },
  popupCard: {
    position: 'absolute',
    right: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#272b37',
    zIndex: 500,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1e29',
  },
  popupHeaderText: {
    color: '#efba64',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  popupCloseBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
});
