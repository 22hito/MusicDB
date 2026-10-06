"use client";
/**
 * Місця, куди «накладається» відео YouTube. iframe не можна переносити в DOM (він перезавантажиться),
 * тож він лежить у фіксованому контейнері й повторює позицію й розмір видимого слота з найвищим пріоритетом.
 */
import { type RefObject, useEffect, useRef } from "react";
import { create } from "zustand";

type Slot = { id: number; el: HTMLElement; priority: number };

type SlotStore = {
  slots: Slot[];
  register(el: HTMLElement, priority: number): number;
  unregister(id: number): void;
};

/**
 * Сховища — в одному екземплярі на сторінку: якщо модуль виконається повторно (гаряче перезавантаження
 * під час розробки), рушій і слоти все одно бачать ті самі дані, і відео не «випадає» в плаваюче вікно.
 */
const shared = globalThis as typeof globalThis & {
  __nowlVideo?: {
    slots: ReturnType<typeof createSlots>;
    source: ReturnType<typeof createSource>;
    host: { el: HTMLElement | null };
    nextId: number;
  };
};

const createSource = () => create<{ kind: "audio" | "youtube" | null }>(() => ({ kind: null }));

const createSlots = () =>
  create<SlotStore>()((set) => ({
    slots: [],
    register(el, priority) {
      const id = shared.__nowlVideo!.nextId++;
      set((s) => ({ slots: [...s.slots, { id, el, priority }] }));
      return id;
    },
    unregister(id) {
      set((s) => ({ slots: s.slots.filter((x) => x.id !== id) }));
    },
  }));

shared.__nowlVideo ??= { slots: createSlots(), source: createSource(), host: { el: null }, nextId: 1 };
const store = shared.__nowlVideo;

/** Що зараз реально грає (рушій): відео YouTube чи аудіо — від цього залежить, де показувати відео. */
export const usePlayingSource = store.source;

/**
 * Контейнер з iframe YouTube. Відео на весь екран — це Fullscreen API саме для нього:
 * iframe не переноситься в DOM і не перезавантажується, а браузер розгортає контейнер на весь екран.
 */
export function setVideoHost(el: HTMLElement | null) {
  store.host.el = el;
}
export function enterVideoFullscreen() {
  void store.host.el?.requestFullscreen?.().catch(() => {});
}
export function isVideoFullscreen() {
  return !!store.host.el && document.fullscreenElement === store.host.el;
}

export const useVideoSlots = store.slots;

/** Слот, у який зараз має потрапити відео: найвищий пріоритет серед тих, що мають розмір. */
export function activeSlot(slots: Slot[]): Slot | null {
  let best: Slot | null = null;
  for (const s of slots) {
    const r = s.el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!best || s.priority >= best.priority) best = s;
  }
  return best;
}

/** Позначає елемент як місце для відео. Вищий priority перемагає (повноекранний > панель). */
export function useVideoSlot(ref: RefObject<HTMLElement | null>, priority = 1, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const id = useVideoSlots.getState().register(el, priority);
    return () => useVideoSlots.getState().unregister(id);
  }, [ref, priority, enabled]);
}

export function VideoSlot({
  priority = 1,
  className,
  style,
}: {
  priority?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useVideoSlot(ref, priority);
  return <div ref={ref} className={className} style={style} data-video-slot />;
}
