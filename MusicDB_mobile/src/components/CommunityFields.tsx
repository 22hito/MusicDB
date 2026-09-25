import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '@/state/SettingsContext';
import { Field } from './UI';
import { CloseIcon, UploadIcon } from './Icons';
import { FONT_MONO_MEDIUM, RADIUS, SPACING } from '@/constants/theme';
import type { PickedAudio } from '@/api/types';

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // як AudioStorageService.MaxBytes на сервері

// Поля лише для головної таблиці_2: файл пісні обов'язковий, якщо нема посилання на YouTube.
export function CommunityFields({
  audio,
  youtube,
  onAudioChange,
  onYoutubeChange,
}: {
  audio: PickedAudio | null;
  youtube: string;
  onAudioChange: (audio: PickedAudio | null) => void;
  onYoutubeChange: (v: string) => void;
}) {
  const { theme, t } = useSettings();

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_AUDIO_BYTES) {
      onAudioChange(null);
      Alert.alert(t('common.error'), t('msg.audioTooLarge'));
      return;
    }
    onAudioChange({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'audio/mpeg', size: a.size });
  };

  return (
    <View style={[styles.wrap, { borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.muted, fontFamily: FONT_MONO_MEDIUM }]}>{t('form.audioFile')}</Text>
      <View style={styles.fileRow}>
        <TouchableOpacity onPress={pick} style={[styles.pickBtn, { borderColor: theme.accent }]}>
          <UploadIcon size={16} color={theme.accent} />
          <Text numberOfLines={1} style={{ color: theme.accent, flexShrink: 1, fontFamily: FONT_MONO_MEDIUM, fontSize: 13 }}>
            {audio ? audio.name : t('form.audioPick')}
          </Text>
        </TouchableOpacity>
        {audio ? (
          <TouchableOpacity onPress={() => onAudioChange(null)} hitSlop={10} style={{ padding: 6 }}>
            <CloseIcon size={14} color={theme.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.hint, { color: theme.muted, marginBottom: 2 }]}>{t('form.audioFile.hint')}</Text>
      <Text style={[styles.hint, { color: theme.accent }]}>{t('form.audioFile.bgHint')}</Text>
      <Field
        label={t('form.youtube')}
        value={youtube}
        onChangeText={onYoutubeChange}
        placeholder={t('form.youtube.placeholder')}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderStyle: 'dashed', paddingTop: SPACING.lg, marginBottom: SPACING.sm },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
  },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 5, marginBottom: SPACING.lg },
});
