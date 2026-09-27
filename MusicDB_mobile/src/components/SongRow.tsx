import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { Badge } from './UI';
import { MarqueeText } from './MarqueeText';
import { EditIcon, EyeIcon, HeartIcon, PauseIcon, PersonIcon, PlayIcon, PlusIcon, StarIcon, TrashIcon } from './Icons';
import { FONT_SANS_BOLD, FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS } from '@/constants/theme';
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

// "00:04:16" → "4:16" — як у картках мобільного сайту (години лишаються, якщо є).
function shortDur(d: string) {
  return (d || '').replace(/^00:0?(?=\d:)/, '');
}

// Місця 1–3 у Топ 100 — "медалі" (ті самі кольори, що на мобільному сайті).
const MEDALS = ['#e6b94f', '#c9d1dc', '#d49a5e'];

// Компактна картка пісні — та сама, що на мобільному сайті:
// ▶ · виконавець/назва · оцінка · ♡ +; під нею "дата · тривалість · 👁 N", жанри, альбом
// і (для адміна) ✎ 🗑 праворуч. rank — варіант для Топ 100: місце, альбом і прослуховування.
export function SongRow({
  song,
  rank,
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
  onRate,
  onGenrePress,
  onAlbumPress,
  onSubmitterPress,
  activeGenre,
  activeAlbum,
}: {
  song: Song;
  rank?: number;
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
  onRate?: () => void; // відкрити оцінку/рецензії
  // Швидка фільтрація, як на сайті: натиснув жанр/альбом — список лише з ним.
  onGenrePress?: (genre: string) => void;
  onAlbumPress?: (album: string) => void;
  onSubmitterPress?: (userId: number, name: string) => void;
  activeGenre?: string;
  activeAlbum?: string;
}) {
  const { theme, t } = useSettings();
  const top = rank != null;
  const wantFavorite = showFavorite ?? authenticated;
  const wantAddToPlaylist = !top && (showAddToPlaylist ?? authenticated);
  const wantEdit = !top && (showEdit ?? isAdmin);
  const wantDelete = !top && (showDelete ?? isAdmin);
  const medal = rank != null && rank <= 3 ? MEDALS[rank - 1] : null;
  const [genresOpen, setGenresOpen] = useState(false);
  const shownGenres = genresOpen ? song.genres : song.genres.slice(0, 3);
  const thumb = top && song.youtubeVideoId ? `https://img.youtube.com/vi/${song.youtubeVideoId}/mqdefault.jpg` : null;

  return (
    <View
      style={[
        styles.row,
        { borderColor: isCurrent ? `${theme.accent}80` : theme.border, backgroundColor: isCurrent ? `${theme.accent}10` : theme.surface },
      ]}
    >
      <View style={styles.topLine}>
        {top ? (
          <View style={[styles.rank, medal ? { backgroundColor: `${medal}38` } : null]}>
            <Text style={[styles.rankText, { color: medal ?? theme.muted }]}>{rank}</Text>
          </View>
        ) : null}
        {top ? (
          <TouchableOpacity onPress={onPlay} style={[styles.topCover, { backgroundColor: theme.surface2, borderColor: isCurrent ? theme.accent : theme.border }]} hitSlop={6}>
            {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} /> : null}
            <View style={[styles.topCoverPlay, { backgroundColor: thumb ? 'rgba(0,0,0,0.38)' : 'transparent' }]}>
              {isCurrent && isPlaying ? <PauseIcon size={14} color={thumb ? '#fff' : theme.accent} /> : <PlayIcon size={13} color={thumb ? '#fff' : isCurrent ? theme.accent : theme.text} />}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onPlay}
            style={[styles.playBtn, { backgroundColor: isCurrent ? theme.accent : theme.surface2, borderColor: isCurrent ? theme.accent : theme.border }]}
            hitSlop={8}
          >
            {isCurrent && isPlaying ? (
              <PauseIcon size={13} color={theme.onAccent} />
            ) : (
              <PlayIcon size={12} color={isCurrent ? theme.onAccent : theme.text} />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          {/* Біжить лише рядок пісні, що зараз грає, — інакше список "рябить". */}
          <MarqueeText active={!!isCurrent} style={[styles.artist, { color: theme.accent }]}>{song.artist}</MarqueeText>
          <MarqueeText active={!!isCurrent} style={[styles.title, { color: theme.text }]}>{song.title}</MarqueeText>
          {/* Таблиця_2: нік того, хто додав пісню. */}
          {!top && song.submittedBy ? (
            <TouchableOpacity
              style={styles.submitterLine}
              disabled={!onSubmitterPress}
              hitSlop={6}
              onPress={() => song.submittedBy && onSubmitterPress?.(song.submittedBy.userId, song.submittedBy.displayName)}
            >
              <PersonIcon size={11} color={theme.accent} />
              <Text numberOfLines={1} style={[styles.submitter, { color: theme.accent, fontFamily: FONT_SANS_REGULAR }]}>
                {song.submittedBy.displayName}
              </Text>
            </TouchableOpacity>
          ) : null}
          {top && song.album ? (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Badge small label={song.album} kind="album" />
            </View>
          ) : null}
        </View>

        {top ? (
          <View style={styles.plays}>
            <EyeIcon size={13} color={theme.muted} />
            <Text style={{ color: theme.text, fontSize: 13, fontFamily: FONT_SANS_SEMIBOLD }}>{song.playCount ?? 0}</Text>
          </View>
        ) : onRate ? (
          <TouchableOpacity onPress={onRate} hitSlop={8} style={[styles.ratingChip, { borderColor: theme.border }]}>
            <StarIcon size={12} color={song.avgRating != null ? theme.accent : theme.muted} filled={song.avgRating != null} />
            <Text style={{ color: song.avgRating != null ? theme.accent : theme.muted, fontSize: 12, fontFamily: FONT_SANS_REGULAR }}>
              {song.avgRating != null ? song.avgRating : '—'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {wantFavorite ? (
          <TouchableOpacity onPress={onToggleFavorite} hitSlop={6} style={styles.actionIcon}>
            <HeartIcon size={17} color={isFavorite ? theme.red : theme.muted} filled={!!isFavorite} />
          </TouchableOpacity>
        ) : null}
        {wantAddToPlaylist ? (
          <TouchableOpacity onPress={onAddToPlaylist} hitSlop={6} style={styles.actionIcon}>
            <PlusIcon size={17} color={theme.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {!top ? (
        <View style={styles.metaLine}>
          <View style={styles.metaCol}>
            <View style={styles.metaInfo}>
              <Text style={[styles.metaText, { color: theme.muted }]}>
                {fmtDate(song.release)} · {shortDur(song.duration)} ·
              </Text>
              <EyeIcon size={12} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{song.playCount ?? 0}</Text>
            </View>
            {song.genres.length ? (
              <View style={styles.genresRow}>
                {shownGenres.map((g) => (
                  <TouchableOpacity key={g} disabled={!onGenrePress} onPress={() => onGenrePress?.(g)} hitSlop={4}>
                    <Badge small label={abbrGenre(g)} kind="genre" active={g === activeGenre} />
                  </TouchableOpacity>
                ))}
                {song.genres.length > 3 ? (
                  <TouchableOpacity onPress={() => setGenresOpen((o) => !o)} hitSlop={6} style={[styles.moreBtn, { borderColor: `${theme.accent2}88` }]}>
                    <Text style={{ color: theme.muted, fontSize: 11, fontFamily: FONT_SANS_SEMIBOLD }}>{genresOpen ? '−' : `+${song.genres.length - 3}`}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <View style={styles.albumRow}>
              {song.album ? (
                <TouchableOpacity disabled={!onAlbumPress} onPress={() => onAlbumPress?.(song.album!)} hitSlop={4} style={{ maxWidth: '100%' }}>
                  <Badge small label={song.album} kind="album" active={song.album === activeAlbum} />
                </TouchableOpacity>
              ) : (
                <Text style={[styles.metaText, { color: theme.muted }]}>{t('table.single')}</Text>
              )}
            </View>
          </View>
          {wantEdit ? (
            <TouchableOpacity onPress={onEdit} hitSlop={6} style={styles.actionIcon}>
              <EditIcon size={16} color={theme.accent} />
            </TouchableOpacity>
          ) : null}
          {wantDelete ? (
            <TouchableOpacity onPress={onDelete} hitSlop={6} style={styles.actionIcon}>
              <TrashIcon size={16} color={theme.red} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 10,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12.5,
    fontFamily: FONT_SANS_BOLD,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  artist: {
    fontSize: 14.5,
    fontFamily: FONT_SANS_BOLD,
  },
  title: {
    fontSize: 13.5,
    marginTop: 1,
    fontFamily: FONT_SANS_REGULAR,
  },
  submitterLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  submitter: {
    fontSize: 12,
    fontFamily: FONT_SANS_MEDIUM,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  plays: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLine: {
    marginTop: 8,
    marginLeft: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metaCol: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  albumRow: {
    flexDirection: 'row',
  },
  moreBtn: {
    height: 22,
    minWidth: 30,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCoverPlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
  },
  metaText: {
    fontSize: 12,
    fontFamily: FONT_SANS_REGULAR,
  },
});
