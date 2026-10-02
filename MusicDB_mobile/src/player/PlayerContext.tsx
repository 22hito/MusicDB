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
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
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
// Повтор — як на сайті: 'off' (у кінці списку зупинитись), 'all' (по колу), 'one' (одна пісня).
export type RepeatMode = 'off' | 'all' | 'one';

// Копія масиву у випадковому порядку (Fisher–Yates).
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PlayerState {
  queue: Song[];
  index: number;
  current: Song | null;
  videoId: string | null;
  videoNotFound: boolean;
  state: PlayState;
  isPlaying: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  videoPopupOpen: boolean;
  isOpen: boolean;
  // startAt — з якої секунди почати (батл: повернулись до пісні — грає далі, а не спочатку).
  playFrom: (list: Song[], songId: number, opts?: { startAt?: number }) => void;
  // Поточна позиція без підписки на щотиковий прогрес (для збереження місця перед перемиканням).
  getPosition: () => PlayerProgress;
  // Черга — як на сайті: "Моя черга" грає перед рештою списку й не губиться при playFrom.
  userQueue: Song[];
  addToQueue: (song: Song, playNext?: boolean) => void;
  addManyToQueue: (songs: Song[]) => void;
  playNow: (song: Song) => void;
  playFromUserQueue: (i: number) => void;
  moveInUserQueue: (i: number, dir: -1 | 1) => void;
  removeFromUserQueue: (i: number) => void;
  clearUserQueue: () => void;
  jumpToUpcoming: (i: number) => void;
  removeUpcoming: (i: number) => void;
  clearUpcoming: () => void;
  startNewQueue: () => void;
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

// Позиція відтворення змінюється кілька разів на секунду — окремим контекстом: інакше з кожним
// тиком перемальовувались би всі, хто слухає плеєр (список пісень, екрани), а не лише смужка прогресу.
export interface PlayerProgress {
  currentTime: number;
  duration: number;
}

const PlayerCtx = createContext<PlayerState | null>(null);
const PlayerProgressCtx = createContext<PlayerProgress>({ currentTime: 0, duration: 0 });

// Керування на екрані блокування для пісні, яку грає нативний плеєр.
function showOnLockScreen(native: AudioPlayer, song: Song) {
  const artworkUrl = song.youtubeVideoId ? `https://img.youtube.com/vi/${song.youtubeVideoId}/mqdefault.jpg` : undefined;
  try {
    native.setActiveForLockScreen(true, { title: song.title, artist: song.artist, albumTitle: song.album ?? undefined, artworkUrl }, { showSeekBackward: true, showSeekForward: true });
  } catch {
    // Expo Go / web — без керування на екрані блокування
  }
}

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
  const [userQueue, setUserQueue] = useState<Song[]>([]);
  // "Перемішати" — як на сайті: решту списку перемішано наперед (тож "Далі" видно);
  // вимкнули — повертається порядок до перемішування.
  const unshuffledRef = useRef<Song[] | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoNotFound, setVideoNotFound] = useState(false);
  const [state, setState] = useState<PlayState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Для колбеків ("назад" з початку пісні, перемикання відео↔аудіо) — щоб вони не мінялись щотику.
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(0);
  durationRef.current = duration;
  // Позиція для наступного завантаження (playFrom з startAt) і відкладений перехід для нативного
  // плеєра — до завантаження файлу seekTo нічого не робить, тож переходимо з першим статусом isLoaded.
  const startAtRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [volume, setVolumeState] = useState(80);
  const [videoPopupOpen, setVideoPopupOpen] = useState(false);
  const [videoDock, setVideoDock] = useState<VideoDock | null>(null);
  const [, setEngineReady] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const listenLoggedRef = useRef(false);
  const requestSeqRef = useRef(0);

  // Два рушії: пісні з завантаженим файлом грає НАТИВНИЙ плеєр (expo-audio) —
  // він живе у фоні й при вимкненому екрані та показує керування на екрані
  // блокування; YouTube лишається у WebView (фон для нього заборонений правилами
  // YouTube API — тому поки він грає, екран просто не гасне).
  const nativeRef = useRef<AudioPlayer | null>(null);
  const modeRef = useRef<'yt' | 'native'>('yt');
  const nativeStatusRef = useRef<(s: AudioStatus) => void>(() => {});
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    const p = createAudioPlayer(null, { updateInterval: 500 });
    nativeRef.current = p;
    const sub = p.addListener('playbackStatusUpdate', (st) => nativeStatusRef.current(st));
    return () => {
      sub.remove();
      p.remove();
      nativeRef.current = null;
    };
  }, []);

  const current = queue[index] || null;
  const isOpen = queue.length > 0;
  const isPlaying = state === 'playing';

  const postCommand = useCallback((cmd: Record<string, unknown>) => {
    engineRef.current?.postMessage(JSON.stringify(cmd));
  }, []);

  const _loadCurrent = useCallback(
    async (song: Song) => {
      const mySeq = ++requestSeqRef.current;
      const startAt = startAtRef.current;
      startAtRef.current = null;
      pendingSeekRef.current = null;
      listenLoggedRef.current = false;
      setVideoId(null);
      setVideoNotFound(false);
      setState('loading');
      setCurrentTime(0);
      setDuration(0);
      // Пісня з завантаженим файлом — нативний плеєр (фон + екран блокування).
      const native = nativeRef.current;
      if (song.audioUrl && native) {
        modeRef.current = 'native';
        setVideoPopupOpen(false);
        postCommand({ cmd: 'stop' }); // YouTube у WebView — замовкає
        native.replace({ uri: `${apiBase}${song.audioUrl}` });
        native.volume = volume / 100;
        pendingSeekRef.current = startAt;
        native.play();
        showOnLockScreen(native, song);
        return;
      }
      // Далі — YouTube у WebView: нативний плеєр зупиняємо й знімаємо з екрана блокування.
      modeRef.current = 'yt';
      if (native) {
        native.pause();
        try {
          native.clearLockScreenControls();
        } catch {
          // нічого
        }
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
      postCommand({ cmd: 'load', videoId: vid, autoplay: true, ...(startAt ? { startSeconds: startAt } : null) });
    },
    [ytApiKeys, api, postCommand, apiBase, volume],
  );

  useEffect(() => {
    if (current && pageReady) {
      _loadCurrent(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, pageReady]);

  const playFrom = useCallback(
    (list: Song[], songId: number, opts?: { startAt?: number }) => {
      const idx = Math.max(0, list.findIndex((s) => s.id === songId));
      startAtRef.current = opts?.startAt && opts.startAt > 1 ? opts.startAt : null;
      if (shuffle && list.length > 1) {
        unshuffledRef.current = list;
        setQueue([list[idx], ...shuffled(list.filter((_, i) => i !== idx))]);
        setIndex(0);
        return;
      }
      setQueue(list);
      setIndex(idx);
    },
    [shuffle],
  );

  // ─── Черга ───
  const insertAfterCurrent = useCallback(
    (song: Song) => {
      if (!queue.length) {
        setQueue([song]);
        setIndex(0);
        return;
      }
      setQueue((q) => [...q.slice(0, index + 1), song, ...q.slice(index + 1)]);
      setIndex(index + 1);
    },
    [queue.length, index],
  );
  const addToQueue = useCallback(
    (song: Song, playNext = false) => {
      if (!queue.length) {
        setQueue([song]);
        setIndex(0);
        return;
      }
      setUserQueue((uq) => (playNext ? [song, ...uq] : [...uq, song]));
    },
    [queue.length],
  );
  const addManyToQueue = useCallback(
    (songs: Song[]) => {
      if (!songs.length) return;
      if (!queue.length) {
        setQueue(songs);
        setIndex(0);
        return;
      }
      setUserQueue((uq) => [...uq, ...songs]);
    },
    [queue.length],
  );
  const playFromUserQueue = useCallback(
    (i: number) => {
      const s = userQueue[i];
      if (!s) return;
      setUserQueue((uq) => uq.filter((_, k) => k !== i));
      insertAfterCurrent(s);
    },
    [userQueue, insertAfterCurrent],
  );
  const moveInUserQueue = useCallback((i: number, dir: -1 | 1) => {
    setUserQueue((uq) => {
      const j = i + dir;
      if (j < 0 || j >= uq.length) return uq;
      const next = uq.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);
  const removeFromUserQueue = useCallback((i: number) => setUserQueue((uq) => uq.filter((_, k) => k !== i)), []);
  const clearUserQueue = useCallback(() => setUserQueue([]), []);
  const jumpToUpcoming = useCallback((i: number) => setIndex(index + 1 + i), [index]);
  const removeUpcoming = useCallback((i: number) => setQueue((q) => q.filter((_, k) => k !== index + 1 + i)), [index]);
  const clearUpcoming = useCallback(() => setQueue((q) => q.slice(0, index + 1)), [index]);
  const startNewQueue = useCallback(() => {
    setUserQueue([]);
    setQueue((q) => q.slice(index, index + 1));
    setIndex(0);
    unshuffledRef.current = null;
  }, [index]);

  const isNative = () => modeRef.current === 'native' && !!nativeRef.current;

  const toggle = useCallback(() => {
    if (isNative()) {
      if (state === 'playing') nativeRef.current!.pause();
      // Дограла в кінці списку (повтор вимкнено) — "грати" починає пісню спочатку.
      else if (state === 'ended') nativeRef.current!.seekTo(0).then(() => nativeRef.current?.play()).catch(() => {});
      else nativeRef.current!.play();
      return;
    }
    if (state === 'playing') postCommand({ cmd: 'pause' });
    else postCommand({ cmd: 'play' });
  }, [state, postCommand]);

  // Наступна: спершу "Моя черга", далі — список (shuffle вже перемішав його наперед).
  const next = useCallback(() => {
    if (userQueue.length) {
      const [s, ...rest] = userQueue;
      setUserQueue(rest);
      insertAfterCurrent(s);
      return;
    }
    if (!queue.length) return;
    setIndex((i) => (i + 1) % queue.length);
  }, [queue.length, userQueue, insertAfterCurrent]);

  const prev = useCallback(() => {
    if (!queue.length) return;
    if (currentTimeRef.current > 3) {
      if (isNative()) nativeRef.current!.seekTo(0).catch(() => {});
      else postCommand({ cmd: 'seekTo', seconds: 0 });
      return;
    }
    setIndex((i) => (i - 1 + queue.length) % queue.length);
  }, [queue.length, postCommand]);

  const close = useCallback(() => {
    postCommand({ cmd: 'stop' });
    const native = nativeRef.current;
    if (native) {
      native.pause();
      try {
        native.clearLockScreenControls();
      } catch {
        // нічого
      }
    }
    modeRef.current = 'yt';
    setQueue([]);
    setIndex(0);
    setUserQueue([]);
    unshuffledRef.current = null;
    setVideoId(null);
    setState('idle');
    setVideoPopupOpen(false);
  }, [postCommand]);

  const seekFraction = useCallback(
    (fraction: number) => {
      if (!duration) return;
      if (isNative()) nativeRef.current!.seekTo(duration * fraction).catch(() => {});
      else postCommand({ cmd: 'seekTo', seconds: duration * fraction });
    },
    [duration, postCommand],
  );

  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      postCommand({ cmd: 'setVolume', volume: v });
      if (nativeRef.current) nativeRef.current.volume = v / 100;
    },
    [postCommand],
  );

  const toggleShuffle = useCallback(() => {
    const cur = queue[index];
    if (!shuffle) {
      if (cur && queue.length > 1) {
        unshuffledRef.current = queue;
        setQueue([cur, ...shuffled(queue.filter((_, i) => i !== index))]);
        setIndex(0);
      }
      setShuffle(true);
      return;
    }
    const orig = unshuffledRef.current;
    const i = cur && orig ? orig.findIndex((s) => s.id === cur.id) : -1;
    if (orig && i >= 0) {
      setQueue(orig);
      setIndex(i);
    }
    unshuffledRef.current = null;
    setShuffle(false);
  }, [shuffle, queue, index]);
  const toggleRepeat = useCallback(() => setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);
  // Пісня дограла сама: без повтору в кінці списку (і без "Моєї черги") — зупинитись.
  const atListEnd = !userQueue.length && index >= queue.length - 1;
  // Пісня ком'юніті з файлом і YouTube-відео водночас: грає файл (нативно, у фоні),
  // а кнопка відео перемикає її на YouTube з того самого моменту й відкриває відео.
  // Закрили відео — назад на файл з того самого моменту: YouTube не грає у фоні й
  // при вимкненому екрані, а нативний плеєр — так (і з керуванням на екрані блокування).
  const toggleVideoPopup = useCallback(() => {
    const native = nativeRef.current;
    const vid = current?.youtubeVideoId;
    if (videoPopupOpen && modeRef.current === 'yt' && native && current?.audioUrl) {
      const wasPlaying = state === 'playing' || state === 'buffering' || state === 'loading';
      postCommand({ cmd: 'stop' });
      modeRef.current = 'native';
      setVideoId(null);
      setVideoPopupOpen(false);
      native.seekTo(currentTimeRef.current).catch(() => {});
      if (wasPlaying) native.play();
      showOnLockScreen(native, current);
      return;
    }
    if (modeRef.current === 'native' && native && vid) {
      const at = native.currentTime || 0;
      native.pause();
      try {
        native.clearLockScreenControls();
      } catch {
        // нічого
      }
      modeRef.current = 'yt';
      setVideoId(vid);
      setState('loading');
      postCommand({ cmd: 'load', videoId: vid, autoplay: true, startSeconds: at });
      setVideoPopupOpen(true);
      return;
    }
    setVideoPopupOpen((o) => !o);
  }, [current, postCommand, videoPopupOpen, state]);
  const pause = useCallback(() => {
    if (isNative()) nativeRef.current!.pause();
    else postCommand({ cmd: 'pause' });
  }, [postCommand]);
  const getPosition = useCallback((): PlayerProgress => ({ currentTime: currentTimeRef.current, duration: durationRef.current }), []);

  // Оновлюємо обробник щорендеру (актуальні repeat/next/current), підписка — одна.
  nativeStatusRef.current = (st: AudioStatus) => {
    if (modeRef.current !== 'native') return;
    const seekTo = pendingSeekRef.current;
    if (seekTo != null && st.isLoaded && st.duration > 0) {
      pendingSeekRef.current = null;
      if (seekTo < st.duration - 2) nativeRef.current?.seekTo(seekTo).catch(() => {});
    }
    setCurrentTime(st.currentTime || 0);
    setDuration(st.duration || 0);
    if (st.didJustFinish) {
      if (repeatMode === 'one') {
        nativeRef.current?.seekTo(0).then(() => nativeRef.current?.play()).catch(() => {});
      } else if (repeatMode === 'off' && atListEnd) {
        setState('ended');
      } else {
        next();
      }
      return;
    }
    setState(st.playing ? 'playing' : st.isBuffering || !st.isLoaded ? 'buffering' : 'paused');
    if (!listenLoggedRef.current && currentUser?.authenticated && current) {
      const threshold = Math.min(20, (st.duration || 0) / 2);
      if (threshold > 0 && st.currentTime >= threshold) {
        listenLoggedRef.current = true;
        api.logListen(current.id).catch(() => {});
      }
    }
  };

  // YouTube не може грати у фоні — тож поки він грає, не даємо екрану згаснути.
  useEffect(() => {
    const keep = state === 'playing' && !!current && !!videoId; // videoId є лише коли грає YouTube
    if (keep) activateKeepAwakeAsync('nowl-player').catch(() => {});
    else deactivateKeepAwake('nowl-player').catch(() => {});
  }, [state, current, videoId]);

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
      } else if (modeRef.current === 'native' && (data.type === 'state' || data.type === 'time' || data.type === 'error')) {
        return;
      } else if (data.type === 'state') {
        if (data.state === 'ended') {
          if (repeatMode === 'one') {
            postCommand({ cmd: 'seekTo', seconds: 0 });
            postCommand({ cmd: 'play' });
          } else if (repeatMode === 'off' && atListEnd) {
            setState('ended');
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
    [postCommand, volume, repeatMode, atListEnd, next, currentUser, current, api],
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
      shuffle,
      repeatMode,
      volume,
      videoPopupOpen,
      isOpen,
      playFrom,
      getPosition,
      userQueue,
      addToQueue,
      addManyToQueue,
      playNow: insertAfterCurrent,
      playFromUserQueue,
      moveInUserQueue,
      removeFromUserQueue,
      clearUserQueue,
      jumpToUpcoming,
      removeUpcoming,
      clearUpcoming,
      startNewQueue,
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
      shuffle,
      repeatMode,
      volume,
      videoPopupOpen,
      isOpen,
      playFrom,
      getPosition,
      userQueue,
      addToQueue,
      addManyToQueue,
      insertAfterCurrent,
      playFromUserQueue,
      moveInUserQueue,
      removeFromUserQueue,
      clearUserQueue,
      jumpToUpcoming,
      removeUpcoming,
      clearUpcoming,
      startNewQueue,
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

  const progress = useMemo<PlayerProgress>(() => ({ currentTime, duration }), [currentTime, duration]);

  // Хук, а не Dimensions.get: при повороті екрана ширина має перерахуватись.
  const { width: screenWidth } = useWindowDimensions();
  const popupWidth = Math.min(320, screenWidth - 24);
  // Док має пріоритет над попапом, але лише коли є що показати (відео, не аудіофайл).
  const docked = !!videoDock && !!videoId;

  return (
    <PlayerCtx.Provider value={value}>
      <PlayerProgressCtx.Provider value={progress}>{children}</PlayerProgressCtx.Provider>

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

export function usePlayerProgress(): PlayerProgress {
  return useContext(PlayerProgressCtx);
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
