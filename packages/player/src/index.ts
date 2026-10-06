export * from "./store";

/** Множник гучності для вирівнювання до −14 LUFS (як Spotify/YouTube). Не підсилює понад 0 дБ запасу. */
export function loudnessGain(lufs: number | null | undefined, target = -14): number {
  if (lufs == null || Number.isNaN(lufs)) return 1;
  const db = Math.min(target - lufs, 0);
  return 10 ** (db / 20);
}
export * from "./tournament";
