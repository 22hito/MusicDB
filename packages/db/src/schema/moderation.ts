/**
 * Модерація й адміністрування: заявки, скарги, баг-репорти, журнал дій, підписки.
 */
import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./_columns";
import { users } from "./auth";
import { assets } from "./catalog";

export const submissionKind = pgEnum("submission_kind", ["catalog_track", "community_track", "correction"]);
export const submissionStatus = pgEnum("submission_status", ["pending", "approved", "rejected", "withdrawn"]);
export const reportStatus = pgEnum("report_status", ["open", "actioned", "dismissed"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "canceled",
  "expired",
  "past_due",
]);

/**
 * Заявка від користувача: нова пісня в каталог/ком'юніті або правка наявної сутності.
 * payload — поля заявки (назва, виконавці, жанри, дата, текст, посилання…), схема — у contracts.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    kind: submissionKind("kind").notNull(),
    status: submissionStatus("status").notNull().default("pending"),
    submitterId: text("submitter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type"),
    targetId: text("target_id"),
    /** Підпис цілі на момент подання — «Виконавець — Назва». */
    targetLabel: text("target_label"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    audioAssetId: text("audio_asset_id").references(() => assets.id, { onDelete: "set null" }),
    reviewerId: text("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    reviewedAt: ts("reviewed_at"),
    /** Трек, створений чи змінений після схвалення. */
    resultTrackId: text("result_track_id"),
    legacyId: integer("legacy_id"),
    legacySource: text("legacy_source"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("submissions_status_idx").on(t.status, t.createdAt.desc()),
    index("submissions_submitter_idx").on(t.submitterId, t.createdAt.desc()),
  ],
);

/** Скарга на контент чи людину (вимога Google Play для застосунків з UGC). */
export const reports = pgTable(
  "reports",
  {
    id: id(),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: ts("resolved_at"),
    resolution: text("resolution"),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.createdAt.desc()),
    index("reports_target_idx").on(t.targetType, t.targetId),
  ],
);

export const bugReports = pgTable(
  "bug_reports",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    context: jsonb("context").$type<Record<string, unknown>>(),
    screenshots: text("screenshots").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: ts("resolved_at"),
    legacyId: integer("legacy_id"),
    createdAt: createdAt(),
  },
  (t) => [index("bug_reports_status_idx").on(t.status, t.createdAt.desc())],
);

/** Журнал дій адміністраторів і важливих системних подій. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    label: text("label"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt.desc())],
);

/** Преміум-підписка. provider = stub — тестова оплата без грошей (до підключення справжнього провайдера). */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("premium"),
    status: subscriptionStatus("status").notNull().default("active"),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    currentPeriodStart: ts("current_period_start").notNull(),
    currentPeriodEnd: ts("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId, t.currentPeriodEnd.desc())],
);
