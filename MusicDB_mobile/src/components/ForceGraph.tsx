import React, { useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Line, Text as SvgText } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';

// Граф схожості (як граф на сайті, але статичний). Два режими розкладки:
// - positions — готові координати (радіальні "карта смаку" й граф навколо пісні; центр 400×300);
// - інакше фізика: відштовхування, пружини між схожими, тяжіння до центру (pin — закріплений у центрі).
// Вузли: колір або фото/ініціали, власний розмір, обідок (mark), кільце (ring). Вузли натискаються.
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

const CX = 400;
const CY = 300;

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
}) {
  const { theme } = useSettings();
  const n = nodes.length;
  const rich = nodes.some((nd) => nd.size != null || nd.image || nd.initials);
  const { xs, ys } = useMemo(() => {
    if (positions) {
      return { xs: Float64Array.from(positions.map((p) => p[0] - CX)), ys: Float64Array.from(positions.map((p) => p[1] - CY)) };
    }
    return forceLayout(n, edges, pin, rich);
  }, [n, edges, positions, pin, rich]);

  // Вписуємо розкладку (і кола-позначки) у прямокутник; знизу — місце під підписи.
  const pad = 26;
  const padB = 34;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, xs[i]);
    maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]);
    maxY = Math.max(maxY, ys[i]);
  }
  if (rings?.length) {
    const R = Math.max(...rings.map((r) => r.r));
    minX = Math.min(minX, -R);
    maxX = Math.max(maxX, R);
    minY = Math.min(minY, -R);
    maxY = Math.max(maxY, R);
  }
  const s = Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad - padB) / Math.max(1, maxY - minY), 2);
  const ox = (width - s * (maxX + minX)) / 2;
  const oy = pad + (height - pad - padB - s * (maxY - minY)) / 2 - s * minY;
  const X = (i: number) => ox + s * xs[i];
  const Y = (i: number) => oy + s * ys[i];
  const cx0 = ox;
  const cy0 = oy;
  const base = baseRadius ?? (n > 60 ? 5 : 8);
  const R = (i: number) => base * (nodes[i].size ?? 1);

  return (
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
      {rings?.map((ring, k) => (
        <G key={`ring${k}`}>
          <Circle cx={cx0} cy={cy0} r={ring.r * s} stroke={theme.accent} strokeOpacity={0.25} strokeDasharray="4 6" fill="none" />
          {ring.label ? (
            <SvgText x={cx0} y={cy0 - ring.r * s - 4} fill={theme.accent} fillOpacity={0.8} fontSize={9} fontWeight="600" textAnchor="middle">
              {ring.label}
            </SvgText>
          ) : null}
        </G>
      ))}
      {edges.map((e, k) => (
        <Line key={`e${k}`} x1={X(e.i)} y1={Y(e.i)} x2={X(e.j)} y2={Y(e.j)} stroke={theme.accent} strokeOpacity={0.15 + e.w * 0.45} strokeWidth={1 + e.w * 1.5} />
      ))}
      {nodes.map((node, i) => {
        const label = node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label;
        const x = X(i);
        const y = Y(i);
        const r = R(i);
        // Підпис: назовні від центру (радіальні розкладки) або під вузлом.
        const dx = x - cx0;
        const dy = y - cy0;
        const d = Math.hypot(dx, dy);
        const outward = radialLabels && d > 1 && !node.ring;
        const ux = outward ? dx / d : 0;
        const uy = outward ? dy / d : 1;
        const lr = (node.ring ? r * 1.45 : r) + 5;
        const anchor = !outward || Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end';
        const ly = y + uy * lr + (outward ? (Math.abs(uy) < 0.3 ? 3 : uy > 0 ? 9 : -2) : 9);
        return (
          <G key={node.key} onPress={onPressNode ? () => onPressNode(i) : undefined}>
            {/* Більша прозора мішень для пальця. */}
            <Circle cx={x} cy={y} r={Math.max(20, r + 6)} fill="transparent" />
            {node.ring ? <Circle cx={x} cy={y} r={r * 1.45 + 3} fill="none" stroke={theme.accent} strokeWidth={2} /> : null}
            <Circle cx={x} cy={y} r={r} fill={node.color} />
            {node.image ? (
              <SvgImage href={{ uri: node.image }} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath={`url(#clip-${i})`} preserveAspectRatio="xMidYMid slice" />
            ) : node.initials ? (
              <SvgText x={x} y={y + r * 0.3} fill="#fff" fontSize={Math.max(7, r * 0.8)} fontWeight="700" textAnchor="middle">
                {node.initials}
              </SvgText>
            ) : null}
            {node.mark ? <Circle cx={x} cy={y} r={r} fill="none" stroke={node.mark} strokeWidth={2.5} /> : null}
            {n <= 60 ? (
              <SvgText x={x + ux * lr} y={ly} fill={theme.text} fillOpacity={0.9} fontSize={10} fontWeight="600" textAnchor={anchor}>
                {label}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
