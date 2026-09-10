import React from 'react';
import { router } from 'expo-router';
import { ServerSettingsScreen } from '@/screens/ServerSettingsScreen';

export default function SettingsRoute() {
  return <ServerSettingsScreen onSaved={() => router.back()} onCancel={() => router.back()} />;
}
