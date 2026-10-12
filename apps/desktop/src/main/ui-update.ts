/**
 * Оновлення інтерфейсу без перевстановлення. Сайт при кожному деплої публікує свіжу збірку інтерфейсу
 * застосунку в /desktop-ui/ з маніфестом. Якщо збірка нова, а версія містка та сама — завантажуємо файли
 * в профіль (з перевіркою контрольних сум) і далі показуємо інтерфейс звідти. Версія застосунку не
 * змінюється; зміни самого застосунку (головний процес, preload) — лише через інсталятор.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { app, net } from "electron";
import { BRIDGE_VERSION, type UiManifest } from "../shared/bridge";

const root = () => join(app.getPath("userData"), "ui");
const pointer = () => join(root(), "current.json");

function readManifest(dir: string): UiManifest | null {
  try {
    return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as UiManifest;
  } catch {
    return null;
  }
}

/** Тека інтерфейсу: завантажене оновлення (якщо сумісне й ціле) або вбудоване в інсталятор. */
export function activeUiDir(bundled: string): string {
  try {
    const { build } = JSON.parse(readFileSync(pointer(), "utf8")) as { build: string };
    const dir = join(root(), build);
    const m = readManifest(dir);
    if (m && m.bridge === BRIDGE_VERSION && existsSync(join(dir, "index.html"))) return dir;
  } catch {}
  return bundled;
}

export function currentBuild(dir: string) {
  return readManifest(dir)?.build ?? null;
}

/**
 * Перевірити й завантажити нову збірку. true — завантажено нову (застосувати: перезавантажити вікно
 * або наступний запуск).
 */
export async function fetchUiUpdate(api: string, current: string | null): Promise<boolean> {
  const res = await net.fetch(`${api}/desktop-ui/manifest.json`, { cache: "no-store" });
  if (!res.ok) return false;
  const m = (await res.json()) as UiManifest;
  if (!m.build || m.build === current || m.bridge !== BRIDGE_VERSION) return false;
  const final = join(root(), m.build);
  if (existsSync(join(final, "manifest.json"))) {
    writeFileSync(pointer(), JSON.stringify({ build: m.build }));
    return true;
  }
  const tmp = `${final}.part`;
  rmSync(tmp, { recursive: true, force: true });
  for (const f of m.files) {
    const target = normalize(join(tmp, f.path));
    if (!target.startsWith(tmp)) throw new Error(`недопустимий шлях: ${f.path}`);
    const r = await net.fetch(`${api}/desktop-ui/${f.path}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`${f.path}: HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (createHash("sha256").update(buf).digest("hex") !== f.sha256)
      throw new Error(`${f.path}: контрольна сума`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buf);
  }
  writeFileSync(join(tmp, "manifest.json"), JSON.stringify(m));
  rmSync(final, { recursive: true, force: true });
  renameSync(tmp, final);
  writeFileSync(pointer(), JSON.stringify({ build: m.build }));
  cleanup(m.build, current);
  return true;
}

/** Лишаємо поточну й нову збірки, решту прибираємо. */
function cleanup(keepA: string, keepB: string | null) {
  try {
    for (const name of readdirSync(root())) {
      if (name === "current.json" || name === keepA || name === keepB) continue;
      rmSync(join(root(), name), { recursive: true, force: true });
    }
  } catch {}
}
