import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, SectionTitle } from '@/components/UI';
import { ChevronRightIcon, GlobeIcon, NoteIcon, PauseIcon, PlayIcon, TrophyIcon, VideoIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, FONT_MONO_REGULAR, FONT_SANS_BOLD, FONT_SANS_REGULAR, FONT_SERIF_BOLD, PLAYER_BAR_HEIGHT, RADIUS, SPACING } from '@/constants/theme';
import type { Playlist, PublicPlaylist, Song } from '@/api/types';

const BATTLE_SIZES = [16, 32, 64];

interface BattleState {
  round: Song[]; // пісні поточного кола (i та i+1 — пара)
  winners: Song[]; // переможці поточного кола
  matchIndex: number;
  initialSize: number;
  champion: Song | null;
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "Батл рояль": турнір на вибування з пісень плейлиста. На сайті поруч два
// YouTube-плеєри; на телефоні пісні слухаються по черзі через основний плеєр,
// а відео тієї, що грає, показується в рамці над картками (док плеєра).
export default function BattleScreen() {
  const { theme, t } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const authed = !!currentUser?.authenticated;

  const [own, setOwn] = useState<Playlist[]>([]);
  const [community, setCommunity] = useState<PublicPlaylist[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [picked, setPicked] = useState<Song[] | null>(null); // пісні плейлиста, для якого обираємо розмір
  const [opening, setOpening] = useState<number | null>(null);

  // Стан турніру одним об'єктом — так "Крок назад" просто повертає попередній знімок.
  const [bt, setBt] = useState<BattleState | null>(null);
  const [history, setHistory] = useState<BattleState[]>([]);
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);

  const loadLists = useCallback(() => {
    setListsLoading(true);
    Promise.all([authed ? api.getPlaylists().catch(() => []) : Promise.resolve([]), api.getPublicPlaylists().catch(() => [])])
      .then(([mine, pub]) => {
        setOwn(mine);
        setCommunity(pub);
      })
      .finally(() => setListsLoading(false));
  }, [api, authed]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const openPlaylist = async (id: number) => {
    setOpening(id);
    try {
      const detail = await api.getPlaylist(id);
      setPicked(detail.songs);
    } catch {
      Alert.alert(t('error.loadFailed'));
    } finally {
      setOpening(null);
    }
  };

  const start = (size: number) => {
    if (!picked) return;
    setBt({ round: shuffled(picked).slice(0, size), winners: [], matchIndex: 0, initialSize: size, champion: null });
    setHistory([]);
    setPicked(null);
  };

  const a = bt ? bt.round[bt.matchIndex * 2] : undefined;
  const b = bt ? bt.round[bt.matchIndex * 2 + 1] : undefined;

  // Пісня з минулого матчу не має грати далі: після вибору/кроку назад — пауза.
  const stopContenders = () => {
    const cur = player.current?.id;
    if (player.isPlaying && (cur === a?.id || cur === b?.id)) player.pause();
  };

  const transition = (apply: () => void) => {
    busy.current = true;
    stopContenders();
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      apply();
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        busy.current = false;
      });
    });
  };

  const choose = (side: 0 | 1) => {
    if (busy.current || !bt || !a || !b) return;
    const winner = side === 0 ? a : b;
    const snapshot = bt;
    transition(() => {
      setHistory((h) => [...h, snapshot]);
      const winners = [...snapshot.winners, winner];
      const nextIndex = snapshot.matchIndex + 1;
      if (nextIndex * 2 < snapshot.round.length) setBt({ ...snapshot, winners, matchIndex: nextIndex });
      else if (winners.length === 1) setBt({ ...snapshot, winners, champion: winner });
      else setBt({ ...snapshot, round: winners, winners: [], matchIndex: 0 });
    });
  };

  // "Крок назад": обрав не ту пісню — повертаємо попередній матч як був.
  const undo = () => {
    if (busy.current || !history.length) return;
    transition(() => {
      setBt(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    });
  };

  const leave = () => {
    stopContenders();
    setBt(null);
    setHistory([]);
  };
  const exit = () =>
    Alert.alert(t('battle.exitConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('battle.exit'), style: 'destructive', onPress: leave },
    ]);

  const listen = (song: Song) => {
    if (player.current?.id === song.id) player.toggle();
    else player.playFrom([song], song.id);
  };

  // ─── Відео-док: той самий плеєр малюється в рамці над картками ───
  const { width: winW, height: winH } = useWindowDimensions();
  const landscape = winW > winH;
  const [areaH, setAreaH] = useState(0);
  const dockRef = useRef<View>(null);
  const showingContender = !!bt && !bt.champion && (player.current?.id === a?.id || player.current?.id === b?.id);
  const measureDock = useCallback(() => {
    if (!showingContender) return player.setVideoDock(null);
    dockRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) player.setVideoDock({ x, y, width, height });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingContender, player.setVideoDock]);
  useEffect(() => {
    measureDock();
  }, [measureDock, areaH, winW, winH]);
  // Пішли з екрана (інша вкладка / назад) — прибрати док.
  useFocusEffect(
    useCallback(() => {
      measureDock();
      return () => player.setVideoDock(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [measureDock]),
  );
  useEffect(() => () => player.setVideoDock(null), [player.setVideoDock]);

  // Висота відео — щоб увесь матч (стрічка, відео, дві картки, кнопки) вміщався без прокрутки.
  const pad = SPACING.lg;
  const videoW = landscape ? (winW - pad * 3) * 0.48 : winW - pad * 2;
  const reserved = landscape ? 70 : 330; // стрічка + підпис + картки + нижні кнопки
  const videoH = Math.max(90, Math.min((videoW * 9) / 16, (areaH || winH * 0.6) - reserved));

  // ─── Стрічка прогресу: 16 → 8 → 4 → 2 → 1 ───
  const sizes: number[] = [];
  if (bt) for (let s = bt.initialSize; s >= 1; s = s / 2) sizes.push(s);
  const ribbon = (
    <View style={styles.ribbon}>
      {sizes.map((s) => {
        const current = bt?.champion ? s === 1 : s === bt?.round.length;
        const done = bt?.champion ? s > 1 : s > (bt?.round.length ?? 0);
        return (
          <View
            key={s}
            style={[
              styles.ribbonSeg,
              { borderColor: current ? theme.accent : theme.border, backgroundColor: current ? theme.accent : done ? `${theme.accent}26` : 'transparent' },
            ]}
          >
            <Text style={{ color: current ? theme.onAccent : done ? theme.accent : theme.muted, fontFamily: FONT_MONO_MEDIUM, fontSize: 12 }}>{s}</Text>
          </View>
        );
      })}
    </View>
  );

  const contender = (song: Song, side: 0 | 1) => {
    const isCur = player.current?.id === song.id;
    const playingThis = isCur && player.isPlaying;
    return (
      <View style={[styles.contender, { backgroundColor: theme.surface, borderColor: isCur ? theme.accent : theme.border }]}>
        <Text numberOfLines={2} style={[styles.cArtist, { color: theme.accent }]}>{song.artist}</Text>
        <Text numberOfLines={2} style={[styles.cTitle, { color: theme.text }]}>{song.title}</Text>
        {song.source === 'community' ? <Text style={{ color: theme.accent2, fontSize: 11, marginTop: 2 }}>{t('home.source.community')}</Text> : null}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => listen(song)} style={[styles.listenBtn, { borderColor: theme.borderStrong, backgroundColor: theme.surface2 }]}>
          {playingThis ? <PauseIcon size={14} color={theme.accent} /> : <PlayIcon size={13} color={theme.text} />}
          <Text style={{ color: theme.text, fontSize: 13, fontFamily: FONT_MONO_MEDIUM }}>{t('battle.listenBtn')}</Text>
        </TouchableOpacity>
        <Button label={t('battle.chooseBtn')} small onPress={() => choose(side)} style={{ marginTop: 8 }} />
      </View>
    );
  };

  // Рамка під відео: сам плеєр кладеться поверх неї (док); тут — підказка, коли відео нема.
  const videoFrame = (
    <View
      ref={dockRef}
      onLayout={measureDock}
      style={[styles.videoFrame, { width: videoW, height: videoH, backgroundColor: theme.surface2, borderColor: theme.border }]}
    >
      <VideoIcon size={22} color={theme.muted} />
      <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 }}>
        {showingContender && player.current?.audioUrl ? t('battle.audioOnly') : t('battle.videoHint')}
      </Text>
    </View>
  );

  const bottomBar = (
    <View style={styles.bottomBar}>
      <Button label={`↶ ${t('battle.undo')}`} variant="outline" small disabled={!history.length} onPress={undo} style={{ flex: 1 }} />
      <Button label={t('battle.exit')} variant="plain" small onPress={bt?.champion ? leave : exit} style={{ flex: 1 }} />
    </View>
  );

  if (bt) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={[styles.matchArea, { padding: pad, paddingBottom: pad + (player.isOpen ? PLAYER_BAR_HEIGHT + 8 : 0) }]} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
          {ribbon}
          {bt.champion ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
              <View style={[styles.champion, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                <TrophyIcon size={42} color={theme.accent} />
                <Text style={{ color: theme.muted, fontSize: 12, textTransform: 'uppercase', marginTop: 10, fontFamily: FONT_MONO_MEDIUM }}>
                  {t('battle.championLabel')}
                </Text>
                <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 22, marginTop: 6, textAlign: 'center' }}>{bt.champion.artist}</Text>
                <Text style={{ color: theme.accent, fontFamily: FONT_MONO_REGULAR, fontSize: 15, marginTop: 4, textAlign: 'center' }}>{bt.champion.title}</Text>
                <Button label={t('battle.listenToWinnerBtn')} onPress={() => player.playFrom([bt.champion!], bt.champion!.id)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
              </View>
              {bottomBar}
            </ScrollView>
          ) : a && b ? (
            <Animated.View style={{ flex: 1, opacity: fade }}>
              <Text style={{ color: theme.muted, textAlign: 'center', fontSize: 12, marginBottom: SPACING.sm }}>
                {t('battle.roundLabel')}
                {bt.round.length} → {bt.round.length / 2} · {bt.matchIndex + 1}/{bt.round.length / 2}
              </Text>
              <View style={[{ flex: 1, gap: SPACING.md }, landscape && { flexDirection: 'row' }]}>
                <View style={{ alignItems: 'center' }}>{videoFrame}</View>
                <View style={{ flex: 1 }}>
                  <View style={styles.pair}>
                    {contender(a, 0)}
                    {contender(b, 1)}
                    <View pointerEvents="none" style={[styles.vs, { backgroundColor: theme.bg, borderColor: theme.accent }]}>
                      <Text style={{ color: theme.accent, fontFamily: FONT_SERIF_BOLD, fontSize: 14 }}>{t('battle.vs')}</Text>
                    </View>
                  </View>
                  {bottomBar}
                </View>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const playlistCard = (key: string, id: number, name: string, sub: string, icon: React.ReactNode, badge?: string) => (
    <TouchableOpacity
      key={key}
      onPress={() => openPlaylist(id)}
      style={[styles.plCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={[styles.plIcon, { backgroundColor: theme.surface2 }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: '700' }}>{name}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{sub}</Text>
      </View>
      {badge ? <Text style={{ color: theme.accent, fontSize: 11 }}>{badge}</Text> : null}
      {opening === id ? <ActivityIndicator color={theme.accent} /> : <ChevronRightIcon size={14} color={theme.muted} />}
    </TouchableOpacity>
  );

  const available = picked ? BATTLE_SIZES.filter((s) => picked.length >= s) : [];

  return (
    <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle label={t('battle.pageOwnHeading')} />
        {!authed ? (
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t('battle.pageOwnLoginHint')}</Text>
        ) : listsLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : own.length === 0 ? (
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t('battle.pageOwnEmpty')}</Text>
        ) : (
          own.map((p) =>
            playlistCard(
              `o${p.id}`,
              p.id,
              p.name,
              `${p.songCount} ${t('profile.songsWord')}`,
              <NoteIcon size={16} color={theme.accent} />,
              p.isPublic ? t('battle.publicBadge') : undefined,
            ),
          )
        )}

        <SectionTitle label={t('battle.pagePublicHeading')} />
        {listsLoading ? null : community.length === 0 ? (
          <EmptyState icon="🌐" label={t('battle.pagePublicEmpty')} />
        ) : (
          community.map((p) =>
            playlistCard(`c${p.id}`, p.id, p.name, `${p.songCount} ${t('profile.songsWord')} — ${p.ownerLabel}`, <GlobeIcon size={16} color={theme.accent2} />),
          )
        )}
      </ScrollView>

      <Modal visible={!!picked} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sizeBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 18, marginBottom: 10 }}>{t('nav.battle')}</Text>
            <Text style={{ color: theme.muted, fontSize: 14, marginBottom: 14 }}>
              {available.length ? t('battle.chooseSize') : t('battle.notEnough')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {available.map((s) => (
                <Button key={s} label={String(s)} variant="outline" onPress={() => start(s)} style={{ minWidth: 70 }} />
              ))}
            </View>
            <Button label={t('common.cancel')} variant="plain" small onPress={() => setPicked(null)} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },
  plCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  plIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ribbon: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  ribbonSeg: { minWidth: 34, paddingVertical: 4, paddingHorizontal: 8, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center' },
  matchArea: { flex: 1 },
  pair: { flexDirection: 'row', gap: 10, flex: 1, maxHeight: 250 },
  contender: { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  cArtist: { fontFamily: FONT_SANS_BOLD, fontSize: 15 },
  cTitle: { fontFamily: FONT_SANS_REGULAR, fontSize: 13.5, marginTop: 3 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.md, minHeight: 40, marginTop: 10 },
  vs: { position: 'absolute', left: '50%', top: '38%', marginLeft: -21, width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  videoFrame: { borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  champion: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sizeBox: { width: 340, maxWidth: '90%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: 'center' },
});
