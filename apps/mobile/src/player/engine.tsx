/**
 * Рушій відтворення застосунку: expo-audio для власних файлів (фон, екран блокування, вирівнювання гучності)
 * і вбудований плеєр YouTube у WebView. WebView один на весь застосунок і ніколи не перемонтовується —
 * лише змінює положення (плаваюча картка ↔ повноекранний плеєр).
 */
import type { PlaybackSource, Track } from "@musicdb/contracts/client";
import { loudnessGain } from "@musicdb/player";
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { EyeOff } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { VideoFullscreenControls } from "@/components/video-fullscreen";
import { api } from "@/lib/api";
import { playerStore, usePlayer, usePlayingSource, useVideoFrame } from "./store";

const YT_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style></head>
<body><div id="p"></div><script src="https://www.youtube.com/iframe_api"></script><script>
var player,ready=false,queued=null;
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function onYouTubeIframeAPIReady(){player=new YT.Player('p',{width:'100%',height:'100%',playerVars:{autoplay:1,controls:0,playsinline:1,rel:0,iv_load_policy:3,fs:0,disablekb:1},
events:{onReady:function(){ready=true;send({type:'ready'});if(queued){window.cmd(queued);queued=null}},
onStateChange:function(e){send({type:'state',state:e.data,duration:player.getDuration()})},
onError:function(e){send({type:'error',code:e.data})}}});
setInterval(function(){if(ready&&player.getPlayerState()===1)send({type:'time',t:player.getCurrentTime(),d:player.getDuration()})},400)}
window.cmd=function(c){if(!ready){if(c.type==='load')queued=c;return}
switch(c.type){case 'load':player.loadVideoById(c.id,0);if(c.paused)setTimeout(function(){player.pauseVideo()},300);break;
case 'play':player.playVideo();break;case 'pause':player.pauseVideo();break;case 'seek':player.seekTo(c.s,true);break;
case 'volume':player.setVolume(c.v);break;case 'stop':player.stopVideo();break}}
</script></body></html>`;

type Active = { kind: "audio"; loudness: number | null } | { kind: "youtube" } | null;

async function resolveSource(track: Track): Promise<PlaybackSource> {
  if (!track.playback.audio && track.playback.youtubeVideoId)
    return { type: "youtube", videoId: track.playback.youtubeVideoId };
  return api.tracks.playback({ params: { id: track.id }, query: { prefer: "audio" } });
}

export function PlayerEngine() {
  const audio = useRef<AudioPlayer | null>(null);
  const web = useRef<WebView>(null);
  const active = useRef<Active>(null);
  const token = useRef(0);
  const [kind, setKindState] = useState<"audio" | "youtube" | null>(null);
  const setKind = (k: "audio" | "youtube" | null) => {
    setKindState(k);
    usePlayingSource.setState({ kind: k });
  };
  const current = usePlayer((s) => s.current);
  const restart = usePlayer((s) => s.restartToken);

  const yt = (cmd: Record<string, unknown>) =>
    web.current?.injectJavaScript(`window.cmd(${JSON.stringify(cmd)});true;`);

  // Режим аудіо: фон, тиха кнопка iOS, монопольний фокус (потрібно для керування з екрана блокування).
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
    const player = createAudioPlayer(null, { updateInterval: 500 });
    audio.current = player;
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (active.current?.kind !== "audio") return;
      const st = playerStore.getState();
      st.onTime(status.currentTime * 1000, status.duration ? status.duration * 1000 : undefined);
      if (status.didJustFinish) st.onEnded();
      else if (status.playing && st.status !== "playing") st.onPlaying();
    });
    return () => {
      sub.remove();
      player.remove();
    };
  }, []);

  const applyVolume = () => {
    const { volume, muted, normalize } = playerStore.getState();
    const a = active.current;
    if (a?.kind === "audio" && audio.current) {
      audio.current.volume = muted ? 0 : Math.min(1, volume * (normalize ? loudnessGain(a.loudness) : 1));
    }
    yt({ type: "volume", v: muted ? 0 : Math.round(volume * 100) });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: новий трек або повтор
  useEffect(() => {
    const my = ++token.current;
    if (!current) {
      audio.current?.pause();
      audio.current?.clearLockScreenControls();
      yt({ type: "stop" });
      active.current = null;
      setKind(null);
      return;
    }
    const track = current.track;
    void (async () => {
      let source: PlaybackSource;
      try {
        source = await resolveSource(track);
      } catch {
        if (my === token.current) playerStore.getState().onError("not_playable");
        return;
      }
      if (my !== token.current) return;
      const wantPlay = playerStore.getState().status !== "paused";
      if (source.type === "youtube") {
        audio.current?.pause();
        audio.current?.clearLockScreenControls();
        active.current = { kind: "youtube" };
        setKind("youtube");
        yt({ type: "load", id: source.videoId, paused: !wantPlay });
        applyVolume();
      } else {
        yt({ type: "pause" });
        active.current = { kind: "audio", loudness: source.loudnessLufs };
        setKind("audio");
        const player = audio.current;
        if (!player) return;
        player.replace({ uri: source.url });
        applyVolume();
        player.setActiveForLockScreen(
          true,
          {
            title: track.title,
            artist: track.artists.map((a) => a.name).join(", "),
            albumTitle: track.release?.title ?? "",
            ...(track.release?.coverUrl ? { artworkUrl: track.release.coverUrl } : {}),
          },
          { showSeekBackward: true, showSeekForward: true },
        );
        if (wantPlay) player.play();
      }
    })();
  }, [current?.uid, restart]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: одна підписка на весь час життя
  useEffect(
    () =>
      playerStore.subscribe((s, prev) => {
        const a = active.current;
        if (a && s.status !== prev.status) {
          if (s.status === "playing" && prev.status === "paused") {
            if (a.kind === "audio") audio.current?.play();
            else yt({ type: "play" });
          } else if (s.status === "paused") {
            if (a.kind === "audio") audio.current?.pause();
            else yt({ type: "pause" });
          }
        }
        if (a && s.seekRequest && s.seekRequest !== prev.seekRequest) {
          if (a.kind === "audio") void audio.current?.seekTo(s.seekRequest.ms / 1000);
          else yt({ type: "seek", s: s.seekRequest.ms / 1000 });
        }
        if (s.volume !== prev.volume || s.muted !== prev.muted || s.normalize !== prev.normalize)
          applyVolume();
      }),
    [],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    if (active.current?.kind !== "youtube") return;
    const msg = JSON.parse(e.nativeEvent.data) as {
      type: string;
      state?: number;
      t?: number;
      d?: number;
      duration?: number;
    };
    const st = playerStore.getState();
    if (msg.type === "time" && msg.t != null) st.onTime(msg.t * 1000, msg.d ? msg.d * 1000 : undefined);
    if (msg.type === "state") {
      if (msg.state === 1) {
        st.onPlaying();
        if (msg.duration) st.onLoaded(msg.duration * 1000);
      } else if (msg.state === 2) st.onPaused();
      else if (msg.state === 0) st.onEnded();
    }
    if (msg.type === "error") st.onError("youtube_error");
  };

  return <VideoHost visible={kind === "youtube"} webRef={web} onMessage={onMessage} />;
}

function VideoHost({
  visible,
  webRef,
  onMessage,
}: {
  visible: boolean;
  webRef: React.RefObject<WebView | null>;
  onMessage: (e: WebViewMessageEvent) => void;
}) {
  const frame = useVideoFrame((s) => s.frame);
  const fullscreen = useVideoFrame((s) => s.fullscreen);
  const setFullscreen = useVideoFrame((s) => s.setFullscreen);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  // YouTube вимагає видиме вікно плеєра щонайменше 200×200.
  const mini = { x: width - 212, y: height - insets.bottom - 56 - 64 - 212, width: 200, height: 200 };
  const f = frame ?? mini;
  const full = fullscreen && visible;
  const hidden = useVideoFrame((s) => s.hidden);
  const setHidden = useVideoFrame((s) => s.setHidden);
  const offscreen = !frame && hidden && !full;

  // Наступна пісня без відео — виходимо з повноекранного режиму.
  useEffect(() => {
    if (fullscreen && !visible) setFullscreen(false);
  }, [fullscreen, visible, setFullscreen]);

  // Кнопка «Назад» на Android — вихід із відео на весь екран, а не з екрана.
  useEffect(() => {
    if (!full) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [full, setFullscreen]);

  return (
    <View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.host,
        full
          ? {
              // Застосунок — портретний, тож «альбомне» відео — це контейнер, повернутий на 90°.
              left: (width - height) / 2,
              top: (height - width) / 2,
              width: height,
              height: width,
              opacity: 1,
              elevation: 30,
              transform: [{ rotate: "90deg" }],
            }
          : visible && offscreen
            ? { left: -1000, top: 0, width: 200, height: 200, opacity: 1 }
            : visible
              ? { left: f.x, top: f.y, width: f.width, height: f.height, opacity: 1 }
              : { left: -1000, top: 0, width: 200, height: 200, opacity: 0 },
        !frame && visible && !full ? styles.floating : null,
      ]}
    >
      <WebView
        ref={webRef}
        source={{ html: YT_HTML, baseUrl: "https://nowl.app" }}
        onMessage={onMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
      />
      {!frame && visible && !full && !offscreen ? (
        <Pressable onPress={() => setHidden(true)} style={styles.hide} accessibilityLabel="hide video">
          <EyeOff size={16} color="#fff" />
        </Pressable>
      ) : null}
      {full ? (
        <>
          <StatusBar hidden />
          <VideoFullscreenControls onExit={() => setFullscreen(false)} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", zIndex: 50, overflow: "hidden", backgroundColor: "#000" },
  floating: { borderRadius: 14, elevation: 12, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 16 },
  web: { flex: 1, backgroundColor: "#000" },
  hide: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
