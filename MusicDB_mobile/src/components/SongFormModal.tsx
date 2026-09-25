import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '@/state/SettingsContext';
import { Button, Field } from './UI';
import { DateField } from './DateField';
import { CloseIcon, UploadIcon } from './Icons';
import { MAX_AUDIO_BYTES } from './CommunityFields';
import { FONT_MONO_MEDIUM, RADIUS, SPACING } from '@/constants/theme';
import type { PickedAudio } from '@/api/types';

export interface SongFormValues {
  artist: string;
  title: string;
  release: string; // yyyy-MM-dd
  duration: string; // hh:mm:ss
  album: string;
  genres: string; // comma-separated
  youtubeVideoId: string; // ID або повне посилання — бекенд сам розбирає; порожньо = скинути кеш
  lyrics?: string; // текст пісні; undefined — ще не завантажено
  audio?: PickedAudio | null; // новий файл пісні (лише ком'юніті) — додати або замінити
}

export function SongFormModal({
  visible,
  title,
  initial,
  onCancel,
  onSave,
  saving,
  loadLyrics,
  audioFile,
}: {
  visible: boolean;
  title: string;
  initial: SongFormValues;
  onCancel: () => void;
  onSave: (values: SongFormValues) => void;
  saving?: boolean;
  // Текст пісні тягнеться окремим запитом (як і на сайті) — підставляємо, коли прийде.
  loadLyrics?: () => Promise<string | null>;
  // Файл пісні (лише пісні ком'юніті): has — чи вже є файл.
  audioFile?: { has: boolean };
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

  const pickAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_AUDIO_BYTES) {
      Alert.alert(t('common.error'), t('msg.audioTooLarge'));
      return;
    }
    setValues((s) => ({ ...s, audio: { uri: a.uri, name: a.name, mimeType: a.mimeType || 'audio/mpeg', size: a.size } }));
  };

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
            {audioFile ? (
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={[styles.fileLabel, { color: theme.text2 }]}>{t('form.audioFile')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={pickAudio} style={[styles.pickBtn, { borderColor: theme.accent }]}>
                    <UploadIcon size={16} color={theme.accent} />
                    <Text numberOfLines={1} style={{ color: theme.accent, flexShrink: 1, fontFamily: FONT_MONO_MEDIUM, fontSize: 13 }}>
                      {values.audio ? values.audio.name : t(audioFile.has ? 'admin.audioReplaceBtn' : 'admin.audioAddBtn')}
                    </Text>
                  </TouchableOpacity>
                  {values.audio ? (
                    <TouchableOpacity onPress={() => setValues((s) => ({ ...s, audio: null }))} hitSlop={10} style={{ padding: 6 }}>
                      <CloseIcon size={14} color={theme.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 5 }}>{t(audioFile.has ? 'admin.audioHasFile' : 'admin.audioNoFile')}</Text>
                <Text style={{ color: theme.accent, fontSize: 12, marginTop: 3 }}>{t('form.audioFile.bgHint')}</Text>
              </View>
            ) : null}
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
  fileLabel: { fontSize: 13, marginBottom: 7, fontWeight: '600' },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.md, paddingHorizontal: 14 },
});
