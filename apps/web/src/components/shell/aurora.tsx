"use client";
import { useEffect, useRef, useState } from "react";
import { useCoverPalette } from "@/lib/color";
import { usePlayer } from "@/player/store";

const layer = (c: [string, string, string]) =>
  `radial-gradient(ellipse 60% 70% at 12% 0%, ${c[0]}, transparent 70%),` +
  `radial-gradient(ellipse 55% 60% at 88% 4%, ${c[1]}, transparent 70%),` +
  `radial-gradient(ellipse 50% 50% at 50% 40%, ${c[2]}, transparent 75%)`;

/**
 * «Сяйво» з v1 за кольорами обкладинки, що грає: два шари радіальних градієнтів, новий трек плавно
 * перетікає поверх попереднього. Без розмиття й нескінченних анімацій — прокрутка лишається плавною.
 */
export function Aurora() {
  const cover = usePlayer((s) => s.current?.track.release?.coverUrl ?? null);
  const playing = usePlayer((s) => s.status === "playing");
  const colors = useCoverPalette(cover);
  const [layers, setLayers] = useState<[string | null, string | null]>([null, null]);
  const [front, setFront] = useState<0 | 1>(0);
  const last = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: перемикаємо шар лише при зміні кольорів
  useEffect(() => {
    const next = colors
      ? layer(colors)
      : layer(["var(--n-accent)", "var(--n-accent-2)", "var(--n-accent-lo)"]);
    if (next === last.current) return;
    last.current = next;
    const target: 0 | 1 = front === 0 ? 1 : 0;
    setLayers((l) => (target === 0 ? [next, l[1]] : [l[0], next]));
    setFront(target);
  }, [colors]);

  return (
    <div className="ambient" data-playing={playing} aria-hidden>
      <i data-on={front === 0} style={layers[0] ? { background: layers[0] } : undefined} />
      <i data-on={front === 1} style={layers[1] ? { background: layers[1] } : undefined} />
    </div>
  );
}
