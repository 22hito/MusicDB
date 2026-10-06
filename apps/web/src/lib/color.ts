"use client";
import { placeholderGradient } from "@musicdb/tokens";
import { useEffect, useState } from "react";
import { sized } from "./image";

const cache = new Map<string, string>();

/** Домінантний колір обкладинки (для градієнта шапки). Без CORS у CDN — детермінований колір за seed. */
export function useDominantColor(url: string | null | undefined, seed: string): string {
  const fallback = placeholderGradient(seed)[0];
  const small = sized(url, 56);
  const [color, setColor] = useState(() => (small && cache.get(small)) || fallback);

  useEffect(() => {
    if (!small) {
      setColor(fallback);
      return;
    }
    const hit = cache.get(small);
    if (hit) {
      setColor(hit);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;
        // Зважуємо насичені пікселі сильніше — сірі тони дають «брудний» градієнт.
        let r = 0;
        let g = 0;
        let b = 0;
        let w = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i]!;
          const pg = data[i + 1]!;
          const pb = data[i + 2]!;
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (max + min) / 510;
          const weight = 0.15 + sat * 2 * (1 - Math.abs(lum - 0.5));
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          w += weight;
        }
        const k = 0.8;
        const value = `rgb(${Math.round((r / w) * k)}, ${Math.round((g / w) * k)}, ${Math.round((b / w) * k)})`;
        cache.set(small, value);
        if (!cancelled) setColor(value);
      } catch {
        if (!cancelled) setColor(fallback);
      }
    };
    img.onerror = () => !cancelled && setColor(fallback);
    img.src = small;
    return () => {
      cancelled = true;
    };
  }, [small, fallback]);

  return color;
}

const paletteCache = new Map<string, [string, string, string]>();

/**
 * Три кольори обкладинки для «сяйва» за плеєром (як у v1): пікселі сортуються за відтінком і діляться
 * на три рівні за вагою частини — так виходять різні, а не три відтінки одного кольору.
 */
export function useCoverPalette(url: string | null | undefined): [string, string, string] | null {
  const small = sized(url, 56);
  const [colors, setColors] = useState<[string, string, string] | null>(() =>
    small ? (paletteCache.get(small) ?? null) : null,
  );

  useEffect(() => {
    if (!small) {
      setColors(null);
      return;
    }
    const hit = paletteCache.get(small);
    if (hit) {
      setColors(hit);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 20, 20);
        const data = ctx.getImageData(0, 0, 20, 20).data;
        const px: { r: number; g: number; b: number; h: number; w: number }[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const d = max - min;
          const sat = max === 0 ? 0 : d / max;
          let h = 0;
          if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
          px.push({ r, g, b, h: (h * 60 + 360) % 360, w: 0.1 + sat * sat * 3 * (max / 255) });
        }
        px.sort((a, b) => a.h - b.h);
        const total = px.reduce((s, p) => s + p.w, 0);
        const out: string[] = [];
        let acc = 0;
        let bucket = { r: 0, g: 0, b: 0, w: 0 };
        for (const p of px) {
          bucket.r += p.r * p.w;
          bucket.g += p.g * p.w;
          bucket.b += p.b * p.w;
          bucket.w += p.w;
          acc += p.w;
          if (acc >= (total * (out.length + 1)) / 3 && out.length < 2) {
            out.push(rgbOf(bucket));
            bucket = { r: 0, g: 0, b: 0, w: 0 };
          }
        }
        out.push(bucket.w ? rgbOf(bucket) : (out[0] ?? "rgb(0,0,0)"));
        const value = [out[0]!, out[1] ?? out[0]!, out[2] ?? out[0]!] as [string, string, string];
        paletteCache.set(small, value);
        if (!cancelled) setColors(value);
      } catch {
        if (!cancelled) setColors(null);
      }
    };
    img.onerror = () => !cancelled && setColors(null);
    img.src = small;
    return () => {
      cancelled = true;
    };
  }, [small]);

  return colors;
}

function rgbOf(b: { r: number; g: number; b: number; w: number }) {
  return `rgb(${Math.round(b.r / b.w)}, ${Math.round(b.g / b.w)}, ${Math.round(b.b / b.w)})`;
}
