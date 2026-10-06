"use client";
import { WHEEL_COLORS } from "@musicdb/tokens";
import { useMemo } from "react";

/** Конфеті-вибух з v1 (колесо, переможець батлу): прості елементи з CSS-анімацією. Новий key — новий вибух. */
export function Confetti({ count = 40, top = "50%" }: { count?: number; top?: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 180;
        const size = 5 + Math.random() * 4;
        return {
          i,
          style: {
            top,
            left: "50%",
            width: size,
            height: size,
            background: WHEEL_COLORS[i % WHEEL_COLORS.length],
            borderRadius: Math.random() < 0.5 ? "50%" : "2px",
            animation: `confetti-burst ${0.7 + Math.random() * 0.5}s cubic-bezier(.2,.8,.3,1) both`,
            "--dx": `${Math.cos(angle) * dist}px`,
            "--dy": `${Math.sin(angle) * dist}px`,
            "--rot": `${Math.round(Math.random() * 720 - 360)}deg`,
          } as React.CSSProperties,
        };
      }),
    [count, top],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden>
      {pieces.map((p) => (
        <span key={p.i} className="absolute" style={p.style} />
      ))}
    </div>
  );
}
