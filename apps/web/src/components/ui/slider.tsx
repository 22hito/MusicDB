"use client";
/**
 * Повзунок для прогресу й гучності: під час перетягування показує власне значення,
 * а не те, що приходить із плеєра, — щоб повзунок не «стрибав» під пальцем.
 */
import { Slider as S } from "radix-ui";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Slider({
  value,
  max,
  onCommit,
  onPreview,
  label,
  className,
  step = 1,
  disabled,
}: {
  value: number;
  max: number;
  onCommit: (v: number) => void;
  onPreview?: (v: number | null) => void;
  label: string;
  className?: string;
  step?: number;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  return (
    <S.Root
      className={cn("group relative flex h-4 w-full touch-none items-center select-none", className)}
      value={[Math.min(shown, max)]}
      max={Math.max(max, 1)}
      step={step}
      disabled={disabled}
      aria-label={label}
      onValueChange={([v]) => {
        setDrag(v ?? 0);
        onPreview?.(v ?? 0);
      }}
      onValueCommit={([v]) => {
        setDrag(null);
        onPreview?.(null);
        onCommit(v ?? 0);
      }}
    >
      <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-line-strong">
        <S.Range className="absolute h-full rounded-full bg-fg group-hover:bg-accent group-data-[disabled]:bg-subtle" />
      </S.Track>
      <S.Thumb className="block size-3 rounded-full bg-fg opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none" />
    </S.Root>
  );
}
