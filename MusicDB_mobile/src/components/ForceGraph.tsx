import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Line, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSettings } from '@/state/SettingsContext';
import { FONT_SANS_MEDIUM, FONT_SANS_SEMIBOLD, RADIUS } from '@/constants/theme';

// Граф схожості на телефоні. Два режими розкладки:
// - positions — готові координати (радіальні "карта смаку" й граф навколо пісні; центр 400×300);
// - інакше фізика: відштовхування, пружини між схожими, тяжіння до центру (pin — закріплений у центрі).
// Вписується в будь-яку ширину РАЗОМ із підписами (нічого не обрізається краєм), підписи мають
// ореол кольору тла (читаються поверх ліній), а ті, що налазять на інші, ховаються — до наближення.
// Наближення: щипок або кнопки +/−; наближений граф тягнеться одним пальцем.
export interface GraphNode {
  key: string;
  label: string;
  color: string;
  ring?: boolean; // "ви" / обрана пісня — з кільцем
  size?: number; // множник радіуса
  image?: string | null; // фото (аватарка)
  initials?: string; // ініціали, якщо фото нема
  mark?: string; // колір обідка (друзі, спільні виконавці)
}
export interface GraphEdge {
  i: number;
  j: number;
  w: number; // 0..1
}
export interface GraphRing {
  r: number; // у координатах розкладки (як positions)
  label?: string;
}
export interface GraphLegendItem {
  color: string;
  label: string;
  ring?: boolean; // кільце (обідок), а не заливка
}

const CX = 400;
const CY = 300;
const K_MAX = 6;
const FONT = 11;
const CHAR_W = FONT * 0.58; // середня ширина символу Inter 11px — для оцінки ширини підпису

function forceLayout(n: number, edges: GraphEdge[], pin: number | undefined, strong: boolean) {
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const sim = new Map<number, number>();
  for (const e of edges) sim.set(e.i < e.j ? e.i * n + e.j : e.j * n + e.i, e.w);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    xs[i] = Math.cos(a) * 250;
    ys[i] = Math.sin(a) * 250;
  }
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const repel = strong ? 9000 : 5000;
  const iterations = n > 100 ? 140 : 220;
  for (let it = 0; it < iterations; it++) {
    fx.fill(0);
    fy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = xs[i] - xs[j];
        const dy = ys[i] - ys[j];
        const d2 = Math.max(4, dx * dx + dy * dy);
        const d = Math.sqrt(d2);
        let f = repel / d2;
        const s = sim.get(i * n + j);
        if (s) f -= 0.02 * s * d;
        const ux = (dx / d) * f;
        const uy = (dy / d) * f;
        fx[i] += ux;
        fy[i] += uy;
        fx[j] -= ux;
        fy[j] -= uy;
      }
    }
    for (let i = 0; i < n; i++) {
      vx[i] = (vx[i] + fx[i] - xs[i] * 0.004) * 0.82;
      vy[i] = (vy[i] + fy[i] - ys[i] * 0.004) * 0.82;
      xs[i] += vx[i];
      ys[i] += vy[i];
    }
    if (pin != null) {
      xs[pin] = 0;
      ys[pin] = 0;
      vx[pin] = vy[pin] = 0;
    }
  }
  return { xs, ys };
}

// Найбільший масштаб s, за якого всі точки (з відступами-«коробками» підписів) влазять у [pad, size − pad]
// по одній осі; повертає s і зсув, що центрує вміст. lo/hi — межі коробки відносно точки в пікселях екрана.
function fitAxis(pos: Float64Array, lo: number[], hi: number[], size: number, pad: number) {
  const feasible = (s: number) => {
    let L = -Infinity;
    let R = Infinity;
    for (let i = 0; i < pos.length; i++) {
      L = Math.max(L, pad - s * pos[i] - lo[i]);
      R = Math.min(R, size - pad - s * pos[i] - hi[i]);
    }
    return { ok: L <= R, o: (L + R) / 2 };
  };
  let a = 0.01;
  let b = 3;
  for (let k = 0; k < 28; k++) {
    const m = (a + b) / 2;
    if (feasible(m).ok) a = m;
    else b = m;
  }
  return { s: a, o: feasible(a).o };
}

interface View2 {
  k: number; // наближення (1 — увесь граф)
  x: number; // зсув у пікселях
  y: number;
}
const IDENTITY: View2 = { k: 1, x: 0, y: 0 };

export function ForceGraph({
  nodes,
  edges,
  width,
  height,
  onPressNode,
  positions,
  pin,
  rings,
  radialLabels,
  baseRadius,
  surface,
  legend,
  onZoomChange,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  onPressNode?: (index: number) => void;
  positions?: [number, number][];
  pin?: number;
  rings?: GraphRing[];
  radialLabels?: boolean;
  baseRadius?: number;
  surface?: string; // колір тла під графом — для ореолу підписів і проміжку між вузлами
  legend?: GraphLegendItem[];
  onZoomChange?: (zoomed: boolean) => void; // наближено — батьківська прокрутка має не заважати жесту
}) {
  const { theme } = useSettings();
  const bg = surface ?? theme.surface;
  const n = nodes.length;
  const rich = nodes.some((nd) => nd.size != null || nd.image || nd.initials);
  const { xs, ys } = useMemo(() => {
    if (positions) {
      return { xs: Float64Array.from(positions.map((p) => p[0] - CX)), ys: Float64Array.from(positions.map((p) => p[1] - CY)) };
    }
    return forceLayout(n, edges, pin, rich);
  }, [n, edges, positions, pin, rich]);

  const base = baseRadius ?? (n > 60 ? 5 : 8);
  const maxChars = width < 380 ? 13 : 16;
  const labels = useMemo(() => nodes.map((nd) => (nd.label.length > maxChars ? `${nd.label.slice(0, maxChars - 1)}…` : nd.label)), [nodes, maxChars]);
  const showLabels = n <= 80;

  // Напрям підпису: назовні від центру (радіальні розкладки) або під вузлом.
  const dirs = useMemo(() => {
    let cx = 0;
    let cy = 0;
    if (!positions && pin == null) {
      for (let i = 0; i < n; i++) {
        cx += xs[i] / n;
        cy += ys[i] / n;
      }
    }
    return nodes.map((nd, i) => {
      const dx = xs[i] - cx;
      const dy = ys[i] - cy;
      const d = Math.hypot(dx, dy);
      const outward = !!radialLabels && d > 1 && !nd.ring;
      return { ux: outward ? dx / d : 0, uy: outward ? dy / d : 1, outward };
    });
  }, [nodes, xs, ys, n, positions, pin, radialLabels]);

  // Вписування в рамку з урахуванням підписів і кіл-позначок.
  const fit = useMemo(() => {
    const px: number[] = [];
    const py: number[] = [];
    const lx: number[] = [];
    const hx: number[] = [];
    const ly: number[] = [];
    const hy: number[] = [];
    for (let i = 0; i < n; i++) {
      const r = base * (nodes[i].size ?? 1) * (nodes[i].ring ? 1.45 : 1) + 3;
      let x0 = -r;
      let x1 = r;
      let y0 = -r;
      let y1 = r;
      if (showLabels) {
        const w = labels[i].length * CHAR_W;
        const { ux, uy, outward } = dirs[i];
        const gap = r + 4;
        const ax = ux * gap;
        const ay = uy * gap;
        const anchor = !outward || Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end';
        const bx0 = anchor === 'middle' ? ax - w / 2 : anchor === 'start' ? ax : ax - w;
        const by = outward ? (Math.abs(uy) < 0.3 ? ay - FONT / 2 : uy > 0 ? ay : ay - FONT) : gap;
        x0 = Math.min(x0, bx0);
        x1 = Math.max(x1, bx0 + w);
        y0 = Math.min(y0, by);
        y1 = Math.max(y1, by + FONT + 2);
      }
      px.push(xs[i]);
      py.push(ys[i]);
      lx.push(x0);
      hx.push(x1);
      ly.push(y0);
      hy.push(y1);
    }
    if (rings?.length) {
      const R = Math.max(...rings.map((r) => r.r));
      for (const [x, y, top] of [[R, 0, 0], [-R, 0, 0], [0, R, 0], [0, -R, 1]] as const) {
        px.push(x);
        py.push(y);
        lx.push(-1);
        hx.push(1);
        ly.push(top ? -14 : -1);
        hy.push(1);
      }
    }
    const fx = fitAxis(Float64Array.from(px), lx, hx, width, 10);
    const fy = fitAxis(Float64Array.from(py), ly, hy, height, 10);
    const s = Math.min(fx.s, fy.s, 2);
    // Центруємо вже за спільним масштабом.
    const centre = (pos: number[], lo: number[], hi: number[], size: number) => {
      let a = Infinity;
      let b = -Infinity;
      pos.forEach((p, i) => {
        a = Math.min(a, s * p + lo[i]);
        b = Math.max(b, s * p + hi[i]);
      });
      return (size - (b - a)) / 2 - a;
    };
    return { s, ox: centre(px, lx, hx, width), oy: centre(py, ly, hy, height) };
  }, [n, nodes, xs, ys, base, labels, dirs, showLabels, rings, width, height]);

  // ─── Наближення: під час жесту — дешевий transform готового малюнка (UI-потік), після — перемальовування
  // з новою геометрією (підписи лишаються свого розміру, а прихованих стає менше).
  const [view, setView] = useState<View2>(IDENTITY);
  const gs = useSharedValue(1);
  const gx = useSharedValue(0);
  const gy = useSharedValue(0);
  const fxv = useSharedValue(0);
  const fyv = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  const clampView = (v: View2): View2 => {
    const k = Math.min(K_MAX, Math.max(1, v.k));
    if (k <= 1.001) return IDENTITY;
    return { k, x: Math.min(0, Math.max(width - k * width, v.x)), y: Math.min(0, Math.max(height - k * height, v.y)) };
  };
  const commit = (s: number, tx: number, ty: number) => setView((v) => clampView({ k: v.k * s, x: tx + s * v.x, y: ty + s * v.y }));
  useLayoutEffect(() => {
    gs.set(1);
    gx.set(0);
    gy.set(0);
    panX.set(0);
    panY.set(0);
  }, [view, gs, gx, gy, panX, panY]);
  const zoomed = view.k > 1.001;
  useEffect(() => {
    onZoomChange?.(zoomed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed]);
  const zoomBy = (f: number) => setView((v) => {
    const k = Math.min(K_MAX, Math.max(1, v.k * f));
    const s = k / v.k;
    return clampView({ k, x: width / 2 - s * (width / 2 - v.x), y: height / 2 - s * (height / 2 - v.y) });
  });

  // Кінець останнього з жестів — переносимо поточний transform у геометрію (рівно один раз).
  const active = useSharedValue(0);
  const finish = (s: number, tx: number, ty: number) => commit(s, tx, ty);
  const kNow = view.k;
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      active.set(active.get() + 1);
      fxv.set(e.focalX);
      fyv.set(e.focalY);
    })
    .onUpdate((e) => {
      const s = Math.min(K_MAX / kNow, Math.max(1 / kNow, e.scale));
      gs.set(s);
      gx.set(fxv.get() * (1 - s) + panX.get());
      gy.set(fyv.get() * (1 - s) + panY.get());
    })
    .onEnd(() => {
      active.set(active.get() - 1);
      if (active.get() === 0) scheduleOnRN(finish, gs.get(), gx.get(), gy.get());
    });
  // Ненаближений граф тягнеться лише двома пальцями — один палець прокручує сторінку.
  const pan = Gesture.Pan()
    .minPointers(kNow > 1.001 ? 1 : 2)
    .onStart(() => {
      active.set(active.get() + 1);
    })
    .onUpdate((e) => {
      panX.set(e.translationX);
      panY.set(e.translationY);
      const s = gs.get();
      gx.set(fxv.get() * (1 - s) + e.translationX);
      gy.set(fyv.get() * (1 - s) + e.translationY);
    })
    .onEnd(() => {
      active.set(active.get() - 1);
      if (active.get() === 0) scheduleOnRN(finish, gs.get(), gx.get(), gy.get());
    });
  const composed = Gesture.Simultaneous(pinch, pan);
  const live = useAnimatedStyle(() => ({
    transform: [{ translateX: gx.get() }, { translateY: gy.get() }, { scale: gs.get() }],
  }));

  const X = (i: number) => view.x + view.k * (fit.ox + fit.s * xs[i]);
  const Y = (i: number) => view.y + view.k * (fit.oy + fit.s * ys[i]);
  const cx0 = view.x + view.k * fit.ox;
  const cy0 = view.y + view.k * fit.oy;
  const zr = Math.min(2.2, Math.max(1, Math.sqrt(view.k)));
  const R = (i: number) => base * (nodes[i].size ?? 1) * zr;

  // Підписи без накладань: спершу позначені (ви / центр) і більші вузли; що не влазить — ховаємо.
  const placed = useMemo(() => {
    const out: { i: number; x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] = [];
    if (!showLabels) return out;
    const boxes: [number, number, number, number][] = [];
    const order = nodes.map((_, i) => i).sort((a, b) => Number(!!nodes[b].ring) - Number(!!nodes[a].ring) || (nodes[b].size ?? 1) - (nodes[a].size ?? 1));
    for (const i of order) {
      const x = X(i);
      const y = Y(i);
      const r = R(i) * (nodes[i].ring ? 1.45 : 1) + 4;
      const { ux, uy, outward } = dirs[i];
      const anchor = !outward || Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end';
      const tx = x + ux * r;
      const ty = outward ? y + uy * r + (Math.abs(uy) < 0.3 ? 4 : uy > 0 ? FONT : -2) : y + r + FONT - 1;
      const w = labels[i].length * CHAR_W;
      const bx = anchor === 'middle' ? tx - w / 2 : anchor === 'start' ? tx : tx - w;
      const box: [number, number, number, number] = [bx - 1, ty - FONT, bx + w + 1, ty + 3];
      if (box[2] < 0 || box[0] > width || box[3] < 0 || box[1] > height) continue;
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      boxes.push(box);
      out.push({ i, x: tx, y: ty, anchor });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, labels, dirs, fit, view, showLabels, width, height]);

  const edgeColor = theme.text;
  return (
    <View>
      <GestureDetector gesture={composed}>
        <View style={{ width, height, overflow: 'hidden' }} collapsable={false}>
          <Animated.View style={[{ width, height, transformOrigin: 'top left' }, live]}>
            <Svg width={width} height={height}>
              {rich ? (
                <Defs>
                  {nodes.map((nd, i) =>
                    nd.image ? (
                      <ClipPath key={`c${nd.key}`} id={`clip-${i}`}>
                        <Circle cx={X(i)} cy={Y(i)} r={R(i)} />
                      </ClipPath>
                    ) : null,
                  )}
                </Defs>
              ) : null}
              {/* Кола-позначки — суцільні тонкі лінії (пунктир читається як «поріг»), підписи — текстовим кольором. */}
              {rings?.map((ring, k) => (
                <G key={`ring${k}`}>
                  <Circle cx={cx0} cy={cy0} r={ring.r * fit.s * view.k} stroke={theme.text} strokeOpacity={0.12} strokeWidth={1} fill="none" />
                  {ring.label ? (
                    <SvgText x={cx0} y={cy0 - ring.r * fit.s * view.k - 4} fill={theme.muted} fontSize={10} fontWeight="600" textAnchor="middle">
                      {ring.label}
                    </SvgText>
                  ) : null}
                </G>
              ))}
              {edges.map((e, k) => (
                <Line
                  key={`e${k}`}
                  x1={X(e.i)}
                  y1={Y(e.i)}
                  x2={X(e.j)}
                  y2={Y(e.j)}
                  stroke={edgeColor}
                  strokeOpacity={0.08 + e.w * 0.3}
                  strokeWidth={1 + e.w * 1.2}
                  strokeLinecap="round"
                />
              ))}
              {nodes.map((node, i) => {
                const x = X(i);
                const y = Y(i);
                const r = R(i);
                return (
                  <G key={node.key} onPress={onPressNode ? () => onPressNode(i) : undefined}>
                    {/* Більша прозора мішень для пальця (44pt). */}
                    <Circle cx={x} cy={y} r={Math.max(22, r + 8)} fill="transparent" />
                    {node.ring ? <Circle cx={x} cy={y} r={r * 1.45 + 3} fill="none" stroke={theme.accent} strokeWidth={2} /> : null}
                    {/* 2px кільце кольору тла — сусідні вузли не зливаються. */}
                    <Circle cx={x} cy={y} r={r + 2} fill={bg} />
                    <Circle cx={x} cy={y} r={r} fill={node.color} />
                    {node.image ? (
                      <SvgImage href={{ uri: node.image }} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath={`url(#clip-${i})`} preserveAspectRatio="xMidYMid slice" />
                    ) : node.initials && r >= 7 ? (
                      <SvgText x={x} y={y + r * 0.3} fill="#fff" fontSize={Math.max(7, r * 0.8)} fontWeight="700" textAnchor="middle">
                        {node.initials}
                      </SvgText>
                    ) : null}
                    {node.mark ? <Circle cx={x} cy={y} r={r} fill="none" stroke={node.mark} strokeWidth={2.5} /> : null}
                  </G>
                );
              })}
              {placed.map(({ i, x, y, anchor }) => (
                <G key={`l${nodes[i].key}`} pointerEvents="none">
                  <SvgText x={x} y={y} fontSize={FONT} fontWeight="600" textAnchor={anchor} stroke={bg} strokeWidth={3.5} strokeLinejoin="round" fill={bg}>
                    {labels[i]}
                  </SvgText>
                  <SvgText x={x} y={y} fontSize={FONT} fontWeight="600" textAnchor={anchor} fill={nodes[i].ring ? theme.accent : theme.text}>
                    {labels[i]}
                  </SvgText>
                </G>
              ))}
            </Svg>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Наближення кнопками — щипок не всі знаходять. */}
      <View style={[styles.zoom, { backgroundColor: `${bg}e6`, borderColor: theme.border }]}>
        <Pressable onPress={() => zoomBy(1.6)} hitSlop={6} accessibilityLabel="+" style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.6 }]}>
          <Text style={[styles.zoomText, { color: theme.text }]}>+</Text>
        </Pressable>
        <View style={[styles.zoomSep, { backgroundColor: theme.border }]} />
        <Pressable onPress={() => zoomBy(1 / 1.6)} disabled={view.k <= 1.001} hitSlop={6} accessibilityLabel="−" style={({ pressed }) => [styles.zoomBtn, { opacity: view.k <= 1.001 ? 0.35 : pressed ? 0.6 : 1 }]}>
          <Text style={[styles.zoomText, { color: theme.text }]}>−</Text>
        </Pressable>
        {view.k > 1.001 ? (
          <>
            <View style={[styles.zoomSep, { backgroundColor: theme.border }]} />
            <Pressable onPress={() => setView(IDENTITY)} hitSlop={6} accessibilityLabel="1:1" style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.6 }]}>
              <Text style={[styles.zoomReset, { color: theme.accent }]}>1:1</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {legend?.length ? (
        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.swatch, l.ring ? { borderWidth: 2, borderColor: l.color } : { backgroundColor: l.color }]} />
              <Text style={[styles.legendText, { color: theme.text2 }]}>{l.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zoom: { position: 'absolute', top: 8, right: 8, borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  zoomBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 18, fontFamily: FONT_SANS_SEMIBOLD, lineHeight: 20 },
  zoomReset: { fontSize: 11, fontFamily: FONT_SANS_SEMIBOLD },
  zoomSep: { height: StyleSheet.hairlineWidth },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6, paddingHorizontal: 10, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: FONT_SANS_MEDIUM },
});
