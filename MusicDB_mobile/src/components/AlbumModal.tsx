import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { usePlayer } from '@/player/PlayerContext';
import { Button } from './UI';
import { CloseIcon, DiscIcon, EyeIcon, PauseIcon, PlayIcon, PlusIcon } from './Icons';
import { FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, FONT_SERIF_BLACK, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

export interface AlbumView {
  name: string;
  songs: Song[];
  year: string;
  cover: string | null;
}

// Порядок як в оригіналі (номер треку); без номера — за датою, потім за назвою.
export const albumTrackOrder = (x: Song, y: Song) =>
  (x.trackNumber ?? 1e4) - (y.trackNumber ?? 1e4) || (x.release || '').localeCompare(y.release || '') || x.title.localeCompare(y.title);
// Рік альбому — його власна дата; інакше найраніша пісня (сингл міг вийти раніше за альбом).
export const albumYear = (list: Song[]) =>
  (list.find((s) => s.albumRelease)?.albumRelease || list.map((s) => s.release || '').filter(Boolean).sort()[0] || '').slice(0, 4);

const durSeconds = (d: string) => {
  const p = (d || '').split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0;
};
const shortDur = (d: string) => (d || '').replace(/^00:0?(?=\d:)/, '');
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Альбом — як вікно альбому на сайті: обкладинка, рік, кількість пісень і тривалість,
// "Слухати" / "Перемішати" / "У чергу", список пісень (натиснути — грати з цієї пісні).
export function AlbumModal({ album, artistName, onClose }: { album: AlbumView | null; artistName: string; onClose: () => void }) {
  const { theme, t } = useSettings();
  const player = usePlayer();
  const insets = useSafeAreaInsets();
  if (!album) return null;
  const total = album.songs.reduce((sum, s) => sum + durSeconds(s.duration), 0);
  const plays = album.songs.reduce((sum, s) => sum + (s.playCount || 0), 0);
  const meta = [
    album.year && album.year !== '0001' ? album.year : null,
    `${album.songs.length} ${t('profile.songsWord')}`,
    total ? t('album.minutes').replace('{n}', String(Math.max(1, Math.round(total / 60)))) : null,
    plays ? `${plays} ${t('artist.listenersWord')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const playList = (list: Song[], id?: number) => list.length && player.playFrom(list, id ?? list[0].id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.md }]} onPress={() => {}}>
          {album.cover ? <Image source={{ uri: album.cover }} style={styles.bg} blurRadius={30} /> : null}
          <View style={[styles.bgFade, { backgroundColor: theme.surface }]} />
          <TouchableOpacity onPress={onClose} hitSlop={10} style={[styles.close, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <CloseIcon size={13} color={theme.muted} />
          </TouchableOpacity>
          <View style={styles.head}>
            <View style={[styles.cover, { backgroundColor: theme.surface2 }]}>
              {album.cover ? <Image source={{ uri: album.cover }} style={StyleSheet.absoluteFill} /> : <DiscIcon size={34} color={theme.muted} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.label, { color: theme.muted }]}>{t('album.label')}</Text>
              <Text numberOfLines={3} style={[styles.title, { color: theme.text }]}>{album.name}</Text>
              <Text numberOfLines={1} style={{ color: theme.accent, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 14, marginTop: 2 }}>{artistName}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{meta}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button label={t('artist.playAll')} small onPress={() => playList(album.songs)} style={{ flex: 1 }} />
            <Button label={t('artist.shuffle')} small variant="outline" onPress={() => playList(shuffled(album.songs))} style={{ flex: 1 }} />
            <Button label={t('album.queue')} small variant="outline" onPress={() => player.addManyToQueue(album.songs)} style={{ flex: 1 }} />
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {album.songs.map((s, k) => {
              const cur = player.current?.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => (cur ? player.toggle() : playList(album.songs, s.id))}
                  style={[styles.track, cur && { backgroundColor: `${theme.accent}14` }]}
                >
                  <View style={styles.trackN}>
                    {cur ? (
                      player.isPlaying ? <PauseIcon size={12} color={theme.accent} /> : <PlayIcon size={11} color={theme.accent} />
                    ) : (
                      <Text style={{ color: theme.muted, fontSize: 13 }}>{k + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: cur ? theme.accent : theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 14 }}>{s.title}</Text>
                    <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12, fontFamily: FONT_SANS_REGULAR }}>{s.artist}</Text>
                  </View>
                  <View style={styles.trackMeta}>
                    <EyeIcon size={12} color={theme.muted} />
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{s.playCount ?? 0}</Text>
                  </View>
                  <Text style={{ color: theme.muted, fontSize: 12, minWidth: 34, textAlign: 'right' }}>{shortDur(s.duration)}</Text>
                  <TouchableOpacity onPress={() => player.addToQueue(s)} hitSlop={8} style={styles.addBtn} accessibilityLabel={t('queue.add')}>
                    <PlusIcon size={16} color={theme.muted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, overflow: 'hidden' },
  bg: { position: 'absolute', top: -40, left: -40, right: -40, height: 260, opacity: 0.35 },
  bgFade: { position: 'absolute', top: 150, left: 0, right: 0, bottom: 0, opacity: 0.9 },
  close: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-end', paddingRight: 30 },
  cover: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_SANS_SEMIBOLD },
  title: { fontSize: 21, lineHeight: 26, fontFamily: FONT_SERIF_BLACK, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: SPACING.md, marginBottom: SPACING.sm },
  track: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10 },
  trackN: { width: 22, alignItems: 'center' },
  trackMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
