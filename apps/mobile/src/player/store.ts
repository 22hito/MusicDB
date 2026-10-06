import { createPlayerStore, type PlayerActions, type PlayerState } from "@musicdb/player";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create, useStore } from "zustand";
import { api } from "@/lib/api";

/** Те саме ядро плеєра, що й на сайті — однакова поведінка черги, перемішування, радіо. */
export const playerStore = createPlayerStore({
  report: (trackId, msPlayed, context) => {
    void api.library
      .reportPlay({
        body: {
          trackId,
          msPlayed,
          platform: Platform.OS === "ios" ? "ios" : "android",
          ...(context ? { context: { type: context.type, ...(context.id ? { id: context.id } : {}) } } : {}),
        },
      })
      .catch(() => {});
  },
  fetchRadio: async (seed, exclude) =>
    (await api.tracks.radio({ params: { id: seed.id }, query: { limit: 25, exclude: exclude.slice(-200) } }))
      .items,
});

export function usePlayer<T>(selector: (s: PlayerState & PlayerActions) => T): T {
  return useStore(playerStore, selector);
}

const KEY = "nowl-player";
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<PlayerState>;
    playerStore.setState({
      ...(typeof s.volume === "number" ? { volume: s.volume } : {}),
      ...(s.repeat ? { repeat: s.repeat } : {}),
      ...(typeof s.autoplay === "boolean" ? { autoplay: s.autoplay } : {}),
      ...(typeof s.normalize === "boolean" ? { normalize: s.normalize } : {}),
    });
  })
  .catch(() => {});
playerStore.subscribe((s, p) => {
  if (
    s.volume !== p.volume ||
    s.repeat !== p.repeat ||
    s.autoplay !== p.autoplay ||
    s.normalize !== p.normalize
  ) {
    void AsyncStorage.setItem(
      KEY,
      JSON.stringify({ volume: s.volume, repeat: s.repeat, autoplay: s.autoplay, normalize: s.normalize }),
    );
  }
});

/** Де показувати відео YouTube: плаваюча картка або місце в повноекранному плеєрі. */
export type VideoFrame = { x: number; y: number; width: number; height: number } | null;
/** Що зараз реально грає (рушій): відео YouTube чи аудіо — для екранів, що показують відео. */
export const usePlayingSource = create<{ kind: "audio" | "youtube" | null }>(() => ({ kind: null }));

export const useVideoFrame = create<{
  frame: VideoFrame;
  setFrame: (f: VideoFrame) => void;
  /** Відео на весь екран (повернуте горизонтально), поверх усього застосунку. */
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  /** Плаваюче відео сховане (звук грає далі); у повноекранному плеєрі відео є завжди. */
  hidden: boolean;
  setHidden: (v: boolean) => void;
}>()((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
  frame: null,
  setFrame: (frame) => set({ frame }),
  fullscreen: false,
  setFullscreen: (fullscreen) => set({ fullscreen }),
}));
