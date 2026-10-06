import { endpoints, type UploadPurpose } from "@musicdb/contracts";
import { assets } from "@musicdb/db";
import { and, eq } from "drizzle-orm";
import { implement } from "../../http/endpoint";
import { ApiError, badRequest, notFound } from "../../http/errors";

const MB = 1024 * 1024;

type Rule = { kind: "audio" | "image" | "attachment"; maxBytes: number; mime: RegExp; prefix: string };

const IMAGE = /^image\/(png|jpeg|webp|gif)$/;
const AUDIO =
  /^audio\/(mpeg|mp3|mp4|x-m4a|aac|ogg|opus|webm|wav|x-wav|wave|flac|x-flac|aiff|x-aiff)$|^video\/(mp4|webm|quicktime)$/;
const BLOCKED =
  /^application\/(x-msdownload|x-msdos-program|x-sh|x-executable|vnd\.microsoft\.portable-executable)$/;

export const uploadRules: Record<UploadPurpose, Rule> = {
  track_audio: { kind: "audio", maxBytes: 200 * MB, mime: AUDIO, prefix: "audio/originals" },
  artist_image: { kind: "image", maxBytes: 5 * MB, mime: IMAGE, prefix: "images/artists" },
  avatar: { kind: "image", maxBytes: 5 * MB, mime: IMAGE, prefix: "images/avatars" },
  playlist_cover: { kind: "image", maxBytes: 5 * MB, mime: IMAGE, prefix: "images/playlists" },
  attachment: {
    kind: "attachment",
    maxBytes: 20 * MB,
    mime: /^(?!application\/x-ms).+\/.+$/,
    prefix: "attachments",
  },
  screenshot: { kind: "image", maxBytes: 5 * MB, mime: IMAGE, prefix: "images/screenshots" },
};

function extension(fileName: string) {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  return m ? `.${m[1]}` : "";
}

export const uploadRoutes = [
  implement(endpoints.uploads.create, async ({ deps, user, body }) => {
    const rule = uploadRules[body.purpose];
    const mime = body.mimeType.toLowerCase();
    if (!rule.mime.test(mime) || BLOCKED.test(mime)) {
      throw new ApiError(415, "unsupported_type", "Такий тип файлу не підтримується");
    }
    if (body.sizeBytes > rule.maxBytes) {
      throw new ApiError(413, "file_too_large", `Файл завеликий (до ${Math.round(rule.maxBytes / MB)} МБ)`);
    }
    const [asset] = await deps.db
      .insert(assets)
      .values({
        kind: rule.kind,
        ownerId: user.id,
        status: "pending",
        storageKey: "",
        originalName: body.fileName,
        mimeType: mime,
        sizeBytes: body.sizeBytes,
      })
      .returning({ id: assets.id });
    const key = `${rule.prefix}/${asset!.id}${extension(body.fileName)}`;
    await deps.db.update(assets).set({ storageKey: key }).where(eq(assets.id, asset!.id));
    const expiresIn = 15 * 60;
    const signed = await deps.storage.presignPut(key, { contentType: mime, expiresIn });
    return {
      uploadId: asset!.id,
      method: "PUT" as const,
      url: signed.url,
      headers: signed.headers,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }),

  implement(endpoints.uploads.complete, async ({ deps, user, params }) => {
    const [asset] = await deps.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, params.id), eq(assets.ownerId, user.id)));
    if (!asset) throw notFound("upload");
    if (asset.status === "pending") {
      const head = await deps.storage.head(asset.storageKey);
      if (!head) throw badRequest("upload_missing", "Файл ще не завантажено у сховище");
      // Розмір перевіряє сховище; захист від підміни заявленого розміру.
      if (asset.sizeBytes && head.size > asset.sizeBytes * 1.01 + 1024) {
        await deps.storage.delete(asset.storageKey);
        await deps.db
          .update(assets)
          .set({ status: "failed", error: "size_mismatch" })
          .where(eq(assets.id, asset.id));
        throw new ApiError(413, "file_too_large", "Розмір файлу не збігається із заявленим");
      }
      const status = asset.kind === "audio" ? ("processing" as const) : ("uploaded" as const);
      await deps.db.update(assets).set({ status, sizeBytes: head.size }).where(eq(assets.id, asset.id));
      if (asset.kind === "audio") await deps.jobs.enqueue("audio.process", { assetId: asset.id });
      return { uploadId: asset.id, status, error: null, durationMs: null };
    }
    return { uploadId: asset.id, status: asset.status, error: asset.error, durationMs: asset.durationMs };
  }),

  implement(endpoints.uploads.status, async ({ deps, user, params }) => {
    const [asset] = await deps.db
      .select()
      .from(assets)
      .where(and(eq(assets.id, params.id), eq(assets.ownerId, user.id)));
    if (!asset) throw notFound("upload");
    return { uploadId: asset.id, status: asset.status, error: asset.error, durationMs: asset.durationMs };
  }),
];
