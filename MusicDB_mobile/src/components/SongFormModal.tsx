import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { Button, Field } from './UI';
import { RADIUS, SPACING } from '@/constants/theme';

export interface SongFormValues {
  artist: string;
  title: string;
  release: string; // yyyy-MM-dd
  duration: string; // hh:mm:ss
  album: string;
  genres: string; // comma-separated
}

export function SongFormModal({
  visible,
  title,
  initial,
  onCancel,
  onSave,
  saving,
}: {
  visible: boolean;
  title: string;
  initial: SongFormValues;
  onCancel: () => void;
  onSave: (values: SongFormValues) => void;
  saving?: boolean;
}) {
  const { theme, t } = useSettings();
  const [values, setValues] = useState<SongFormValues>(initial);

  useEffect(() => {
    if (visible) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (k: keyof SongFormValues) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 16 }}>{title}</Text>
          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <Field label={t('form.artist')} value={values.artist} onChangeText={set('artist')} />
            <Field label={t('form.title')} value={values.title} onChangeText={set('title')} />
            <Field
              label={t('form.release')}
              value={values.release}
              onChangeText={set('release')}
              placeholder="2024-01-01"
            />
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
