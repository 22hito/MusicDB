/** Обмін з інтерфейсом: стан плеєра (для трею й панелі завдань) і керування вікном. */
import { type BrowserWindow, ipcMain } from "electron";

export type PlayerState = {
  playing: boolean;
  title: string | null;
  artist: string | null;
  hasTrack: boolean;
};

export function registerIpc(opts: { onState(s: PlayerState): void; window(): BrowserWindow | null }) {
  ipcMain.on("player:state", (_e, s: PlayerState) => opts.onState(s));
  ipcMain.on("window:titlebar", (_e, colors: { color: string; symbolColor: string }) => {
    try {
      opts.window()?.setTitleBarOverlay({ ...colors, height: 40 });
    } catch {}
  });
}
