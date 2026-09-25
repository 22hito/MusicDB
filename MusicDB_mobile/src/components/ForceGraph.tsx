import React, { useMemo } from 'react';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { useSettings } from '@/state/SettingsContext';

// Граф схожості (як граф на сайті, але статичний): сила відштовхування між усіма
// вузлами, пружини між схожими, тяжіння до центру. Розкладка рахується один раз
// (вузлів — десятки, до ~150), далі — звичайний SVG; вузли натискаються.
export interface GraphNode {
  key: string;
  label: string;
  color: string;
  ring?: boolean; // "ви" — з кільцем
}
export interface GraphEdge {
  i: number;
  j: number;
  w: number; // 0..1
}

function layout(n: number, edges: GraphEdge[]) {
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
        let f = 5000 / d2;
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
  }
  return { xs, ys };
}

export function ForceGraph({
  nodes,
  edges,
  width,
  height,
  onPressNode,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  onPressNode?: (index: number) => void;
}) {
  const { theme } = useSettings();
  const n = nodes.length;
  const { xs, ys } = useMemo(() => layout(n, edges), [n, edges]);

  // Вписуємо розкладку в прямокутник (знизу — місце під підписи).
  const pad = 22;
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
  const s = Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad - padB) / Math.max(1, maxY - minY), 2);
  const ox = (width - s * (maxX + minX)) / 2;
  const oy = pad + (height - pad - padB - s * (maxY - minY)) / 2 - s * minY;
  const X = (i: number) => ox + s * xs[i];
  const Y = (i: number) => oy + s * ys[i];
  const r = n > 60 ? 5 : 8;

  return (
    <Svg width={width} height={height}>
      {edges.map((e, k) => (
        <Line key={`e${k}`} x1={X(e.i)} y1={Y(e.i)} x2={X(e.j)} y2={Y(e.j)} stroke={theme.accent} strokeOpacity={0.15 + e.w * 0.5} strokeWidth={1 + e.w * 1.5} />
      ))}
      {nodes.map((node, i) => {
        const label = node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label;
        return (
          <G key={node.key} onPress={onPressNode ? () => onPressNode(i) : undefined}>
            {/* Більша прозора мішень для пальця. */}
            <Circle cx={X(i)} cy={Y(i)} r={20} fill="transparent" />
            {node.ring ? <Circle cx={X(i)} cy={Y(i)} r={r * 1.8} fill="none" stroke={theme.accent} strokeWidth={2} /> : null}
            <Circle cx={X(i)} cy={Y(i)} r={r} fill={node.color} />
            {n <= 60 ? (
              <SvgText x={X(i)} y={Y(i) + r * 1.9 + 10} fill={theme.text} fillOpacity={0.9} fontSize={10} fontWeight="600" textAnchor="middle">
                {label}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
