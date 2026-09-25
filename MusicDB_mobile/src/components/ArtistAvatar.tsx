import React from 'react';
import { Image, Text, View } from 'react-native';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SERIF_BOLD } from '@/constants/theme';

const COLORS = ['#c8a96e', '#8a6fb0', '#4f8c6f', '#b5555a', '#5b84a8', '#c98a4b', '#6fa89e', '#9a6b8f', '#7d9153', '#b0703f', '#5f6fa0', '#a3824f'];

// Фото виконавця з сервера — адреса відносна (/api/artists/{id}/image), тож додаємо сервер.
export function useAbsoluteUrl() {
  const { apiBase } = useSettings();
  return (url: string | null | undefined) => (url ? (url.startsWith('/') ? `${apiBase}${url}` : url) : null);
}

// Фото або ініціали на кольоровому тлі (колір стабільний для імені) — як на сайті.
export function ArtistAvatar({ name, imageUrl, size = 40 }: { name: string; imageUrl?: string | null; size?: number }) {
  const { theme } = useSettings();
  const abs = useAbsoluteUrl()(imageUrl);
  if (abs) {
    return <Image source={{ uri: abs }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.surface2 }} />;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  const initials =
    name
      .split(/[\s&,/+-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0])
      .join('')
      .toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS[h % COLORS.length],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontFamily: FONT_SERIF_BOLD, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}
