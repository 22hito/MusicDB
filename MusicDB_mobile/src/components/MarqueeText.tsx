import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

const GAP = 48; // px між кінцем тексту і його копією

// Біжучий рядок, як на табло: якщо текст не влазить у ширину — безперервно їде
// вліво, а за ним через проміжок іде копія, тож рядок "іде по колу" без
// повернення назад (коротка пауза лише на старті кожного кола). Якщо влазить —
// звичайний статичний текст. Навмисно не залежить від системного "зменшити рух":
// інакше довгу назву було б просто не прочитати.
export function MarqueeText({
  children,
  style,
  containerStyle,
  active = true,
  speed = 40, // px/с
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  active?: boolean; // false — показати статично з "…" (напр. рядок, що зараз не грає)
  speed?: number;
}) {
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  const scrolling = active && boxW > 0 && textW - boxW > 2;
  const shift = textW + GAP;

  useEffect(() => {
    x.setValue(0);
    if (!scrolling) return;
    // Animated.loop сам повертає значення на 0 перед кожним колом — а в цей
    // момент на місці тексту саме стоїть його копія, тож стрибка не видно.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(x, { toValue: -shift, duration: (shift / speed) * 1000, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scrolling, shift, speed, x, children]);

  return (
    <View style={[styles.box, containerStyle]} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
      {/* Невидимий вимірювач: у горизонтальному ScrollView текст не обмежений шириною. */}
      <ScrollView horizontal scrollEnabled={false} style={styles.measure} pointerEvents="none">
        <Text style={style} numberOfLines={1} onLayout={(e) => setTextW(e.nativeEvent.layout.width)}>
          {children}
        </Text>
      </ScrollView>
      {scrolling ? (
        <Animated.View style={{ flexDirection: 'row', width: shift + textW + 1, transform: [{ translateX: x }] }}>
          <Text style={[style, { width: textW + 1 }]} numberOfLines={1}>
            {children}
          </Text>
          <View style={{ width: GAP - 1 }} />
          <Text style={[style, { width: textW + 1 }]} numberOfLines={1} importantForAccessibility="no" accessibilityElementsHidden>
            {children}
          </Text>
        </Animated.View>
      ) : (
        <Text style={style} numberOfLines={1} ellipsizeMode="tail">
          {children}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignSelf: 'stretch', minWidth: 0 },
  measure: { position: 'absolute', opacity: 0, height: 0, left: 0, top: 0 },
});
