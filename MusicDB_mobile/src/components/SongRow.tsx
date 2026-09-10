import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { Badge } from './UI';
import { EditIcon, HeartIcon, PauseIcon, PlayIcon, PlusIcon, TrashIcon } from './Icons';
import { FONT_MONO_REGULAR, FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';
import type { Song } from '@/api/types';

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

// Скорочення довгих назв жанрів лише для відображення — як у вебі.
function abbrGenre(name: string) {
  return name.replace(/alternative/gi, 'alt');
}

export function SongRow({
  song,
  isCurrent,
  isPlaying,
  isFavorite,
  isAdmin,
  authenticated,
  showFavorite,
  showAddToPlaylist,
  showEdit,
  showDelete,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onEdit,
  onDelete,
}: {
  song: Song;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isFavorite?: boolean;
  isAdmin?: boolean;
  authenticated?: boolean;
  showFavorite?: boolean;
  showAddToPlaylist?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  onAddToPlaylist?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { theme, t } = useSettings();
  const wantFavorite = showFavorite ?? authenticated;
  const wantAddToPlaylist = showAddToPlaylist ?? authenticated;
  const wantEdit = showEdit ?? isAdmin;
  const wantDelete = showDelete ?? isAdmin;

  return (
    <View
      style={[
        styles.row,
        { borderColor: theme.border, backgroundColor: isCurrent ? `${theme.accent}12` : 'transparent' },
      ]}
    >
      <View style={styles.topLine}>
        <TouchableOpacity onPress={onPlay} style={[styles.playBtn, { backgroundColor: theme.surface2 }]} hitSlop={10}>
          {isCurrent && isPlaying ? (
            <PauseIcon size={14} color={theme.accent} />
          ) : (
            <PlayIcon size={13} color={isCurrent ? theme.accent : theme.muted} />
          )}
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.artist, { color: theme.text, fontFamily: FONT_SERIF_BOLD }]}>
            {song.artist}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.text, fontFamily: FONT_MONO_REGULAR }]}>
            {song.title}
          </Text>
        </View>

        {wantFavorite ? (
          <TouchableOpacity onPress={onToggleFavorite} hitSlop={8} style={styles.actionIcon}>
            <HeartIcon size={17} color={isFavorite ? theme.red : theme.muted} filled={!!isFavorite} />
          </TouchableOpacity>
        ) : null}
        {wantAddToPlaylist ? (
          <TouchableOpacity onPress={onAddToPlaylist} hitSlop={8} style={styles.actionIcon}>
            <PlusIcon size={17} color={theme.muted} />
          </TouchableOpacity>
        ) : null}
        {wantEdit ? (
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={styles.actionIcon}>
            <EditIcon size={16} color={theme.accent} />
          </TouchableOpacity>
        ) : null}
        {wantDelete ? (
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.actionIcon}>
            <TrashIcon size={16} color={theme.red} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.metaLine}>
        <Text style={[styles.metaText, { color: theme.muted, fontFamily: FONT_MONO_REGULAR }]}>
          {fmtDate(song.release)} · {song.duration} · 👁 {song.playCount ?? 0}
        </Text>
        <View style={styles.badgesWrap}>
          {song.genres.slice(0, 3).map((g) => (
            <Badge key={g} label={abbrGenre(g)} kind="genre" />
          ))}
          {song.album ? <Badge label={song.album} kind="album" /> : <Text style={[styles.singleLabel, { color: theme.muted }]}>{t('table.single')}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  artist: {
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 13,
    marginTop: 2,
  },
  actionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLine: {
    marginTop: 8,
    marginLeft: 42,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  singleLabel: {
    fontSize: 12,
  },
});
