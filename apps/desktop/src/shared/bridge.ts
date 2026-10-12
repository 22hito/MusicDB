/**
 * Версія містка між інтерфейсом і застосунком (preload: nowlDesktop.*). Інтерфейс, що прийшов оновленням
 * через мережу, застосовується лише з тією самою версією — інакше потрібен новий інсталятор.
 * Піднімати, коли змінюється preload або IPC.
 */
export const BRIDGE_VERSION = 1;

export type UiManifest = {
  build: string;
  bridge: number;
  builtAt: string;
  files: { path: string; sha256: string; size: number }[];
};
