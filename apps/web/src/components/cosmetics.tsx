"use client";
/**
 * Оформлення Premium на сайті: анімовані аватар, банер, фон профілю й фон сайту.
 *
 * Щоб анімація не гальмувала сторінку й не з'їдала трафік, спершу показується статичний перший кадр (poster),
 * а анімований WebP вантажиться лише коли елемент на екрані, вкладка видима, «зменшений рух» вимкнено, немає
 * економії трафіку й користувач не обрав «статичний фон». Готові фони (preset) — чистий CSS.
 */
import type { CosmeticMedia, MyCosmetics } from "@musicdb/contracts/client";
import { useMe } from "@musicdb/sdk/react";
import { type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useSettings } from "@/lib/settings";

// ─── Налаштування «Анімація фону: авто / статичний» (на цьому пристрої) ────────
export type BgMotion = "auto" | "static";
const BG_KEY = "nowl-bg-motion";
const listeners = new Set<() => void>();

function readBgMotion(): BgMotion {
  try {
    return localStorage.getItem(BG_KEY) === "static" ? "static" : "auto";
  } catch {
    return "auto";
  }
}
export function setBgMotion(v: BgMotion) {
  try {
    localStorage.setItem(BG_KEY, v);
  } catch {}
  for (const l of listeners) l();
}
export function useBgMotion(): BgMotion {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readBgMotion,
    () => "auto",
  );
}

/** Чи можна зараз програвати анімацію (без урахування видимості конкретного елемента). */
export function useMotionAllowed() {
  const motion = useSettings((s) => s.motion);
  const bg = useBgMotion();
  const [env, setEnv] = useState({ reduced: false, saveData: false, hidden: false });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () =>
      setEnv({
        reduced: mq.matches,
        saveData: !!conn?.saveData,
        hidden: document.visibilityState === "hidden",
      });
    update();
    mq.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      mq.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  if (bg === "static" || env.saveData || env.hidden) return false;
  if (motion === "reduced") return false;
  if (motion === "system" && env.reduced) return false;
  return true;
}

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

/** Вертикальний екран (телефон) — для фону сайту береться вертикальний варіант. */
function usePortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return portrait;
}

export function CosmeticView({
  media,
  className,
  portrait = false,
  style,
}: {
  media: CosmeticMedia;
  className?: string;
  portrait?: boolean;
  style?: CSSProperties;
}) {
  const allowed = useMotionAllowed();
  const [ref, inView] = useInView<HTMLDivElement>();
  const play = allowed && inView;
  if (media.preset) {
    return (
      <div
        ref={ref}
        aria-hidden
        className={cn("cosmetic-preset", `cosmetic-${media.preset}`, className)}
        data-paused={!play}
        style={style}
      />
    );
  }
  const poster = (portrait && media.posterPortrait) || media.poster;
  const anim = (portrait && media.animPortrait) || media.anim;
  if (!poster) return null;
  return (
    <div ref={ref} aria-hidden className={cn("absolute inset-0 overflow-hidden", className)} style={style}>
      <img
        src={play && anim ? anim : poster}
        alt=""
        decoding="async"
        draggable={false}
        className="size-full object-cover"
      />
    </div>
  );
}

/** Фон усього сайту з Premium (лише для власника). Замінює «сяйво» обкладинки. */
export function SiteBackground() {
  const me = useMe().data;
  const portrait = usePortrait();
  const media: CosmeticMedia | null | undefined = me?.premium.active
    ? (me.cosmetics as MyCosmetics | undefined)?.siteBackground
    : null;
  // Поки нове обробляється, лишається попереднє оформлення.
  if (!media || (!media.preset && !media.poster)) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <CosmeticView media={media} portrait={portrait} />
      {/* Затемнення — текст лишається читабельним на будь-якому фоні. */}
      <div className="absolute inset-0 bg-bg/70" />
    </div>
  );
}

export function useHasSiteBackground() {
  const me = useMe().data;
  const m = me?.premium.active ? me.cosmetics?.siteBackground : null;
  return !!m && !!(m.preset || m.poster);
}
