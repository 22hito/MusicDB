import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from '@/components/WebViewCompat';
import { CloseIcon } from '@/components/Icons';
import { useMusicApi } from '@/api/endpoints';
import { useApiBridge } from '@/api/ApiBridge';
import { useSettings } from '@/state/SettingsContext';
import { PLAYER_BAR_HEIGHT } from '@/constants/theme';
import type { Song } from '@/api/types';
import { PLAYER_HTML } from './playerHtml';

const FALLBACK_YT_KEY = 'AIzaSyCc0I2E_03NGYQchLXv3OMNbBiReak5XP8';
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

async function fetchVideoId(artist: string, title: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  const q = encodeURIComponent(`${artist} ${title} official video`);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      // maxResults=10 (не 6) — більший пул кандидатів для відсіювання перезаливів.
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${q}&key=${apiKey}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
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
}

const PlayerCtx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const engineRef = useRef<any>(null);

  const [ytApiKey, setYtApiKey] = useState(FALLBACK_YT_KEY);
  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        if (cfg?.youtubeApiKey) setYtApiKey(cfg.youtubeApiKey);
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
  const [engineReady, setEngineReady] = useState(false);

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
      const vid = await fetchVideoId(song.artist, song.title, ytApiKey);
      if (mySeq !== requestSeqRef.current) return; // користувач уже перемкнув пісню
      if (!vid) {
        setVideoNotFound(true);
        setState('idle');
        return;
      }
      setVideoId(vid);
      postCommand({ cmd: 'load', videoId: vid, autoplay: true });
    },
    [ytApiKey, postCommand],
  );

  useEffect(() => {
    if (current && engineReady) {
      _loadCurrent(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, engineReady]);

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

  const onEngineMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      let data: any;
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (data.type === 'ready') {
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
    }),
    [
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

  const screenWidth = Dimensions.get('window').width;
  const popupWidth = Math.min(320, screenWidth - 24);

  return (
    <PlayerCtx.Provider value={value}>
      {children}

      {/* Прихований (або, коли відкрито попап, видимий) WebView з YouTube IFrame API.
          Це ЄДИНИЙ екземпляр — переключаємо лише стиль, тому звук не переривається. */}
      <View
        pointerEvents={videoPopupOpen ? 'auto' : 'none'}
        style={
          videoPopupOpen
            ? [
                styles.popupCard,
                { width: popupWidth, bottom: PLAYER_BAR_HEIGHT + 16, backgroundColor: theme.mode === 'dark' ? '#0f0f11' : '#111' },
              ]
            : styles.hiddenEngine
        }
      >
        {videoPopupOpen ? (
          <View style={styles.popupHeader}>
            <Text style={styles.popupHeaderText}>{t('videoPopup.title')}</Text>
            <TouchableOpacity onPress={toggleVideoPopup} style={styles.popupCloseBtn} hitSlop={10}>
              <CloseIcon size={14} color="#8a8a90" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={videoPopupOpen ? styles.popupFrame : styles.hiddenFrame}>
          <WebView
            ref={engineRef}
            // без baseUrl сторінка вантажиться як about:blank — YouTube IFrame API
            // мовчки не рендерить відео на реальних пристроях.
            source={{ html: PLAYER_HTML, baseUrl: 'https://www.youtube.com' }}
            onMessage={onEngineMessage}
            allowsInlineMediaPlayback
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
    borderColor: '#2a2a2e',
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
    borderBottomColor: '#1e1e22',
  },
  popupHeaderText: {
    color: '#c8a96e',
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
