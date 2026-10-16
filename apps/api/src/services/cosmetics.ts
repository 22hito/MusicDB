/**
 * Оформлення Premium: анімовані аватар, банер і фон профілю (бачать усі) та фон сайту (лише власник).
 *
 * Завантажений файл (GIF, MP4, WebM, MOV або картинка) ffmpeg перетворює на анімований WebP фіксованого розміру
 * і статичний перший кадр. WebP вибрано свідомо: його показують і браузери (<img>), і expo-image у застосунку —
 * без відеоплеєра й нової нативної збірки. Щоб анімація не важила забагато, вона обрізається до 6 с, частота
 * кадрів знижена, а для фону сайту є окремий вертикальний варіант для телефонів (менший і повільніший).
 * Якщо результат перевищує ліміт, кодуємо вдруге з нижчими частотою й якістю.
 */
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { CosmeticMedia, CosmeticSlot, MyCosmetics, ProfileCosmetics } from "@musicdb/contracts";
import { assets, type DbOrTx, type StoredCosmetic, type StoredCosmetics, users } from "@musicdb/db";
import { eq, inArray } from "drizzle-orm";
import type { Deps } from "../context";
import { runFfmpeg } from "./audio";

type Variant = { suffix: string; w: number; h: number; fps: number; maxBytes: number };

const MB = 1024 * 1024;
const MAX_SECONDS = 6;

/** Розміри й ліміти для кожного слоту. */
export const VARIANTS: Record<CosmeticSlot, { main: Variant; portrait?: Variant }> = {
  avatar: { main: { suffix: "", w: 320, h: 320, fps: 20, maxBytes: 1.5 * MB } },
  banner: { main: { suffix: "", w: 1200, h: 400, fps: 15, maxBytes: 4 * MB } },
  background: { main: { suffix: "", w: 1280, h: 720, fps: 15, maxBytes: 5 * MB } },
  siteBackground: {
    main: { suffix: "", w: 1280, h: 720, fps: 15, maxBytes: 5 * MB },
    // Телефон: вертикальний кадр по центру, менший розмір і частота — менше трафіку й заряду.
    portrait: { suffix: "-p", w: 540, h: 960, fps: 12, maxBytes: 3 * MB },
  },
};

const empty = (): StoredCosmetic => ({
  preset: null,
  anim: null,
  poster: null,
  animPortrait: null,
  posterPortrait: null,
  status: "ready",
  assetId: null,
  outputs: [],
});

function toMedia(s: StoredCosmetic | undefined): CosmeticMedia | null {
  if (!s || (!s.preset && !s.poster && s.status === "ready")) return null;
  return {
    preset: (s.preset as CosmeticMedia["preset"]) ?? null,
    anim: s.anim,
    poster: s.poster,
    animPortrait: s.animPortrait,
    posterPortrait: s.posterPortrait,
    status: s.status,
  };
}

export function myCosmetics(stored: StoredCosmetics | null): MyCosmetics {
  const c = stored ?? {};
  return {
    avatar: toMedia(c.avatar),
    banner: toMedia(c.banner),
    background: toMedia(c.background),
    siteBackground: toMedia(c.siteBackground),
  };
}

/** Публічна частина: лише готові слоти й лише з активним Premium. */
export function publicCosmetics(stored: StoredCosmetics | null, premium: boolean): ProfileCosmetics | null {
  if (!premium || !stored) return null;
  // Поки нове обробляється (або не вдалося), відвідувачі бачать попереднє оформлення.
  const ready = (s: StoredCosmetic | undefined) => {
    const m = s && (s.preset || s.poster) ? toMedia(s) : null;
    return m ? { ...m, status: "ready" as const } : null;
  };
  const out = {
    avatar: ready(stored.avatar),
    banner: ready(stored.banner),
    background: ready(stored.background),
  };
  return out.avatar || out.banner || out.background ? out : null;
}

/** Прибирає готові файли попереднього оформлення слоту (записи assets і самі файли). */
async function dropOutputs(deps: Pick<Deps, "db" | "storage" | "log">, ids: string[]) {
  if (!ids.length) return;
  const rows = await deps.db.select().from(assets).where(inArray(assets.id, ids));
  await Promise.all(
    rows.map((r) =>
      deps.storage
        .delete(r.storageKey)
        .catch((err) => deps.log.warn({ err, key: r.storageKey }, "cosmetic delete")),
    ),
  );
  await deps.db.delete(assets).where(inArray(assets.id, ids));
}

async function saveSlot(db: DbOrTx, userId: string, slot: CosmeticSlot, value: StoredCosmetic | null) {
  const [u] = await db.select({ cosmetics: users.cosmetics }).from(users).where(eq(users.id, userId));
  const next: StoredCosmetics = { ...(u?.cosmetics ?? {}) };
  if (value) next[slot] = value;
  else delete next[slot];
  await db.update(users).set({ cosmetics: next }).where(eq(users.id, userId));
}

export async function readSlot(db: DbOrTx, userId: string, slot: CosmeticSlot) {
  const [u] = await db.select({ cosmetics: users.cosmetics }).from(users).where(eq(users.id, userId));
  return u?.cosmetics?.[slot];
}

/** Готовий фон (CSS) або прибрати оформлення слоту. */
export async function setPresetOrClear(
  deps: Pick<Deps, "db" | "storage" | "log">,
  userId: string,
  slot: CosmeticSlot,
  preset: string | null,
) {
  const prev = await readSlot(deps.db, userId, slot);
  await saveSlot(deps.db, userId, slot, preset ? { ...empty(), preset } : null);
  await dropOutputs(deps, prev?.outputs ?? []);
}

/** Позначає слот «обробляється» — сам файл обробить фонова задача media.cosmetic. */
export async function startProcessing(db: DbOrTx, userId: string, slot: CosmeticSlot, assetId: string) {
  const prev = await readSlot(db, userId, slot);
  await saveSlot(db, userId, slot, {
    ...(prev ?? empty()),
    status: "processing",
    assetId,
    // Поки обробляється — показуємо попереднє оформлення (якщо було).
    outputs: prev?.outputs ?? [],
  });
}

function filter(v: Variant, fps: number) {
  return `fps=${fps},scale=${v.w}:${v.h}:force_original_aspect_ratio=increase,crop=${v.w}:${v.h}`;
}

async function encodeAnim(input: string, out: string, v: Variant) {
  for (const [fps, quality] of [
    [v.fps, 60],
    [Math.max(8, Math.round(v.fps * 0.6)), 40],
  ] as const) {
    await runFfmpeg([
      "-y",
      "-t",
      String(MAX_SECONDS),
      "-i",
      input,
      "-vf",
      filter(v, fps),
      "-an",
      "-loop",
      "0",
      "-c:v",
      "libwebp_anim",
      "-lossless",
      "0",
      "-quality",
      String(quality),
      "-compression_level",
      "4",
      out,
    ]);
    if ((await stat(out)).size <= v.maxBytes) return;
  }
  throw new Error("too_large");
}

async function encodePoster(input: string, out: string, v: Variant) {
  await runFfmpeg([
    "-y",
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    `scale=${v.w}:${v.h}:force_original_aspect_ratio=increase,crop=${v.w}:${v.h}`,
    "-c:v",
    "libwebp",
    "-quality",
    "80",
    out,
  ]);
}

/** Фонова задача: файл → анімований WebP + перший кадр (і вертикальний варіант для фону сайту). */
export async function processCosmetic(
  deps: Deps,
  job: { userId: string; slot: CosmeticSlot; assetId: string },
) {
  const { userId, slot, assetId } = job;
  const current = await readSlot(deps.db, userId, slot);
  if (current?.assetId !== assetId) return; // користувач уже обрав інше
  const [src] = await deps.db.select().from(assets).where(eq(assets.id, assetId));
  if (!src) return;
  const still = !!src.mimeType?.startsWith("image/") && src.mimeType !== "image/gif";
  const dir = await mkdtemp(join(tmpdir(), "nowl-cosmetic-"));
  const created: string[] = [];
  try {
    const input = join(dir, "input");
    await pipeline(await deps.storage.get(src.storageKey), createWriteStream(input));

    const store = async (file: string, name: string) => {
      const [row] = await deps.db
        .insert(assets)
        .values({
          kind: "image",
          ownerId: userId,
          status: "ready",
          storageKey: `images/cosmetics/${userId}/${slot}-${assetId}${name}.webp`,
          mimeType: "image/webp",
          sizeBytes: (await stat(file)).size,
          processedAt: new Date(),
        })
        .returning();
      await deps.storage.put(row!.storageKey, await readFile(file), "image/webp");
      created.push(row!.id);
      return deps.storage.publicUrl(row!.storageKey) ?? `${deps.env.API_URL}/v1/media/${row!.id}`;
    };

    const render = async (v: Variant) => {
      const poster = join(dir, `poster${v.suffix}.webp`);
      await encodePoster(input, poster, v);
      const posterUrl = await store(poster, `${v.suffix}-poster`);
      if (still) return { anim: null, poster: posterUrl };
      const anim = join(dir, `anim${v.suffix}.webp`);
      await encodeAnim(input, anim, v);
      return { anim: await store(anim, v.suffix), poster: posterUrl };
    };

    const variants = VARIANTS[slot];
    const main = await render(variants.main);
    const portrait = variants.portrait ? await render(variants.portrait) : null;

    // Користувач міг обрати інше, поки ми кодували.
    const latest = await readSlot(deps.db, userId, slot);
    if (latest?.assetId !== assetId) {
      await dropOutputs(deps, created);
      return;
    }
    await saveSlot(deps.db, userId, slot, {
      preset: null,
      anim: main.anim,
      poster: main.poster,
      animPortrait: portrait?.anim ?? null,
      posterPortrait: portrait?.poster ?? null,
      status: "ready",
      assetId: null,
      outputs: created,
    });
    await dropOutputs(
      deps,
      latest.outputs.filter((id) => !created.includes(id)),
    );
  } catch (err) {
    deps.log.warn({ err, userId, slot, assetId }, "cosmetic processing failed");
    await dropOutputs(deps, created);
    const latest = await readSlot(deps.db, userId, slot);
    if (latest?.assetId === assetId)
      await saveSlot(deps.db, userId, slot, { ...latest, status: "failed", assetId: null });
  } finally {
    await rm(dir, { recursive: true, force: true });
    // Джерело більше не потрібне.
    await deps.storage.delete(src.storageKey).catch(() => {});
    await deps.db.delete(assets).where(eq(assets.id, assetId));
  }
}
