/**
 * Лише інтерфейс застосунку + маніфест (номер збірки з контрольних сум, версія містка).
 *   node scripts/build-ui.mjs [--out <тека>]
 * Без --out — у out/renderer (для інсталятора). На Vercel — у apps/web/public/desktop-ui: звідти
 * встановлені застосунки беруть оновлення інтерфейсу без перевстановлення.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { build as vite } from "vite";

const root = resolve(import.meta.dirname, "..");
const i = process.argv.indexOf("--out");
const outDir = i > 0 ? resolve(process.cwd(), process.argv[i + 1]) : resolve(root, "out/renderer");
const dev = process.argv.includes("--dev");

await vite({
  configFile: resolve(root, "vite.config.ts"),
  mode: dev ? "development" : "production",
  build: { minify: !dev, outDir, emptyOutDir: true },
  logLevel: "warn",
});

const bridgeSrc = readFileSync(resolve(root, "src/shared/bridge.ts"), "utf8");
const bridge = Number(bridgeSrc.match(/BRIDGE_VERSION = (\d+)/)?.[1] ?? 0);

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name !== "manifest.json") {
      const buf = readFileSync(p);
      files.push({
        path: relative(outDir, p).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(buf).digest("hex"),
        size: buf.length,
      });
    }
  }
};
walk(outDir);
files.sort((a, b) => a.path.localeCompare(b.path));
const build = createHash("sha256")
  .update(files.map((f) => `${f.path}:${f.sha256}`).join("\n"))
  .digest("hex")
  .slice(0, 16);
writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify({ build, bridge, builtAt: new Date().toISOString(), files }, null, 1),
);
console.log(`інтерфейс: збірка ${build}, місток ${bridge}, файлів ${files.length} → ${outDir}`);
