import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { Button, Field } from './UI';
import { DateField } from './DateField';
import { RADIUS, SPACING } from '@/constants/theme';

export interface SongFormValues {
  artist: string;
  title: string;
  release: string; // yyyy-MM-dd
  duration: string; // hh:mm:ss
  album: string;
  genres: string; // comma-separated
  youtubeVideoId: string; // ID або повне посилання — бекенд сам розбирає; порожньо = скинути кеш
  lyrics?: string; // текст пісні; undefined — ще не завантажено
}

export function SongFormModal({
  visible,
  title,
  initial,
  onCancel,
  onSave,
  saving,
  loadLyrics,
}: {
  visible: boolean;
  title: string;
  initial: SongFormValues;
  onCancel: () => void;
  onSave: (values: SongFormValues) => void;
  saving?: boolean;
  // Текст пісні тягнеться окремим запитом (як і на сайті) — підставляємо, коли прийде.
  loadLyrics?: () => Promise<string | null>;
}) {
  const { theme, t } = useSettings();
  const [values, setValues] = useState<SongFormValues>(initial);

  useEffect(() => {
    if (!visible) return;
    setValues({ ...initial, lyrics: loadLyrics ? undefined : initial.lyrics });
    let cancelled = false;
    loadLyrics?.()
      .then((text) => !cancelled && setValues((v) => ({ ...v, lyrics: v.lyrics ?? text ?? '' })))
      .catch(() => !cancelled && setValues((v) => ({ ...v, lyrics: v.lyrics ?? '' })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (k: keyof SongFormValues) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>{title}</Text>
          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label={t('form.artist')} value={values.artist} onChangeText={set('artist')} />
            <Field label={t('form.title')} value={values.title} onChangeText={set('title')} />
            <DateField label={t('form.release')} value={values.release} onChange={set('release')} />
            <Field
              label={t('form.duration')}
              value={values.duration}
              onChangeText={set('duration')}
              placeholder="00:03:30"
              hint={t('form.duration.hint')}
            />
            <Field label={t('form.album')} value={values.album} onChangeText={set('album')} />
            <Field
              label={t('form.genres')}
              value={values.genres}
              onChangeText={set('genres')}
              hint={t('form.genres.hint')}
            />
            <Field
              label={t('form.youtubeVideoId')}
              value={values.youtubeVideoId}
              onChangeText={set('youtubeVideoId')}
              placeholder={t('form.youtubeVideoId.placeholder')}
              hint={t('form.youtubeVideoId.hint')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loadLyrics ? (
              <Field
                label={t('admin.lyrics')}
                value={values.lyrics ?? ''}
                editable={values.lyrics !== undefined}
                onChangeText={set('lyrics')}
                placeholder={values.lyrics === undefined ? '…' : t('admin.lyrics.placeholder')}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 160, maxHeight: 320, paddingTop: 12 }}
              />
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="outline" onPress={onCancel} small />
            <Button label={t('admin.saveBtn')} onPress={() => onSave(values)} small loading={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 380,
    maxWidth: '92%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
});
