import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button } from './UI';
import { FONT_SANS_MEDIUM, FONT_SANS_REGULAR, FONT_SANS_SEMIBOLD, RADIUS, SPACING } from '@/constants/theme';
import { BugIcon, CloseIcon, PlusIcon } from './Icons';
import type { PickedAudio } from '@/api/types';

const MAX_SHOTS = 3;
const MAX_SHOT_BYTES = 5 * 1024 * 1024;

// "Повідомити про баг" (як модалка в меню профілю на сайті). Технічні дані —
// опційно: платформа, версія застосунку, поточна пісня, тема/мова.
export function BugReportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, t, themeMode, lang } = useSettings();
  const api = useMusicApi();
  const player = usePlayer();
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shots, setShots] = useState<PickedAudio[]>([]);

  const context = () =>
    [
      `app: mobile ${Constants.expoConfig?.version ?? '?'} (${Constants.appOwnership ?? 'standalone'})`,
      `platform: ${Platform.OS} ${Platform.Version}`,
      `theme: ${themeMode}, lang: ${lang}`,
      player.current ? `song: #${player.current.id} ${player.current.artist} — ${player.current.title} (${player.state})` : null,
    ]
      .filter(Boolean)
      .join('\n');

  const pickShots = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_SHOTS - shots.length,
      quality: 0.85,
    });
    if (res.canceled) return;
    const picked: PickedAudio[] = [];
    for (const a of res.assets) {
      if (a.fileSize && a.fileSize > MAX_SHOT_BYTES) {
        setError(t('bugs.shotTooBig'));
        continue;
      }
      const mime = a.mimeType || 'image/jpeg';
      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      picked.push({ uri: a.uri, name: `screenshot-${Date.now()}-${picked.length}.${ext}`, mimeType: mime, size: a.fileSize });
    }
    setShots((prev) => [...prev, ...picked].slice(0, MAX_SHOTS));
  };

  const send = async () => {
    const description = text.trim();
    if (description.length < 10) return setError(t('bugs.tooShort'));
    setSending(true);
    setError(null);
    try {
      const ctx = attach ? context() : null;
      if (shots.length) await api.sendBugReportWithScreenshots(description, ctx, shots);
      else await api.sendBugReport(description, ctx);
      setText('');
      setShots([]);
      onClose();
      Alert.alert(t('bugs.thanks'));
    } catch (e) {
      setError((e as { status?: number }).status === 429 ? t('bugs.tooMany') : t('error.loadFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.titleRow}>
            <BugIcon size={18} color={theme.accent} />
            <Text style={{ color: theme.text, fontFamily: FONT_SANS_SEMIBOLD, fontSize: 17 }}>{t('bugs.title')}</Text>
          </View>
          <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t('bugs.describe')}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
            placeholder={t('bugs.placeholder')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          {/* Скріншоти: до 3 зображень із галереї. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shots}>
            {shots.map((s, i) => (
              <View key={s.uri} style={[styles.shot, { borderColor: theme.border }]}>
                <Image source={{ uri: s.uri }} style={StyleSheet.absoluteFill} />
                <TouchableOpacity onPress={() => setShots((p) => p.filter((_, j) => j !== i))} style={styles.shotRemove} hitSlop={8}>
                  <CloseIcon size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {shots.length < MAX_SHOTS ? (
              <TouchableOpacity onPress={pickShots} style={[styles.shot, styles.shotAdd, { borderColor: theme.borderStrong }]}>
                <PlusIcon size={18} color={theme.accent} />
                <Text style={{ color: theme.text2, fontSize: 11, fontFamily: FONT_SANS_MEDIUM, textAlign: 'center' }}>{t('bugs.addScreenshot')}</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
          <Text style={[styles.help, { color: theme.muted, marginTop: 6 }]}>{t('bugs.screenshotsHint')}</Text>
          <View style={styles.attachRow}>
            <Text style={{ color: theme.text, fontSize: 13.5, flex: 1, fontFamily: FONT_SANS_MEDIUM }}>{t('bugs.attachContext')}</Text>
            <Switch value={attach} onValueChange={setAttach} trackColor={{ true: theme.accent, false: theme.border }} />
          </View>
          {/* Що робить перемикач — пояснення + ті самі рядки, що підуть у звіт. */}
          <Text style={[styles.help, { color: theme.muted }]}>{t('bugs.attachContextHint')}</Text>
          {attach ? (
            <TouchableOpacity onPress={() => setPreviewOpen((o) => !o)} style={{ marginBottom: 12 }}>
              <Text style={{ color: theme.accent, fontSize: 12.5, fontFamily: FONT_SANS_MEDIUM }}>
                {previewOpen ? '▾' : '▸'} {t('bugs.previewSummary')}
              </Text>
              {previewOpen ? (
                <Text selectable style={[styles.preview, { color: theme.text2, backgroundColor: theme.surface2, borderColor: theme.border }]}>
                  {context()}
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {error ? <Text style={{ color: theme.red, fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <Button label={t('common.cancel')} variant="outline" small onPress={onClose} />
            <Button label={t('bugs.send')} small loading={sending} onPress={send} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { width: 380, maxWidth: '92%', borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl },
  shots: { gap: 8, marginTop: 12 },
  shot: { width: 76, height: 76, borderRadius: RADIUS.sm, borderWidth: 1, overflow: 'hidden' },
  shotAdd: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 },
  shotRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
  fieldLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, fontFamily: FONT_SANS_SEMIBOLD },
  input: { minHeight: 120, maxHeight: 240, borderWidth: 1, borderRadius: RADIUS.md, padding: 12, fontSize: 14, textAlignVertical: 'top', fontFamily: FONT_SANS_REGULAR },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  help: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8, fontFamily: FONT_SANS_REGULAR },
  preview: { marginTop: 6, padding: 10, borderWidth: 1, borderRadius: RADIUS.sm, fontSize: 11.5, lineHeight: 16, fontFamily: FONT_SANS_REGULAR },
});
