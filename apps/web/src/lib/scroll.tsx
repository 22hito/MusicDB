"use client";
import { createContext, type ReactNode, useContext } from "react";

/** Головний прокручуваний контейнер сторінки — для віртуалізованих списків і «липких» шапок. */
const ScrollContext = createContext<HTMLElement | null>(null);

export function ScrollProvider({ element, children }: { element: HTMLElement | null; children: ReactNode }) {
  return <ScrollContext.Provider value={element}>{children}</ScrollContext.Provider>;
}

export const useScrollElement = () => useContext(ScrollContext);
