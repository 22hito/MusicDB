import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { Button } from './UI';
import { SelectField } from './SelectField';
import { MAX_AUDIO_BYTES } from './CommunityFields';
import { FlagIcon, UploadIcon } from './Icons';
import { FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import { CORR_ARTIST_FIELDS, CORR_SONG_FIELDS } from '@/api/types';
import type { Correction, CorrectionField, CorrectionTarget, PickedAudio } from '@/api/types';

// Запит на правку (як вікно з прапорцем на сайті): що не так у пісні чи виконавця, як правильно, джерело,
// за потреби — файл пісні. target = null → одразу «Мої запити» (з профілю).
export function CorrectionModal({ target, visible, onClose }: { target: CorrectionTarget | null; visible: boolean; onClose: () => void }) {
  const { theme, t } = useSettings();
  const api = useMusicApi();
  const fields: readonly CorrectionField[] = target && 'artistId' in target ? CORR_ARTIST_FIELDS : CORR_SONG_FIELDS;
  const [field, setField] = useState<CorrectionField>(fields[0]);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [audio, setAudio] = useState<PickedAudio | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Correction[] | null>(null);
  const [showMine, setShowMine] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setField(fields[0]);
    setMessage('');
    setSource('');
    setAudio(null);
    setError(null);
    setShowMine(!target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, target]);

  useEffect(() => {
    if (!visible || !showMine) return;
    setMine(null);
    api.getMyCorrections().then(setMine).catch(() => setMine([]));
  }, [visible, showMine, api]);

  const pickAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_AUDIO_BYTES) return setError(t('corr.audioTooBig'));
    setError(null);
    setAudio({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'audio/mpeg', size: a.size });
  };

  const send = async () => {
    if (!target) return;
    const text = message.trim();
    const src = source.trim();
    if (field === 'audio' && !audio) return setError(t('corr.audioNeeded'));
    if (field !== 'audio' && text.length < 5) return setError(t('corr.tooShort'));
    if (src && !/^https?:\/\/\S+$/i.test(src)) return setError(t('corr.badSource'));
    setSending(true);
    setError(null);
    try {
      await api.sendCorrection(target, field, text, src, field === 'audio' ? audio : null);
      onClose();
      Alert.alert(t('corr.thanks'));
    } catch (e) {
      setError((e as { status?: number }).status === 429 ? t('corr.tooMany') : t('error.loadFailed'));
    } finally {
      setSending(false);
    }
  };

  const statusColor = (s: Correction['status']) => (s === 'done' ? '#4caf7d' : s === 'rejected' ? theme.muted : theme.accent);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.titleRow}>
            <FlagIcon size={18} color={theme.accent} />
            <Text style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 17 }}>{t(showMine ? 'corr.mine' : 'corr.title')}</Text>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            {!showMine && target ? (
              <>
                <Text style={{ color: theme.accent, fontFamily: FONT_SANS_SEMIBOLD, marginBottom: SPACING.md }}>{target.label}</Text>
                <Text style={[styles.label, { color: theme.muted }]}>{t('corr.fieldLabel')}</Text>
                <SelectField<CorrectionField>
                  value={field}
                  options={fields.map((f) => ({ value: f, label: t(`corr.field.${f}` as never) }))}
                  onChange={setField}
                  title={t('corr.fieldLabel')}
                  style={{ marginBottom: SPACING.md }}
                />
                <Text style={[styles.label, { color: theme.muted }]}>{t(field === 'audio' ? 'corr.messageOptional' : 'corr.messageLabel')}</Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={2000}
                  placeholder={t(`corr.placeholder.${field}` as never)}
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
                />
                {field === 'audio' ? (
                  <>
                    <TouchableOpacity onPress={pickAudio} style={[styles.fileBtn, { borderColor: theme.borderStrong }]}>
                      <UploadIcon size={16} color={theme.accent} />
                      <Text numberOfLines={1} style={{ color: theme.text, flex: 1, fontFamily: FONT_SANS_MEDIUM }}>{audio ? audio.name : t('corr.audioPick')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.help, { color: theme.muted }]}>{t('corr.audioHint')}</Text>
                  </>
                ) : null}
                <Text style={[styles.label, { color: theme.muted, marginTop: SPACING.md }]}>{t('corr.sourceLabel')}</Text>
                <TextInput
                  value={source}
                  onChangeText={setSource}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://…"
                  placeholderTextColor={theme.muted}
                  style={[styles.line, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
                />
                <Text style={[styles.help, { color: theme.muted }]}>{t('corr.sourceHint')}</Text>
                {error ? <Text style={{ color: theme.red, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
              </>
            ) : mine === null ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
            ) : mine.length ? (
              mine.map((c) => (
                <View key={c.id} style={[styles.item, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
                  <Text style={{ color: statusColor(c.status), fontFamily: FONT_SANS_SEMIBOLD, fontSize: 12 }}>{t(`corr.status.${c.status}` as never)}</Text>
                  <Text style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, marginTop: 2 }}>{c.targetLabel}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{t(`corr.field.${c.field}` as never)} · {c.createdAt}</Text>
                  {c.message ? <Text style={{ color: theme.text2, marginTop: 6, fontSize: 13 }}>{c.message}</Text> : null}
                  {c.adminNote ? (
                    <Text style={[styles.note, { color: theme.text, backgroundColor: theme.surface }]}>
                      <Text style={{ fontFamily: FONT_SANS_SEMIBOLD }}>{t('corr.adminReply')}: </Text>
                      {c.adminNote}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={{ color: theme.muted, textAlign: 'center', marginVertical: 20 }}>{t('corr.emptyMine')}</Text>
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: SPACING.md }}>
            <Button label={t(showMine ? 'common.close' : 'common.cancel')} variant="outline" small onPress={onClose} />
            {!showMine && target ? <Button label={t('bugs.send')} small loading={sending} onPress={send} /> : null}
          </View>
          {!showMine && target ? (
            <TouchableOpacity onPress={() => setShowMine(true)} style={{ alignSelf: 'center', marginTop: SPACING.md }}>
              <Text style={{ color: theme.accent, fontFamily: FONT_SANS_MEDIUM, fontSize: 13 }}>{t('corr.mine')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { width: 400, maxWidth: '92%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
  label: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: FONT_SANS_SEMIBOLD },
  input: { minHeight: 100, maxHeight: 200, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, fontSize: 14, textAlignVertical: 'top', fontFamily: FONT_SANS_REGULAR },
  line: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: FONT_SANS_REGULAR },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.md, padding: 12, marginTop: SPACING.md },
  help: { fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 4, fontFamily: FONT_SANS_REGULAR },
  item: { borderWidth: 1, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
  note: { marginTop: 8, padding: 8, borderRadius: RADIUS.sm, fontSize: 12.5, overflow: 'hidden' },
});
