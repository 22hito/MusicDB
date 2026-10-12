/**
 * Збірка: головний процес і preload — esbuild (усе в один файл, без node_modules у пакеті),
 * інтерфейс — scripts/build-ui.mjs (Vite + маніфест). --dev: без мініфікації.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { build as esbuild } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dev = process.argv.includes("--dev");

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: dev ? "inline" : false,
  minify: !dev,
  logLevel: "warning",
};

await esbuild({
  ...common,
  entryPoints: [resolve(root, "src/main/index.ts")],
  outfile: resolve(root, "out/main.cjs"),
});
await esbuild({
  ...common,
  entryPoints: [resolve(root, "src/preload/index.ts")],
  outfile: resolve(root, "out/preload.cjs"),
});
execFileSync(process.execPath, [resolve(root, "scripts/build-ui.mjs"), ...(dev ? ["--dev"] : [])], {
  stdio: "inherit",
  cwd: root,
});
console.log("зібрано: out/main.cjs, out/preload.cjs, out/renderer");
