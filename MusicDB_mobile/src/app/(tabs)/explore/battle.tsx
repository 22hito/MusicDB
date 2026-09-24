import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button, EmptyState, SectionTitle } from '@/components/UI';
import { ChevronRightIcon, GlobeIcon, NoteIcon, PauseIcon, PlayIcon, TrophyIcon } from '@/components/Icons';
import { FONT_MONO_MEDIUM, FONT_MONO_REGULAR, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Playlist, PublicPlaylist, Song } from '@/api/types';

const BATTLE_SIZES = [16, 32, 64];

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "Батл рояль": турнір на вибування з пісень плейлиста. На сайті поруч два
// YouTube-плеєри; на телефоні пісні слухаються по черзі через основний плеєр
// (міні-плеєр унизу) — два відео одночасно на малому екрані незручні й важкі.
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

  const [round, setRound] = useState<Song[]>([]);
  const [winners, setWinners] = useState<Song[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [initialSize, setInitialSize] = useState(0);
  const [champion, setChampion] = useState<Song | null>(null);
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
    setRound(shuffled(picked).slice(0, size));
    setWinners([]);
    setMatchIndex(0);
    setInitialSize(size);
    setChampion(null);
    setPicked(null);
  };

  const inTournament = initialSize > 0;
  const a = round[matchIndex * 2];
  const b = round[matchIndex * 2 + 1];

  const choose = (side: 0 | 1) => {
    if (busy.current || !a || !b) return;
    busy.current = true;
    const winner = side === 0 ? a : b;
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      const nextWinners = [...winners, winner];
      const nextIndex = matchIndex + 1;
      if (nextIndex * 2 >= round.length) {
        if (nextWinners.length === 1) {
          setChampion(winner);
        } else {
          setRound(nextWinners);
          setWinners([]);
          setMatchIndex(0);
        }
      } else {
        setWinners(nextWinners);
        setMatchIndex(nextIndex);
      }
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start(() => {
        busy.current = false;
      });
    });
  };

  const exit = () =>
    Alert.alert(t('battle.exitConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('battle.exit'), style: 'destructive', onPress: () => setInitialSize(0) },
    ]);

  const listen = (song: Song) => {
    if (player.current?.id === song.id) player.toggle();
    else player.playFrom([song], song.id);
  };

  // ─── Стрічка прогресу: 16 → 8 → 4 → 2 → 1 ───
  const sizes: number[] = [];
  for (let s = initialSize; s >= 1; s = s / 2) sizes.push(s);
  const ribbon = (
    <View style={styles.ribbon}>
      {sizes.map((s) => {
        const current = champion ? s === 1 : s === round.length;
        const done = champion ? s > 1 : s > round.length;
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
    const playingThis = player.current?.id === song.id && player.isPlaying;
    return (
      <View style={[styles.contender, { backgroundColor: theme.surface, borderColor: playingThis ? theme.accent : theme.border }]}>
        <Text numberOfLines={2} style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 18 }}>{song.artist}</Text>
        <Text numberOfLines={2} style={{ color: theme.muted, fontFamily: FONT_MONO_REGULAR, fontSize: 14, marginTop: 3 }}>{song.title}</Text>
        {song.source === 'community' ? (
          <Text style={{ color: theme.accent2, fontSize: 11, marginTop: 4 }}>{t('home.source.community')}</Text>
        ) : null}
        <View style={styles.contenderActions}>
          <TouchableOpacity onPress={() => listen(song)} style={[styles.listenBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
            {playingThis ? <PauseIcon size={14} color={theme.accent} /> : <PlayIcon size={13} color={theme.text} />}
            <Text style={{ color: theme.text, fontSize: 13, fontFamily: FONT_MONO_MEDIUM }}>{t('battle.listenBtn')}</Text>
          </TouchableOpacity>
          <Button label={t('battle.chooseBtn')} small onPress={() => choose(side)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  };

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

  if (inTournament) {
    return (
      <SafeAreaView edges={[]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          {ribbon}
          {champion ? (
            <View style={[styles.champion, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
              <TrophyIcon size={42} color={theme.accent} />
              <Text style={{ color: theme.muted, fontSize: 12, textTransform: 'uppercase', marginTop: 10, fontFamily: FONT_MONO_MEDIUM }}>
                {t('battle.championLabel')}
              </Text>
              <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 22, marginTop: 6, textAlign: 'center' }}>{champion.artist}</Text>
              <Text style={{ color: theme.accent, fontFamily: FONT_MONO_REGULAR, fontSize: 15, marginTop: 4, textAlign: 'center' }}>{champion.title}</Text>
              <Button label={t('battle.listenToWinnerBtn')} onPress={() => player.playFrom([champion], champion.id)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
              <Button label={t('battle.exit')} variant="outline" onPress={() => setInitialSize(0)} style={{ marginTop: 10, alignSelf: 'stretch' }} />
            </View>
          ) : a && b ? (
            <Animated.View style={{ opacity: fade }}>
              <Text style={{ color: theme.muted, textAlign: 'center', fontSize: 12, marginBottom: SPACING.md }}>
                {t('battle.roundLabel')}
                {round.length} → {round.length / 2} · {matchIndex + 1}/{round.length / 2}
              </Text>
              {contender(a, 0)}
              <Text style={{ color: theme.accent, fontFamily: FONT_SERIF_BOLD, fontSize: 22, textAlign: 'center', marginVertical: 8 }}>
                {t('battle.vs')}
              </Text>
              {contender(b, 1)}
              <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: SPACING.lg }}>{t('battle.mobileHint')}</Text>
              <Button label={t('battle.exit')} variant="plain" small onPress={exit} style={{ marginTop: SPACING.md, alignSelf: 'center' }} />
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
  contender: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg },
  contenderActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 14, minHeight: 40 },
  champion: { borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sizeBox: { width: 340, maxWidth: '90%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: 'center' },
});
