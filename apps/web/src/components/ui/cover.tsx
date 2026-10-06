"use client";
import { placeholderGradient } from "@musicdb/tokens";
import { Music, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { sized } from "@/lib/image";

/** Обкладинка з плавною появою й заглушкою-градієнтом (детермінованою за id), якщо картинки немає. */
export function Cover({
  src,
  alt,
  size,
  seed,
  rounded = "md",
  className,
  priority,
  mosaic,
}: {
  src: string | null | undefined;
  alt: string;
  size: number;
  seed: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  className?: string;
  priority?: boolean;
  mosaic?: string[];
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const radius = { none: "", sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", full: "rounded-full" }[
    rounded
  ];
  const [a, b] = placeholderGradient(seed);
  const url = sized(src, size);

  if (!url && mosaic && mosaic.length >= 4) {
    return (
      <div className={cn("grid aspect-square grid-cols-2 overflow-hidden bg-surface-3", radius, className)}>
        {mosaic.slice(0, 4).map((m) => (
          <img
            key={m}
            src={sized(m, size / 2) ?? m}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ))}
      </div>
    );
  }
  if (!url && mosaic && mosaic.length > 0) {
    return (
      <Cover
        src={mosaic[0]}
        alt={alt}
        size={size}
        seed={seed}
        rounded={rounded}
        {...(className ? { className } : {})}
      />
    );
  }

  return (
    <div
      className={cn("relative aspect-square overflow-hidden", radius, className)}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {url && !failed ? (
        <img
          // Картинка з серверного HTML може завантажитись до гідрації — тоді onLoad уже не спрацює.
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
          }}
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "size-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          {rounded === "full" ? (
            <User className="size-[40%]" strokeWidth={1.5} />
          ) : (
            <Music className="size-[36%]" strokeWidth={1.5} />
          )}
        </div>
      )}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 32,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [a, b] = placeholderGradient(name);
  const url = sized(src, size);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.42,
      }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        (name.trim()[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}
