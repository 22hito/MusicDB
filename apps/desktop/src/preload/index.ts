/** Міст між інтерфейсом і застосунком: лише потрібні виклики, без доступу до Node. */
import { contextBridge, ipcRenderer } from "electron";

type Command = "toggle" | "next" | "prev";

contextBridge.exposeInMainWorld("nowlDesktop", {
  platform: process.platform,
  sendPlayerState(s: { playing: boolean; title: string | null; artist: string | null; hasTrack: boolean }) {
    ipcRenderer.send("player:state", s);
  },
  onCommand(cb: (cmd: Command) => void) {
    const listener = (_e: unknown, cmd: Command) => cb(cmd);
    ipcRenderer.on("player:command", listener);
    return () => ipcRenderer.removeListener("player:command", listener);
  },
  setTitleBar(colors: { color: string; symbolColor: string }) {
    ipcRenderer.send("window:titlebar", colors);
  },
});
