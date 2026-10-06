import { z } from "zod";
import { Id, IsoDate, IsoDateTime } from "./common";
import { UserRef } from "./models";

/** Поля нової пісні — однакові для заявки в каталог і пісні ком'юніті. */
export const TrackDraft = z.object({
  title: z.string().trim().min(1).max(300),
  artists: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  releaseTitle: z.string().trim().max(300).optional(),
  releaseDate: IsoDate.optional(),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(4 * 3600_000)
    .optional(),
  genres: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  youtubeUrl: z.string().trim().max(300).optional(),
  lyrics: z.string().max(20_000).optional(),
  explicit: z.boolean().default(false),
  /** Аудіофайл, завантажений через /v1/uploads. */
  audioUploadId: Id.optional(),
});
export type TrackDraft = z.infer<typeof TrackDraft>;

/**
 * Часткові зміни треку — без значень за замовчуванням: у Zod 4 вони спрацьовують і всередині `.partial()`,
 * тож PATCH лише з назвою затер би жанри й позначку explicit.
 */
export const TrackDraftPatch = TrackDraft.extend({
  genres: z.array(z.string().trim().min(1).max(80)).max(5),
  explicit: z.boolean(),
})
  .partial()
  .extend({ releaseDate: IsoDate.nullable().optional() });
export type TrackDraftPatch = z.infer<typeof TrackDraftPatch>;

export const CorrectionField = z.enum([
  "title",
  "artists",
  "release",
  "release_date",
  "genres",
  "duration",
  "video",
  "lyrics",
  "audio",
  "bio",
  "image",
  "other",
]);

export const CorrectionDraft = z.object({
  targetType: z.enum(["track", "artist", "release"]),
  targetId: Id,
  field: CorrectionField,
  message: z.string().trim().min(3).max(4000),
  sourceUrl: z.string().trim().url().max(500).optional(),
  audioUploadId: Id.optional(),
});
export type CorrectionDraft = z.infer<typeof CorrectionDraft>;

export const SubmissionKind = z.enum(["catalog_track", "community_track", "correction"]);
export const SubmissionStatus = z.enum(["pending", "approved", "rejected", "withdrawn"]);

export const Submission = z
  .object({
    id: Id,
    kind: SubmissionKind,
    status: SubmissionStatus,
    submitter: UserRef.nullable(),
    targetType: z.string().nullable(),
    targetId: z.string().nullable(),
    targetLabel: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()),
    audio: z.object({ url: z.string().nullable(), name: z.string().nullable() }).nullable(),
    reviewer: UserRef.nullable(),
    reviewNote: z.string().nullable(),
    reviewedAt: IsoDateTime.nullable(),
    resultTrackId: z.string().nullable(),
    createdAt: IsoDateTime,
  })
  .meta({ id: "Submission" });
export type Submission = z.infer<typeof Submission>;

export const ReportTarget = z.enum(["track", "user", "message", "post", "thread", "playlist", "rating"]);
export type ReportTarget = z.infer<typeof ReportTarget>;
export const ReportReason = z.enum([
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "copyright",
  "impersonation",
  "misinformation",
  "other",
]);
export type ReportReason = z.infer<typeof ReportReason>;

export const ReportDraft = z.object({
  targetType: ReportTarget,
  targetId: Id,
  reason: ReportReason,
  details: z.string().trim().max(2000).optional(),
});

export const Report = z
  .object({
    id: Id,
    reporter: UserRef.nullable(),
    targetType: ReportTarget,
    targetId: Id,
    targetLabel: z.string().nullable(),
    reason: ReportReason,
    details: z.string().nullable(),
    status: z.enum(["open", "actioned", "dismissed"]),
    resolution: z.string().nullable(),
    createdAt: IsoDateTime,
  })
  .meta({ id: "Report" });
export type Report = z.infer<typeof Report>;

export const BugReportDraft = z.object({
  description: z.string().trim().min(5).max(4000),
  context: z.record(z.string(), z.unknown()).optional(),
  screenshotUploadIds: z.array(Id).max(3).default([]),
});

export const BugReport = z
  .object({
    id: Id,
    user: UserRef.nullable(),
    description: z.string(),
    context: z.record(z.string(), z.unknown()).nullable(),
    screenshots: z.array(z.string()),
    status: z.enum(["open", "resolved"]),
    createdAt: IsoDateTime,
  })
  .meta({ id: "BugReport" });
export type BugReport = z.infer<typeof BugReport>;

export const AuditEntry = z
  .object({
    id: z.number().int(),
    actor: UserRef.nullable(),
    action: z.string(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    label: z.string().nullable(),
    createdAt: IsoDateTime,
  })
  .meta({ id: "AuditEntry" });
export type AuditEntry = z.infer<typeof AuditEntry>;

// ─── Завантаження файлів ──────────────────────────────────────────────────

export const UploadPurpose = z.enum([
  "track_audio",
  "artist_image",
  "avatar",
  "playlist_cover",
  "attachment",
  "screenshot",
]);
export type UploadPurpose = z.infer<typeof UploadPurpose>;

export const CreateUploadBody = z.object({
  purpose: UploadPurpose,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().max(100),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(200 * 1024 * 1024),
});

/** Пряме завантаження у сховище за підписаним посиланням — файл не проходить через API. */
export const UploadTicket = z
  .object({
    uploadId: Id,
    method: z.enum(["PUT"]),
    url: z.string(),
    headers: z.record(z.string(), z.string()),
    expiresAt: IsoDateTime,
  })
  .meta({ id: "UploadTicket" });
export type UploadTicket = z.infer<typeof UploadTicket>;

export const UploadStatus = z
  .object({
    uploadId: Id,
    status: z.enum(["pending", "uploaded", "processing", "ready", "failed"]),
    error: z.string().nullable(),
    durationMs: z.number().int().nullable(),
  })
  .meta({ id: "UploadStatus" });
export type UploadStatus = z.infer<typeof UploadStatus>;
