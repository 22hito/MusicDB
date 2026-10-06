/**
 * Обробка завантаженого аудіо (ffmpeg):
 *  1) тривалість і гучність EBU R128 (плеєр вирівнює треки до −14 LUFS, як стрімінгові сервіси);
 *  2) хвиля — 200 пікових значень для прогрес-бару;
 *  3) перекодування в AAC 256 кбіт/с (M4A, faststart) — грає в усіх браузерах і на телефонах.
 * Оригінал лишається в сховищі (автор і адміни можуть його скачати).
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { assets, type Database } from "@musicdb/db";
import { eq } from "drizzle-orm";
import ffmpegStatic from "ffmpeg-static";
import type { Logger } from "pino";
import type { Realtime } from "./realtime";
import type { Storage } from "./storage";

const ffmpegPath = process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string | null) || "ffmpeg";

function run(args: string[], opts: { collectStdout?: boolean } = {}) {
  return new Promise<{ stderr: string; stdout: Buffer }>((resolve, reject) => {
    const proc = spawn(ffmpegPath, ["-hide_banner", "-nostdin", ...args], { windowsHide: true });
    const err: Buffer[] = [];
    const out: Buffer[] = [];
    proc.stderr.on("data", (d: Buffer) => err.push(d));
    if (opts.collectStdout) proc.stdout.on("data", (d: Buffer) => out.push(d));
    else proc.stdout.resume();
    const timer = setTimeout(() => proc.kill("SIGKILL"), 10 * 60_000);
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      const stderr = Buffer.concat(err).toString("utf8");
      if (code === 0) resolve({ stderr, stdout: Buffer.concat(out) });
      else reject(new Error(`ffmpeg завершився з кодом ${code}: ${stderr.slice(-600)}`));
    });
  });
}

export function parseDuration(stderr: string): number | null {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000);
}

export function parseLoudness(stderr: string): { lufs: number | null; peak: number | null } {
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const lufs = summary.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  const peak = summary.match(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/);
  return { lufs: lufs ? Number(lufs[1]) : null, peak: peak ? Number(peak[1]) : null };
}

/** PCM s16le mono → N пікових значень 0–255 (нормалізовані до найгучнішого). */
export function computeWaveform(pcm: Buffer, buckets = 200): number[] {
  const samples = Math.floor(pcm.length / 2);
  if (samples === 0) return [];
  const per = Math.max(1, Math.floor(samples / buckets));
  const peaks: number[] = [];
  for (let b = 0; b < buckets; b++) {
    let max = 0;
    const start = b * per;
    const end = Math.min(samples, start + per);
    for (let i = start; i < end; i++) {
      const v = Math.abs(pcm.readInt16LE(i * 2));
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const top = Math.max(...peaks, 1);
  return peaks.map((p) => Math.round((p / top) * 255));
}

export async function processAudioAsset(
  deps: { db: Database; storage: Storage; realtime: Realtime; log: Logger },
  assetId: string,
  opts: { reprocess?: boolean } = {},
) {
  const [asset] = await deps.db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset) return;
  if (asset.status === "ready" && !opts.reprocess) return;
  // Повторна обробка файлу, що вже грає (перенесений з v1): трек лишається доступним увесь час.
  const keepPlayable = asset.status === "ready";
  if (!keepPlayable) {
    await deps.db.update(assets).set({ status: "processing" }).where(eq(assets.id, assetId));
    if (asset.ownerId)
      deps.realtime.publish(asset.ownerId, {
        type: "upload.status",
        uploadId: assetId,
        status: "processing",
      });
  }

  const dir = await mkdtemp(join(tmpdir(), "nowl-audio-"));
  try {
    const input = join(dir, "input");
    const output = join(dir, "audio.m4a");
    await pipeline(await deps.storage.get(asset.storageKey), createWriteStream(input));

    const analysis = await run(["-i", input, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
    const durationMs = parseDuration(analysis.stderr);
    if (!durationMs) throw new Error("Файл не схожий на аудіо");
    const { lufs, peak } = parseLoudness(analysis.stderr);

    const pcm = await run(["-i", input, "-vn", "-ac", "1", "-ar", "4000", "-f", "s16le", "-"], {
      collectStdout: true,
    });
    const waveform = computeWaveform(pcm.stdout);

    await run([
      "-y",
      "-i",
      input,
      "-vn",
      "-map_metadata",
      "-1",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-c:a",
      "aac",
      "-b:a",
      "256k",
      "-movflags",
      "+faststart",
      output,
    ]);
    const streamKey = `streams/${assetId}/audio.m4a`;
    await deps.storage.put(streamKey, await readFile(output), "audio/mp4");

    await deps.db
      .update(assets)
      .set({
        status: "ready",
        streamKey,
        streamFormat: "aac",
        mimeType: asset.mimeType,
        durationMs,
        bitrateKbps: 256,
        loudnessLufs: lufs,
        truePeakDb: peak,
        waveform,
        error: null,
        processedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
    if (asset.ownerId)
      deps.realtime.publish(asset.ownerId, { type: "upload.status", uploadId: assetId, status: "ready" });
    deps.log.info({ assetId, durationMs, lufs }, "audio processed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.db
      .update(assets)
      .set({ ...(keepPlayable ? {} : { status: "failed" as const }), error: message.slice(0, 1000) })
      .where(eq(assets.id, assetId));
    if (asset.ownerId && !keepPlayable)
      deps.realtime.publish(asset.ownerId, { type: "upload.status", uploadId: assetId, status: "failed" });
    // Пошкоджений файл не виправиться повторною спробою — фіксуємо помилку на файлі й не повторюємо.
    deps.log.warn({ assetId, err: message }, "audio processing failed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
