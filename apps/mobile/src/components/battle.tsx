/**
 * Турнір батлу в застосунку. Стан — початковий порядок і вибори (спільна логіка @musicdb/player),
 * тож «крок назад» миттєвий, а незавершений турнір продовжується після перезапуску. Пари — відео YouTube
 * (WebView, ≥200×200) або аудіо; «з приспіву», «не можу обрати», рейтинг — плейлистом.
 */
import type { Track } from "@musicdb/contracts/client";
import {
  championPath,
  podium,
  replayTournament,
  type TournamentState,
  tournamentKey,
  tournamentRanking,
} from "@musicdb/player";
import { useMe } from "@musicdb/sdk/react";
import { MEDALS } from "@musicdb/tokens";
import { type AudioPlayer, createAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import {
  Coins,
  Crown,
  Headphones,
  Music,
  Pause,
  RotateCcw,
  SkipForward,
  Undo2,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { api } from "@/lib/api";
import { addWinner, loadChorus, saveBattle, saveChorus } from "@/lib/battle-storage";
import { fonts, useColors, useT } from "@/lib/theme";
import { playerStore, useVideoFrame } from "@/player/store";
import { SavePlaylistSheet } from "./save-playlist";
import { AccentFill, Button, Cover, IconButton, Text } from "./ui";

type Media = { kind: "youtube"; videoId: string } | { kind: "audio"; url: string } | { kind: "none" };
type Control = { play(): void; pause(): void };

/** «З приспіву»: старт із третини пісні, не пізніше 75 с. */
const chorusStart = (t: Track) => Math.min(75, Math.round((t.durationMs / 1000) * 0.33)) || 45;

/** Вбудований плеєр YouTube з рідними кнопками; стан — повідомленнями, керування — window.cmd. */
const videoHtml = (
  id: string,
  start: number,
) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;inset:0;width:100%;height:100%}</style></head>
<body><div id="p"></div><script src="https://www.youtube.com/iframe_api"></script><script>
var player;function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function onYouTubeIframeAPIReady(){player=new YT.Player('p',{width:'100%',height:'100%',videoId:${JSON.stringify(id)},
playerVars:{autoplay:0,controls:1,playsinline:1,rel:0,iv_load_policy:3,start:${Math.max(0, Math.round(start))}},
events:{onStateChange:function(e){send({type:'state',state:e.data})}}})}
window.cmd=function(c){if(!player||!player.playVideo)return;if(c==='play')player.playVideo();else player.pauseVideo()}
</script></body></html>`;

export function Tournament({
  initial,
  title,
  initialChoices = [],
  onRematch,
  onExit,
}: {
  initial: Track[];
  title: string;
  initialChoices?: (0 | 1)[];
  onRematch: () => void;
  onExit: () => void;
}) {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [choices, setChoices] = useState<(0 | 1)[]>(initialChoices);
  const state = useMemo(() => replayTournament(initial, choices), [initial, choices]);
  const [busy, setBusy] = useState(false);
  const [chorus, setChorus] = useState(false);
  const controls = useRef<(Control | null)[]>([null, null]);
  const recorded = useRef(false);
  const me = useMe().data;
  const [winStats, setWinStats] = useState<{ wins: number; mine: number } | null>(null);
  const { size, rounds, champion, played, pair } = state;

  useEffect(() => {
    void loadChorus().then(setChorus);
  }, []);

  // Основний плеєр — на паузу, його плаваюче відео — за межі екрана на час турніру.
  useEffect(() => {
    playerStore.getState().pause();
    useVideoFrame.getState().setFrame({ x: -1000, y: 0, width: 200, height: 200 });
    return () => useVideoFrame.getState().setFrame(null);
  }, []);

  // Прогрес — на пристрій; після перемоги — у «Мої переможці».
  useEffect(() => {
    if (champion) {
      saveBattle(null);
      if (!recorded.current) {
        recorded.current = true;
        void addWinner(champion, title, size);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Перемога зараховується пісні на сервері (раз на турнір); гостям — лише показуємо лічильник.
        const key = tournamentKey(
          initial.map((x) => x.id),
          choices,
        );
        const req = me
          ? api.battle.recordWin({
              body: { trackId: champion.id, battleKey: key, poolSize: size, poolTitle: title },
            })
          : api.battle.wins({ params: { id: champion.id } });
        req.then((r) => setWinStats({ wins: r.wins, mine: r.mine })).catch(() => setWinStats(null));
      }
    } else {
      recorded.current = false;
      setWinStats(null);
      saveBattle({ title, initial, choices, savedAt: Date.now() });
    }
  }, [champion, choices, initial, title, size, me]);

  const roundTitle = useCallback(
    (len: number, m?: number) => {
      if (len === 2) return t("battle.final");
      const p = m !== undefined ? ` — ${m}/${len / 2}` : "";
      if (len === 4) return `${t("battle.semifinal")}${p}`;
      if (len === 8) return `${t("battle.quarterfinal")}${p}`;
      const x = rounds - Math.log2(len) + 1;
      return m !== undefined ? `${t("battle.round", { x, n: rounds })}${p}` : t("battle.roundShort", { x });
    },
    [rounds, t],
  );

  const choose = (side: 0 | 1) => {
    if (busy || champion || !pair) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const ctl of controls.current) ctl?.pause();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setChoices((ch) => [...ch, side]);
    }, 240);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onExit} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" muted numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ fontFamily: fonts.serif, fontSize: 19 }} numberOfLines={1}>
              {champion ? t("battle.champion") : roundTitle(state.round.length, state.match + 1)}
            </Text>
            <View style={[styles.progress, { backgroundColor: c.surface3 }]}>
              <View
                style={{
                  width: `${(played / (size - 1)) * 100}%`,
                  height: "100%",
                  borderRadius: 3,
                  backgroundColor: champion ? c.success : c.accent,
                }}
              />
            </View>
            <Text variant="caption" muted style={{ marginTop: 3 }}>
              {t("battle.played", { x: played, n: size - 1 })}
            </Text>
          </View>
          {!champion ? (
            <IconButton
              label={t("battle.chorus")}
              onPress={() =>
                setChorus((v) => {
                  saveChorus(!v);
                  return !v;
                })
              }
              style={chorus ? { backgroundColor: c.accentSoft, borderRadius: 20 } : undefined}
            >
              <SkipForward size={20} color={chorus ? c.accent : c.textMuted} />
            </IconButton>
          ) : null}
          <IconButton
            label={t("battle.undo")}
            onPress={() => setChoices((ch) => ch.slice(0, -1))}
            disabled={!choices.length}
          >
            <Undo2 size={22} color={choices.length ? c.text : c.textSubtle} />
          </IconButton>
          <IconButton label={t("battle.exit")} onPress={onExit}>
            <X size={24} color={c.text} />
          </IconButton>
        </View>

        {champion ? (
          <Champion
            state={state}
            title={title}
            winStats={winStats}
            signedIn={!!me}
            roundTitle={roundTitle}
            onListen={() => {
              playerStore.getState().playContext([champion], 0, { type: "battle", name: t("nav.battle") });
              onExit();
            }}
            onRematch={onRematch}
          />
        ) : pair ? (
          <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 24 }}>
            {pair.map((track, i) => (
              <View key={`${i}-${track.id}-${played}`}>
                {i === 1 ? (
                  <View style={styles.vsWrap}>
                    <View style={[styles.vs, { backgroundColor: c.surface2, borderColor: c.border }]}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: c.accent }}>
                        {t("battle.vs")}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => choose(Math.random() < 0.5 ? 0 : 1)}
                      style={[styles.coin, { borderColor: c.border, backgroundColor: c.surface2 }]}
                    >
                      <Coins size={14} color={c.textMuted} />
                      <Text variant="caption" muted>
                        {t("battle.coin")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                <Side
                  track={track}
                  startAt={chorus ? chorusStart(track) : 0}
                  register={(ctl) => {
                    controls.current[i] = ctl;
                  }}
                  onPlay={() => controls.current[i === 0 ? 1 : 0]?.pause()}
                  onChoose={() => choose(i as 0 | 1)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function Side({
  track,
  startAt,
  register,
  onPlay,
  onChoose,
}: {
  track: Track;
  startAt: number;
  register: (c: Control | null) => void;
  onPlay: () => void;
  onChoose: () => void;
}) {
  const t = useT();
  const c = useColors();
  const { width } = useWindowDimensions();
  const [media, setMedia] = useState<Media | null>(null);
  const [playing, setPlaying] = useState(false);
  const web = useRef<WebView>(null);
  const audio = useRef<AudioPlayer | null>(null);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const registerRef = useRef(register);
  registerRef.current = register;

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<Media> => {
      if (track.playback.youtubeVideoId) return { kind: "youtube", videoId: track.playback.youtubeVideoId };
      try {
        const src = await api.tracks.playback({
          params: { id: track.id },
          query: { prefer: track.playback.audio ? "audio" : "youtube" },
        });
        return src.type === "youtube"
          ? { kind: "youtube", videoId: src.videoId }
          : { kind: "audio", url: src.url };
      } catch {
        return { kind: "none" };
      }
    })().then((m) => !cancelled && setMedia(m));
    return () => {
      cancelled = true;
    };
  }, [track.id, track.playback.youtubeVideoId, track.playback.audio]);

  useEffect(() => {
    if (media?.kind !== "audio") return;
    const player = createAudioPlayer({ uri: media.url });
    const s = playerStore.getState();
    player.volume = s.muted ? 0 : s.volume;
    if (startAt) void player.seekTo(startAt);
    audio.current = player;
    const sub = player.addListener("playbackStatusUpdate", (st) => setPlaying(st.playing));
    return () => {
      sub.remove();
      player.remove();
      audio.current = null;
    };
  }, [media, startAt]);

  useEffect(() => {
    registerRef.current({
      play: () => {
        if (audio.current) {
          audio.current.play();
          onPlayRef.current();
        } else web.current?.injectJavaScript(`window.cmd('play');true;`);
      },
      pause: () => {
        if (audio.current) audio.current.pause();
        else web.current?.injectJavaScript(`window.cmd('pause');true;`);
      },
    });
    return () => registerRef.current(null);
  }, []);

  const onMessage = (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data) as { type: string; state?: number };
    if (m.type !== "state") return;
    if (m.state === 1) {
      setPlaying(true);
      onPlayRef.current();
    } else if (m.state === 2 || m.state === 0) setPlaying(false);
  };

  // YouTube вимагає видимий плеєр щонайменше 200×200 — 16:9 на всю ширину картки.
  const videoHeight = Math.max(200, Math.round(((width - 28 - 24) * 9) / 16));
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[styles.side, { backgroundColor: c.surface1, borderColor: c.border }]}
    >
      <View style={[styles.video, { height: videoHeight }]}>
        {media?.kind === "youtube" ? (
          <WebView
            key={`${media.videoId}-${startAt}`}
            ref={web}
            source={{ html: videoHtml(media.videoId, startAt), baseUrl: "https://nowl.app" }}
            onMessage={onMessage}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            scrollEnabled={false}
            style={{ flex: 1, backgroundColor: "#000" }}
          />
        ) : media?.kind === "audio" ? (
          <Pressable
            onPress={() => {
              if (playing) audio.current?.pause();
              else {
                audio.current?.play();
                onPlayRef.current();
              }
            }}
            style={styles.center}
          >
            <Cover
              src={track.release?.coverUrl}
              size={videoHeight}
              seed={track.id}
              radius={0}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.audioBtn}>
              <AccentFill style={StyleSheet.absoluteFill} />
              {playing ? (
                <Pause size={28} color={c.onAccent} fill={c.onAccent} />
              ) : (
                <Headphones size={28} color={c.onAccent} />
              )}
            </View>
          </Pressable>
        ) : media?.kind === "none" ? (
          <View style={styles.center}>
            <Music size={30} color={c.textMuted} />
            <Text variant="small" muted style={{ marginTop: 6 }}>
              {t("battle.videoNotFound")}
            </Text>
          </View>
        ) : (
          <View style={[styles.center, { backgroundColor: c.surface2 }]} />
        )}
      </View>
      <Text variant="title" numberOfLines={1} style={{ marginTop: 10 }}>
        {track.title}
      </Text>
      <Text variant="small" muted numberOfLines={1}>
        {track.artists.map((x) => x.name).join(", ")}
      </Text>
      <Button title={t("battle.choose")} size="lg" onPress={onChoose} style={{ marginTop: 10 }} />
    </Animated.View>
  );
}

function Champion({
  state,
  title,
  winStats,
  signedIn,
  roundTitle,
  onListen,
  onRematch,
}: {
  state: TournamentState<Track>;
  title: string;
  winStats: { wins: number; mine: number } | null;
  signedIn: boolean;
  roundTitle: (len: number) => string;
  onListen: () => void;
  onRematch: () => void;
}) {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const [saving, setSaving] = useState(false);
  const champion = state.champion!;
  const path = championPath(state);
  const places = podium(state);
  const podiumCols: [number, Track[]][] = places.second
    ? [
        [2, [places.second]],
        [1, [champion]],
        [3, places.third],
      ]
    : [];
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, alignItems: "center" }}
    >
      <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center" }}>
        <Crown size={34} color={MEDALS[0]} fill={MEDALS[0]} />
        <View style={[styles.champCover, { borderColor: MEDALS[0] }]}>
          <Cover src={champion.release?.coverUrl} size={200} seed={champion.id} radius={12} />
        </View>
      </Animated.View>
      <Text
        variant="caption"
        accent
        style={{ marginTop: 14, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: fonts.bold }}
      >
        {t("battle.champion")}
      </Text>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          color: c.accent,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {champion.title}
      </Text>
      <Text muted>{champion.artists.map((x) => x.name).join(", ")}</Text>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 16 }}
      >
        <Button title={t("battle.listenWinner")} onPress={onListen} />
        {me ? (
          <Button title={t("battle.saveRanking")} variant="outline" onPress={() => setSaving(true)} />
        ) : null}
        <Button
          title={t("battle.rematch")}
          variant="outline"
          icon={<RotateCcw size={16} color={c.text} />}
          onPress={onRematch}
        />
      </View>

      <View style={styles.statsRow}>
        {/* Перемоги — скільки разів пісня ставала чемпіоном батл роялю на N'Owl, а не дуелі цього турніру. */}
        {[
          { n: state.size, label: t("battle.songs", { count: state.size }), note: null },
          {
            n: winStats ? winStats.wins : "…",
            label: t("battle.titles", { count: winStats?.wins ?? 0 }),
            note: !signedIn
              ? t("battle.titlesSignIn")
              : winStats && winStats.mine !== winStats.wins
                ? t("battle.titlesMine", { count: winStats.mine })
                : null,
          },
          { n: state.rounds, label: t("battle.rounds", { count: state.rounds }), note: null },
        ].map(({ n, label, note }) => (
          <View key={label} style={[styles.statBox, { backgroundColor: c.surface1, borderColor: c.border }]}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: c.accent }}>{n}</Text>
            <Text variant="small" muted style={{ textAlign: "center" }}>
              {label}
            </Text>
            {note ? (
              <Text variant="caption" muted style={{ textAlign: "center", marginTop: 2 }}>
                {note}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      <View style={{ alignSelf: "stretch", marginTop: 22 }}>
        <Text variant="heading" style={{ marginBottom: 10 }}>
          {t("battle.path")}
        </Text>
        {path.map((m, i) => (
          <Animated.View
            key={`${m.size}-${m.loser.id}`}
            entering={FadeInDown.delay(i * 60)}
            style={styles.pathRow}
          >
            <View style={[styles.pathDot, { backgroundColor: m.size === 2 ? c.accent : c.borderStrong }]} />
            <Cover src={m.loser.release?.coverUrl} size={42} seed={m.loser.id} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" accent style={{ fontFamily: fonts.bold, textTransform: "uppercase" }}>
                {roundTitle(m.size)}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {m.loser.title}
              </Text>
              <Text variant="small" muted numberOfLines={1}>
                {m.loser.artists.map((x) => x.name).join(", ")}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {podiumCols.length ? (
        <View style={{ alignSelf: "stretch", marginTop: 22 }}>
          <Text variant="heading" style={{ marginBottom: 10 }}>
            {t("battle.podium")}
          </Text>
          <View style={styles.podium}>
            {podiumCols.map(([place, list]) => {
              const medal = MEDALS[place - 1]!;
              return (
                <View key={place} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row" }}>
                    {list.map((x) => (
                      <View
                        key={x.id}
                        style={{ borderWidth: 2, borderColor: medal, borderRadius: 8, marginHorizontal: -4 }}
                      >
                        <Cover src={x.release?.coverUrl} size={44} seed={x.id} />
                      </View>
                    ))}
                  </View>
                  {list.map((x) => (
                    <Text key={x.id} variant="caption" numberOfLines={1} style={{ textAlign: "center" }}>
                      {x.title}
                    </Text>
                  ))}
                  <View
                    style={[
                      styles.stand,
                      {
                        height: ({ 1: 90, 2: 64, 3: 46 } as Record<number, number>)[place],
                        backgroundColor: `${medal}33`,
                      },
                    ]}
                  >
                    <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: medal }}>{place}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <SavePlaylistSheet
        visible={saving}
        onClose={() => setSaving(false)}
        defaultTitle={t("battle.rankingTitle", { title })}
        loadTracks={() => tournamentRanking(state)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8 },
  progress: { height: 5, borderRadius: 3, marginTop: 6, overflow: "hidden" },
  side: { borderRadius: 16, borderWidth: 1, padding: 12 },
  video: { borderRadius: 10, overflow: "hidden", backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  audioBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  vsWrap: {
    alignItems: "center",
    marginVertical: -4,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  vs: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  coin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  champCover: { borderWidth: 3, borderRadius: 15, marginTop: 8, overflow: "hidden" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 20, alignSelf: "stretch" },
  statBox: { flex: 1, alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  pathRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  pathDot: { width: 10, height: 10, borderRadius: 5 },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  stand: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 4,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
});
