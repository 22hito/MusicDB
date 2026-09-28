import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, SectionTitle } from '@/components/UI';
import { MarqueeText } from '@/components/MarqueeText';
import { SelectField } from '@/components/SelectField';
import { ChevronRightIcon, DiscIcon, GlobeIcon, NoteIcon, PauseIcon, PlayIcon, TrophyIcon, VideoIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, FONT_MONO_REGULAR, FONT_SANS_BOLD, FONT_SANS_REGULAR, FONT_SERIF_BOLD, PLAYER_BAR_HEIGHT, RADIUS, SPACING } from '@/constants/theme';
import type { Playlist, PublicPlaylist, Song } from '@/api/types';

const BATTLE_SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];
const ytThumb = (s: Song | null | undefined, size = 'mqdefault') =>
  s?.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/${size}.jpg` : null;

interface BattleState {
  round: Song[]; // пісні поточного кола (i та i+1 — пара)
  winners: Song[]; // переможці поточного кола
  matchIndex: number;
  initialSize: number;
  champion: Song | null;
}

// Зіграний матч — для «шляху до перемоги» й призерів на екрані переможця.
interface BattleMatch {
  size: number;
  winner: Song;
  loser: Song;
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
  const { theme, t, count } = useSettings();
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const player = usePlayer();
  const authed = !!currentUser?.authenticated;

  const [own, setOwn] = useState<Playlist[]>([]);
  const [community, setCommunity] = useState<PublicPlaylist[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [picked, setPicked] = useState<Song[] | null>(null); // пісні плейлиста, для якого обираємо розмір
  const [opening, setOpening] = useState<number | null>(null);
  // Батл за жанром: пісні обох таблиць, жанри з 16+ піснями.
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [genre, setGenre] = useState('');

  // Стан турніру одним об'єктом — так "Крок назад" просто повертає попередній знімок.
  const [bt, setBt] = useState<BattleState | null>(null);
  const [history, setHistory] = useState<BattleState[]>([]);
  const [log, setLog] = useState<BattleMatch[]>([]);
  const [pool, setPool] = useState<Song[] | null>(null); // пісні турніру — для «Нового турніру»
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);

  const loadLists = useCallback(() => {
    setListsLoading(true);
    Promise.all([
      authed ? api.getPlaylists().catch(() => []) : Promise.resolve([]),
      api.getPublicPlaylists().catch(() => []),
      api.getSongs('all').catch(() => [] as Song[]),
    ])
      .then(([mine, pub, songsAll]) => {
        setOwn(mine);
        setCommunity(pub);
        setAllSongs(songsAll);
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

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of allSongs) for (const g of s.genres) counts.set(g, (counts.get(g) || 0) + 1);
    return [...counts.entries()]
      .filter(([, n]) => n >= BATTLE_SIZES[0])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([g, n]) => ({ value: g, label: `${g.replace(/alternative/gi, 'alt')} — ${n}` }));
  }, [allSongs]);
  const selectedGenre = genreOptions.some((o) => o.value === genre) ? genre : genreOptions[0]?.value ?? '';
  // Розмір (16/32/64) — у тому ж вікні, що й для плейлиста; перемішування — у start().
  const startGenre = () => {
    if (selectedGenre) setPicked(allSongs.filter((s) => s.genres.includes(selectedGenre)));
  };

  const begin = (songs: Song[], size: number) => {
    setBt({ round: shuffled(songs).slice(0, size), winners: [], matchIndex: 0, initialSize: size, champion: null });
    setHistory([]);
    setLog([]);
    setPool(songs);
  };
  const start = (size: number) => {
    if (!picked) return;
    begin(picked, size);
    setPicked(null);
  };
  const rematch = () => {
    if (pool && bt) begin(pool, bt.initialSize);
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
      setLog((l) => [...l, { size: snapshot.round.length, winner, loser: side === 0 ? b : a }]);
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
      setLog((l) => l.slice(0, -1));
    });
  };

  const leave = () => {
    stopContenders();
    setBt(null);
    setHistory([]);
    setLog([]);
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
  const reserved = landscape ? 70 : 370; // стрічка + підпис + картки (мін. 190) + нижні кнопки
  const videoH = Math.max(90, Math.min((videoW * 9) / 16, (areaH || winH * 0.6) - reserved));

  // ─── Прогрес: «Раунд 3 з 10 — 5/128» (останні раунди — за назвою) і смужка зіграних матчів (їх N − 1) ───
  const roundTitle = (size: number, match: number, initial: number) => {
    if (size === 2) return t('battle.final');
    const pair = `${match}/${size / 2}`;
    if (size === 4) return `${t('battle.semifinal')} — ${pair}`;
    if (size === 8) return `${t('battle.quarterfinal')} — ${pair}`;
    const rounds = Math.log2(initial);
    const round = rounds - Math.log2(size) + 1;
    return `${t('battle.round').replace('{x}', String(round)).replace('{n}', String(rounds))} — ${pair}`;
  };
  const played = bt ? (bt.champion ? bt.initialSize - 1 : bt.initialSize - bt.round.length + bt.matchIndex) : 0;
  const ribbon = bt ? (
    <View style={styles.ribbon}>
      {!bt.champion ? (
        <Text style={{ color: theme.text, textAlign: 'center', fontFamily: FONT_SANS_BOLD, fontSize: 13 }}>
          {roundTitle(bt.round.length, bt.matchIndex + 1, bt.initialSize)}
        </Text>
      ) : null}
      <View style={styles.progressRow}>
        <View style={[styles.progress, { backgroundColor: theme.surface2 }]}>
          <View style={[styles.progressFill, { width: `${(played / Math.max(1, bt.initialSize - 1)) * 100}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={{ color: theme.muted, fontSize: 11, fontFamily: FONT_MONO_REGULAR }}>
          {t('battle.played').replace('{x}', String(played)).replace('{n}', String(bt.initialSize - 1))}
        </Text>
      </View>
    </View>
  ) : null;
  // Тло, як на сайті: розмиті обкладинки обох пісень матчу (у переможця — його).
  const bgSongs = bt ? (bt.champion ? [bt.champion, bt.champion] : [a, b]) : [];
  const stageBg = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bgSongs.map((s, i) => {
        const uri = ytThumb(s);
        return uri ? (
          <Image key={i} source={{ uri }} blurRadius={40} style={[styles.bgHalf, i === 0 ? { left: 0 } : { right: 0 }]} />
        ) : null;
      })}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, opacity: 0.7 }]} />
    </View>
  );

  // ─── Переможець: шлях (кого переміг у кожному колі) і призери (фіналіст, півфіналісти) ───
  const roundShort = (size: number) => {
    if (size === 2) return t('battle.final');
    if (size === 4) return t('battle.semifinal');
    if (size === 8) return t('battle.quarterfinal');
    return t('battle.roundShort').replace('{x}', String(Math.log2(bt?.initialSize || 2) - Math.log2(size) + 1));
  };
  const championPath = bt?.champion ? log.filter((m) => m.winner.id === bt.champion!.id) : [];
  const finalist = log.find((m) => m.size === 2)?.loser;
  const podium = bt?.champion
    ? [
        { song: bt.champion, place: '1', color: theme.accent },
        ...(finalist ? [{ song: finalist, place: '2', color: '#aab3bd' }] : []),
        ...log.filter((m) => m.size === 4).map((m) => ({ song: m.loser, place: '3', color: '#c08a5f' })),
      ]
    : [];
  const champRow = (key: string, song: Song, tag: string, tagColor: string, medal = false) => {
    const uri = ytThumb(song);
    return (
      <View key={key} style={styles.champRow}>
        {medal ? (
          <View style={[styles.medal, { backgroundColor: tagColor }]}>
            <Text style={{ color: '#1a1a1a', fontFamily: FONT_SANS_BOLD, fontSize: 12 }}>{tag}</Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={[styles.champTag, { color: tagColor }]}>{tag}</Text>
        )}
        {uri ? (
          <Image source={{ uri }} style={styles.champThumb} />
        ) : (
          <View style={[styles.champThumb, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
            <NoteIcon size={12} color={theme.muted} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONT_SANS_BOLD, fontSize: 13 }}>{song.artist}</Text>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>{song.title}</Text>
        </View>
      </View>
    );
  };

  const contender = (song: Song, side: 0 | 1) => {
    const isCur = player.current?.id === song.id;
    const playingThis = isCur && player.isPlaying;
    return (
      <View style={[styles.contender, { backgroundColor: theme.surface, borderColor: isCur ? theme.accent : theme.border }]}>
        {/* По рядку на виконавця й назву: що не влазить — біжить рядком (MarqueeText),
            тож кнопки нижче завжди на своєму місці. Повна назва — ще й довгим натисканням. */}
        <Pressable
          style={styles.cText}
          onLongPress={() => Alert.alert(song.artist, song.title)}
          delayLongPress={350}
        >
          <MarqueeText style={[styles.cArtist, { color: theme.accent }]}>{song.artist}</MarqueeText>
          <MarqueeText style={[styles.cTitle, { color: theme.text }]}>{song.title}</MarqueeText>
          {song.source === 'community' ? (
            <Text numberOfLines={1} style={{ color: theme.accent2, fontSize: 11, marginTop: 3 }}>{t('home.source.community')}</Text>
          ) : null}
        </Pressable>
        <View style={styles.cActions}>
          <TouchableOpacity onPress={() => listen(song)} style={[styles.listenBtn, { borderColor: theme.borderStrong, backgroundColor: theme.surface2 }]}>
            {playingThis ? <PauseIcon size={14} color={theme.accent} /> : <PlayIcon size={13} color={theme.text} />}
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontFamily: FONT_MONO_MEDIUM, flexShrink: 1 }}>{t('battle.listenBtn')}</Text>
          </TouchableOpacity>
          <Button label={t('battle.chooseBtn')} small onPress={() => choose(side)} style={styles.chooseBtn} />
        </View>
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
        {stageBg}
        <View style={[styles.matchArea, { padding: pad, paddingBottom: pad + (player.isOpen ? PLAYER_BAR_HEIGHT + 8 : 0) }]} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
          {ribbon}
          {bt.champion ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, gap: SPACING.md, paddingTop: 22 }}>
              <View style={[styles.champion, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                <View style={[styles.championCoverWrap, { borderColor: theme.accent, backgroundColor: theme.surface2 }]}>
                  {ytThumb(bt.champion, 'hqdefault') ? (
                    <Image source={{ uri: ytThumb(bt.champion, 'hqdefault')! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <NoteIcon size={40} color={theme.accent} />
                  )}
                </View>
                <View style={[styles.crown, { backgroundColor: theme.accent, borderColor: theme.bg }]}>
                  <TrophyIcon size={20} color={theme.onAccent} />
                </View>
                <Text style={{ color: theme.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4, fontFamily: FONT_SANS_BOLD }}>
                  {t('battle.championLabel')}
                </Text>
                <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 24, marginTop: 6, textAlign: 'center' }}>{bt.champion.artist}</Text>
                <Text style={{ color: theme.muted, fontSize: 15, marginTop: 4, textAlign: 'center' }}>{bt.champion.title}</Text>
                <View style={styles.statRow}>
                  {[t('battle.statSize').replace('{n}', count('count.songs', bt.initialSize)), count('count.wins', championPath.length)].map((s) => (
                    <Text key={s} style={[styles.statChip, { color: theme.text2, borderColor: `${theme.accent}55`, backgroundColor: `${theme.accent}18` }]}>
                      {s}
                    </Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: SPACING.sm, alignSelf: 'stretch', marginTop: 16 }}>
                  <Button label={t('battle.listenToWinnerBtn')} small onPress={() => player.playFrom([bt.champion!], bt.champion!.id)} style={{ flex: 1 }} />
                  <Button label={t('battle.rematch')} small variant="outline" onPress={rematch} style={{ flex: 1 }} />
                </View>
              </View>
              {championPath.length ? (
                <View style={[styles.champCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.champCardTitle, { color: theme.muted }]}>{t('battle.pathTitle')}</Text>
                  {championPath.map((m, i) => champRow(`p${i}`, m.loser, roundShort(m.size), m.size === 2 ? theme.accent : theme.muted))}
                </View>
              ) : null}
              <View style={[styles.champCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.champCardTitle, { color: theme.muted }]}>{t('battle.podiumTitle')}</Text>
                {podium.map((p, i) => champRow(`pod${i}`, p.song, p.place, p.color, true))}
              </View>
              {bottomBar}
            </ScrollView>
          ) : a && b ? (
            <Animated.View style={{ flex: 1, opacity: fade }}>
              <View style={[{ flex: 1, gap: SPACING.md }, landscape && { flexDirection: 'row' }]}>
                <View style={{ alignItems: 'center' }}>{videoFrame}</View>
                <View style={{ flex: 1 }}>
                  <View style={styles.pair}>
                    {contender(a, 0)}
                    {contender(b, 1)}
                    <View pointerEvents="none" style={[styles.vs, { backgroundColor: theme.bg, borderColor: theme.accent }]}>
                      <Text style={{ color: theme.accent, fontFamily: FONT_SERIF_BOLD, fontSize: 12 }}>{t('battle.vs')}</Text>
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
        <View style={[styles.genreCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: theme.accent }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.plIcon, { backgroundColor: theme.surface2 }]}>
              <DiscIcon size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{t('battle.genreHeading')}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{t('battle.genreHint')}</Text>
            </View>
          </View>
          {listsLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : genreOptions.length ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <SelectField value={selectedGenre} options={genreOptions} onChange={setGenre} title={t('battle.genreHeading')} searchable style={{ flex: 1 }} />
              <Button label={t('battle.genreStart')} small onPress={startGenre} />
            </View>
          ) : (
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t('battle.genreEmpty')}</Text>
          )}
        </View>

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
              count('count.songs', p.songCount),
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
            playlistCard(`c${p.id}`, p.id, p.name, `${count('count.songs', p.songCount)} — ${p.ownerLabel || t('battle.ownerFallback')}`, <GlobeIcon size={16} color={theme.accent2} />),
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
  genreCard: { borderWidth: 1, borderLeftWidth: 3, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md, marginBottom: SPACING.sm },
  ribbon: { gap: 8, marginBottom: SPACING.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { flex: 1, height: 4, borderRadius: RADIUS.pill, overflow: 'hidden' },
  bgHalf: { position: 'absolute', top: '-10%', bottom: '-10%', width: '60%', opacity: 0.55 },
  championCoverWrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  crown: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginTop: -21, marginBottom: 6 },
  statRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  statChip: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1, overflow: 'hidden' },
  champCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8 },
  champCardTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_SANS_BOLD, marginBottom: 2 },
  champRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  champTag: { width: 92, fontSize: 11, fontFamily: FONT_SANS_BOLD, textTransform: 'uppercase' },
  medal: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  champThumb: { width: 56, height: 32, borderRadius: 6 },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },
  matchArea: { flex: 1 },
  pair: { flexDirection: 'row', gap: 10, flex: 1, minHeight: 190, maxHeight: 260, marginTop: 12 },
  contender: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, paddingTop: SPACING.md + 6 },
  cText: { flex: 1, minHeight: 0, overflow: 'hidden' },
  cArtist: { fontFamily: FONT_SANS_BOLD, fontSize: 15, lineHeight: 19 },
  cTitle: { fontFamily: FONT_SANS_REGULAR, fontSize: 13.5, lineHeight: 18, marginTop: 3 },
  cActions: { gap: 8, marginTop: 10 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.md, height: 40, paddingHorizontal: 8 },
  chooseBtn: { height: 40, minHeight: 40, paddingHorizontal: 8 },
  vs: { position: 'absolute', left: '50%', top: -14, marginLeft: -17, width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  videoFrame: { borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  champion: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sizeBox: { width: 340, maxWidth: '90%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: 'center' },
});
