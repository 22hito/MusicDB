"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RightPanel = "now-playing" | "queue" | "lyrics" | null;

type UiState = {
  rightPanel: RightPanel;
  sidebarCollapsed: boolean;
  fullPlayer: boolean;
  /** Сховати плаваюче відео (звук грає далі); у панелях і повноекранному плеєрі відео лишається. */
  videoHidden: boolean;
  setVideoHidden(hidden: boolean): void;
  setRightPanel(panel: RightPanel): void;
  toggleRightPanel(panel: Exclude<RightPanel, null>): void;
  toggleSidebar(): void;
  setFullPlayer(open: boolean): void;
};

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      rightPanel: "now-playing",
      sidebarCollapsed: false,
      fullPlayer: false,
      videoHidden: false,
      setVideoHidden: (videoHidden) => set({ videoHidden }),
      setRightPanel: (rightPanel) => set({ rightPanel }),
      toggleRightPanel: (panel) => set({ rightPanel: get().rightPanel === panel ? null : panel }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setFullPlayer: (fullPlayer) => set({ fullPlayer }),
    }),
    {
      name: "nowl-ui",
      partialize: (s) => ({
        rightPanel: s.rightPanel,
        sidebarCollapsed: s.sidebarCollapsed,
        videoHidden: s.videoHidden,
      }),
    },
  ),
);
