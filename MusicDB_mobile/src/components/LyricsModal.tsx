import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { CloseIcon } from './Icons';
import { MarqueeText } from './MarqueeText';
import { FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SERIF_BLACK, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

// Текст поточної пісні — аналог панелі "Текст" (караоке) у плеєрі сайту.
// Перемикання пісні при відкритому вікні одразу підтягує новий текст.
export function LyricsModal({ song, onClose }: { song: Song | null; onClose: () => void }) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const songId = song?.id;

  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    setLoading(true);
    setText(null);
    api
      .getLyrics(songId)
      .then((d) => !cancelled && setText(d.lyrics || ''))
      .catch(() => !cancelled && setText(''))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, songId]);

  return (
    <Modal visible={!!song} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <MarqueeText style={[styles.title, { color: theme.text }]}>{song?.title ?? ''}</MarqueeText>
              <MarqueeText style={[styles.artist, { color: theme.accent }]}>{song?.artist ?? ''}</MarqueeText>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: theme.surface2 }]}>
              <CloseIcon size={13} color={theme.muted} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 40 }} />
          ) : text ? (
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
              <Text selectable style={[styles.lyrics, { color: theme.text }]}>{text}</Text>
            </ScrollView>
          ) : (
            <Text style={[styles.empty, { color: theme.muted }]}>{t('player.karaokeEmpty')}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, maxHeight: '85%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.lg },
  title: { fontFamily: FONT_SERIF_BLACK, fontSize: 22 },
  artist: { fontFamily: FONT_SANS_MEDIUM, fontSize: 14, marginTop: 2 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lyrics: { fontFamily: FONT_SANS_REGULAR, fontSize: 16, lineHeight: 26 },
  empty: { fontFamily: FONT_SANS_REGULAR, fontSize: 14, textAlign: 'center', marginVertical: 40 },
});
