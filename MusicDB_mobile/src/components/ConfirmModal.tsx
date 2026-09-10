import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { Button } from './UI';
import { TrashIcon } from './Icons';
import { RADIUS, SPACING } from '@/constants/theme';

export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { theme, t } = useSettings();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.titleRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${theme.red}1f` }]}>
              <TrashIcon size={17} color={theme.red} />
            </View>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{title}</Text>
          </View>
          <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>{body}</Text>
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="outline" onPress={onCancel} small />
            <Button label={confirmLabel} variant="danger" onPress={onConfirm} small />
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
    width: 340,
    maxWidth: '90%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
});
