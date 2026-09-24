import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSettings } from '@/state/SettingsContext';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { StarIcon, TrashIcon } from './Icons';
import { openUserProfile } from './FriendsPanel';
import { FONT_MONO_REGULAR, RADIUS, SPACING } from '@/constants/theme';
import type { Song, SongRatings } from '@/api/types';

// Оцінка пісні 0–100 (тимчасова шкала, як і на сайті) + необов'язкова рецензія.
export function RatingModal({ song, onClose }: { song: Song | null; onClose: () => void }) {
  const { theme, t } = useSettings();
  const { currentUser, openLogin, subscribeRealtime } = useApiBridge();
  const api = useMusicApi();
  const [data, setData] = useState<SongRatings | null>(null);
  const [score, setScore] = useState(70);
  const [review, setReview] = useState('');
  const [saving, setSaving] = useState(false);
  const authed = !!currentUser?.authenticated;

  const load = useCallback(() => {
    if (!song) return;
    api
      .getRatings(song.id)
      .then((d) => {
        setData(d);
        setScore(d.mine?.score ?? 70);
        setReview(d.mine?.review ?? '');
      })
      .catch(() => setData(null));
  }, [api, song]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  useEffect(
    () =>
      subscribeRealtime((event, args) => {
        if (event === 'ratingChanged' && song && args[0] === song.id) load();
      }),
    [subscribeRealtime, load, song],
  );

  const save = async () => {
    if (!song) return;
    setSaving(true);
    try {
      setData(await api.saveRating(song.id, Math.round(score), review.trim() || null));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (userId?: number) => {
    if (!song) return;
    await api.deleteRating(song.id, userId).catch(() => {});
    load();
  };

  return (
    <Modal visible={!!song} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: theme.text }]}>{t('rating.title')}</Text>
            {song ? <Text style={{ color: theme.muted, marginBottom: 6 }}>{`${song.artist} — ${song.title}`}</Text> : null}
            {!data ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <Text style={{ color: theme.muted, fontSize: 12, marginBottom: SPACING.md }}>
                  {data.avgRating != null
                    ? t('rating.summary', { avg: data.avgRating, count: data.ratingCount })
                    : t('rating.noRatings')}
                </Text>

                {authed ? (
                  <View style={{ marginBottom: SPACING.lg }}>
                    <Text style={[styles.label, { color: theme.muted }]}>{t('rating.yourScore')}</Text>
                    <View style={styles.scoreRow}>
                      <Slider
                        style={{ flex: 1 }}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={score}
                        onValueChange={setScore}
                        minimumTrackTintColor={theme.accent}
                        maximumTrackTintColor={theme.border}
                        thumbTintColor={theme.accent}
                      />
                      <Text style={[styles.scoreValue, { color: theme.accent, fontFamily: FONT_MONO_REGULAR }]}>{Math.round(score)}</Text>
                    </View>
                    <Text style={[styles.label, { color: theme.muted, marginTop: SPACING.md }]}>{t('rating.review')}</Text>
                    <TextInput
                      value={review}
                      onChangeText={setReview}
                      multiline
                      maxLength={5000}
                      placeholder={t('rating.reviewPlaceholder')}
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
                    />
                    <View style={styles.actions}>
                      {data.mine ? <Button label={t('rating.deleteBtn')} variant="outline" small onPress={() => remove()} /> : null}
                      <Button label={t('common.save')} small loading={saving} onPress={save} />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={openLogin} style={{ marginBottom: SPACING.lg }}>
                    <Text style={{ color: theme.accent, fontSize: 13 }}>{t('rating.loginHint')}</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.label, { color: theme.muted }]}>{t('rating.reviewsTitle')}</Text>
                {data.reviews.length === 0 ? (
                  <Text style={{ color: theme.muted, fontSize: 13 }}>{t('rating.noReviews')}</Text>
                ) : (
                  data.reviews.map((rv) => (
                    <View key={rv.user.userId} style={[styles.review, { borderColor: theme.border }]}>
                      <View style={styles.reviewHead}>
                        <TouchableOpacity
                          style={{ flexShrink: 1 }}
                          disabled={!authed || rv.user.userId === currentUser?.userId}
                          onPress={() => {
                            onClose();
                            openUserProfile(rv.user.userId, rv.user.displayName);
                          }}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700' }}>{rv.user.displayName}</Text>
                        </TouchableOpacity>
                        <StarIcon size={13} color={theme.accent} filled />
                        <Text style={{ color: theme.accent, fontFamily: FONT_MONO_REGULAR }}>{rv.score}</Text>
                        <View style={{ flex: 1 }} />
                        {currentUser?.isAdmin && rv.user.userId !== currentUser?.userId ? (
                          <TouchableOpacity onPress={() => remove(rv.user.userId)} hitSlop={8}>
                            <TrashIcon size={15} color={theme.red} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={{ color: theme.muted, fontSize: 11, marginBottom: 4 }}>{rv.updatedAt}</Text>
                      <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{rv.review}</Text>
                    </View>
                  ))
                )}
                <Button label={t('common.close')} variant="outline" small onPress={onClose} style={{ marginTop: SPACING.lg }} />
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { width: '92%', maxHeight: '85%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.lg },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreValue: { width: 36, textAlign: 'right', fontSize: 16 },
  input: { minHeight: 90, borderWidth: 1, borderRadius: RADIUS.sm, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: SPACING.md },
  review: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
