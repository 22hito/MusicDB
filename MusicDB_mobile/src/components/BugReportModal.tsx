import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { useSettings } from '@/state/SettingsContext';
import { useMusicApi } from '@/api/endpoints';
import { usePlayer } from '@/player/PlayerContext';
import { Button } from './UI';
import { FONT_SERIF_BOLD, RADIUS, SPACING } from '@/constants/theme';

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

  const context = () =>
    [
      `app: mobile ${Constants.expoConfig?.version ?? '?'} (${Constants.appOwnership ?? 'standalone'})`,
      `platform: ${Platform.OS} ${Platform.Version}`,
      `theme: ${themeMode}, lang: ${lang}`,
      player.current ? `song: #${player.current.id} ${player.current.artist} — ${player.current.title} (${player.state})` : null,
    ]
      .filter(Boolean)
      .join('\n');

  const send = async () => {
    const description = text.trim();
    if (description.length < 10) return setError(t('bugs.tooShort'));
    setSending(true);
    setError(null);
    try {
      await api.sendBugReport(description, attach ? context() : null);
      setText('');
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
          <Text style={{ color: theme.text, fontFamily: FONT_SERIF_BOLD, fontSize: 18, marginBottom: 12 }}>{t('bugs.title')}</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>{t('bugs.describe')}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={4000}
            placeholder={t('bugs.placeholder')}
            placeholderTextColor={theme.muted}
            style={[styles.input, { backgroundColor: theme.surface2, borderColor: theme.border, color: theme.text }]}
          />
          <View style={styles.attachRow}>
            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{t('bugs.attachContext')}</Text>
            <Switch value={attach} onValueChange={setAttach} trackColor={{ true: theme.accent, false: theme.border }} />
          </View>
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
  input: { minHeight: 120, maxHeight: 240, borderWidth: 1, borderRadius: RADIUS.sm, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
});
