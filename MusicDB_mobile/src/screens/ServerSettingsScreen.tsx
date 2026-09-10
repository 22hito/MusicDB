import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/state/SettingsContext';
import { Button, Field } from '@/components/UI';
import { FONT_SERIF_BOLD, SPACING } from '@/constants/theme';

export function ServerSettingsScreen({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { theme, t, setApiBase, apiBase } = useSettings();
  const [value, setValue] = useState(apiBase || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    setSaving(true);
    const ok = await setApiBase(value);
    setSaving(false);
    if (!ok) {
      setError(t('settings.invalid'));
      return;
    }
    onSaved();
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={{ fontFamily: FONT_SERIF_BOLD, fontSize: 24, color: theme.accent, marginBottom: 6 }}>
            MusicDB
          </Text>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 18 }}>
            {t('settings.title')}
          </Text>

          <Field
            label={t('settings.apiBase')}
            value={value}
            onChangeText={setValue}
            placeholder={t('settings.apiBase.placeholder')}
            hint={t('settings.apiBase.hint')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {error ? <Text style={{ color: theme.red, fontSize: 12, marginBottom: 10 }}>{error}</Text> : null}

          <Button label={t('settings.save')} onPress={save} loading={saving} disabled={!value.trim()} />
          {onCancel ? (
            <Button label={t('common.cancel')} variant="outline" onPress={onCancel} style={{ marginTop: 10 }} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
});
