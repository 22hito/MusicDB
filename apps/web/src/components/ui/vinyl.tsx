import { cn } from "@/lib/cn";
import { Cover } from "./cover";

/**
 * Платівка N'Owl: вінілові борозенки, обкладинка — «яблуко» в центрі, обертається під час відтворення.
 * Розмір — або числом (`size`), або класами (`className` з w-/h-), тоді яблуко масштабується разом із диском.
 */
export function Vinyl({
  src,
  seed,
  playing,
  size,
  imageSize,
  className,
}: {
  src: string | null | undefined;
  seed: string;
  playing: boolean;
  size?: number;
  /** Розмір запитуваної картинки — той самий, що в сусідньої обкладинки, щоб браузер узяв її з кешу. */
  imageSize?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("vinyl relative block shrink-0 rounded-full", className)}
      data-playing={playing}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden
    >
      <span className="absolute inset-[22%] overflow-hidden rounded-full ring-1 ring-black/40">
        <Cover
          src={src}
          alt=""
          size={imageSize ?? Math.round((size ?? 160) * 0.6)}
          seed={seed}
          rounded="full"
          className="size-full"
        />
      </span>
      <span className="absolute top-1/2 left-1/2 size-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg ring-1 ring-white/10" />
    </span>
  );
}
