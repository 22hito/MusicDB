import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { WebView } from './WebViewCompat';
import { useSettings } from '@/state/SettingsContext';
import { CloseIcon, DownloadIcon, SearchIcon } from './Icons';
import { FONT_SANS_SEMIBOLD } from '@/constants/theme';

export interface ViewerImage {
  uri: string;
  name: string;
  download: () => void;
}

const SPRING = { duration: 300, dampingRatio: 0.85 };
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Верхня панель переглядача: лічильник, назва, дії.
function ViewerBar({ title, count, onClose, onDownload, children }: { title: string; count?: string; onClose: () => void; onDownload?: () => void; children?: React.ReactNode }) {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      {count ? <Text style={styles.count}>{count}</Text> : null}
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      {children}
      {onDownload ? (
        <Pressable onPress={onDownload} hitSlop={8} accessibilityLabel={t('player.download')} style={({ pressed }) => [styles.barBtn, pressed && styles.pressed]}>
          <DownloadIcon size={18} color="#fff" />
        </Pressable>
      ) : null}
      <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t('common.close')} style={({ pressed }) => [styles.barBtn, pressed && styles.pressed]}>
        <CloseIcon size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

// Фото розмови: щипок / подвійний дотик — наближення, перетягування — зсув наближеного,
// свайп убік — сусіднє фото, свайп униз — закрити (тло тьмяніє за пальцем). Усе — на UI-потоці.
export function ImageGalleryModal({ images, index, onClose }: { images: ViewerImage[]; index: number | null; onClose: () => void }) {
  const { t } = useSettings();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [i, setI] = useState(index ?? 0);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    if (index != null) setI(index);
  }, [index]);

  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const dim = useSharedValue(1);

  const reset = () => {
    scale.set(1);
    saved.set(1);
    tx.set(0);
    ty.set(0);
    sx.set(0);
    sy.set(0);
    dim.set(1);
    setZoomed(false);
  };
  const step = (dir: number) => {
    setI((v) => Math.max(0, Math.min(images.length - 1, v + dir)));
    reset();
  };
  const close = () => {
    reset();
    onClose();
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(5, saved.get() * e.scale)));
    })
    .onEnd(() => {
      saved.set(scale.get());
      if (scale.get() <= 1.02) {
        scale.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
        saved.set(1);
        tx.set(withTiming(0));
        ty.set(withTiming(0));
        sx.set(0);
        sy.set(0);
      }
      scheduleOnRN(setZoomed, scale.get() > 1.02);
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (saved.get() > 1.02) {
        tx.set(sx.get() + e.translationX);
        ty.set(sy.get() + e.translationY);
        return;
      }
      // Не наближене: фото їде за пальцем; униз — ще й тьмяніє тло.
      tx.set(e.translationX);
      ty.set(Math.max(0, e.translationY));
      dim.set(Math.max(0.3, 1 - Math.max(0, e.translationY) / 500));
    })
    .onEnd((e) => {
      if (saved.get() > 1.02) {
        sx.set(tx.get());
        sy.set(ty.get());
        return;
      }
      const horizontal = Math.abs(e.translationX) > Math.abs(e.translationY);
      // Швидкий змах рахується й на коротку відстань.
      if (!horizontal && (e.translationY > 120 || e.velocityY > 900)) {
        scheduleOnRN(close);
        return;
      }
      if (horizontal && (Math.abs(e.translationX) > 80 || Math.abs(e.velocityX) > 700)) {
        tx.set(0);
        scheduleOnRN(step, e.translationX < 0 ? 1 : -1);
        return;
      }
      tx.set(withSpring(0, { ...SPRING, velocity: e.velocityX }));
      ty.set(withSpring(0, { ...SPRING, velocity: e.velocityY }));
      dim.set(withTiming(1, { duration: 180 }));
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (saved.get() > 1.02) {
        scale.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
        tx.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
        ty.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
        saved.set(1);
        sx.set(0);
        sy.set(0);
        scheduleOnRN(setZoomed, false);
      } else {
        // Наближаємо до точки дотику.
        const k = 2.5;
        const nx = (width / 2 - e.x) * (k - 1);
        const ny = (height / 2 - e.y) * (k - 1);
        scale.set(withTiming(k, { duration: 240, easing: EASE_OUT }));
        tx.set(withTiming(nx, { duration: 240, easing: EASE_OUT }));
        ty.set(withTiming(ny, { duration: 240, easing: EASE_OUT }));
        saved.set(k);
        sx.set(nx);
        sy.set(ny);
        scheduleOnRN(setZoomed, true);
      }
    });
  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));

  const cur = images[i];
  if (index == null || !cur) return null;
  return (
    <Modal visible animationType={reduced ? 'fade' : 'fade'} transparent statusBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, bgStyle]} />
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.stage, imgStyle]}>
            <Image source={{ uri: cur.uri }} style={{ width, height: height * 0.8 }} contentFit="contain" transition={150} recyclingKey={cur.uri} />
          </Animated.View>
        </GestureDetector>
        <ViewerBar title={cur.name} count={images.length > 1 ? `${i + 1} / ${images.length}` : undefined} onClose={close} onDownload={cur.download}>
          <Pressable
            onPress={() => {
              if (zoomed) reset();
              else {
                scale.set(withTiming(2.5, { duration: 220, easing: EASE_OUT }));
                saved.set(2.5);
                setZoomed(true);
              }
            }}
            hitSlop={8}
            accessibilityLabel={t('chat.zoom')}
            style={({ pressed }) => [styles.barBtn, zoomed && styles.barBtnOn, pressed && styles.pressed]}
          >
            <SearchIcon size={17} color="#fff" />
          </Pressable>
        </ViewerBar>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Відео — у вбудованому плеєрі (HTML5 у WebView: окремого нативного модуля відео в збірці немає).
export function VideoModal({ uri, name, onClose, onDownload }: { uri: string | null; name: string; onClose: () => void; onDownload?: () => void }) {
  if (!uri) return null;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}video{width:100%;max-height:100%}</style></head><body><video src="${uri.replace(/"/g, '&quot;')}" controls autoplay playsinline></video></body></html>`;
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <WebView source={{ html }} style={{ flex: 1, backgroundColor: '#000', marginTop: 64 }} allowsInlineMediaPlayback allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />
        <ViewerBar title={name} onClose={onClose} onDownload={onDownload} />
      </View>
    </Modal>
  );
}

// Текстовий файл — прямо в застосунку, з виділенням і прокруткою.
export function TextModal({ uri, name, onClose, onDownload }: { uri: string | null; name: string; onClose: () => void; onDownload?: () => void }) {
  const { theme, t } = useSettings();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!uri) return;
    setText(null);
    setFailed(false);
    fetch(uri)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(setText)
      .catch(() => setFailed(true));
  }, [uri]);
  if (!uri) return null;
  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}>
        <View style={{ height: insets.top + 64 }} />
        {text == null && !failed ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 24 }}>
            <Text selectable style={{ color: failed ? theme.muted : theme.text, fontSize: 15, lineHeight: 23 }}>
              {failed ? t('chat.previewFailed') : text}
            </Text>
          </ScrollView>
        )}
        <View style={[StyleSheet.absoluteFill, { bottom: undefined, backgroundColor: '#04060c' }]}>
          <ViewerBar title={name} onClose={onClose} onDownload={onDownload} />
        </View>
      </View>
    </Modal>
  );
}

export const openExternal = (url: string) => Linking.openURL(url).catch(() => {});

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#04060c' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  count: { color: 'rgba(238,240,245,0.7)', fontSize: 13, fontFamily: FONT_SANS_SEMIBOLD, minWidth: 34 },
  title: { flex: 1, color: '#fff', fontSize: 14, fontFamily: FONT_SANS_SEMIBOLD },
  barBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  barBtnOn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});
