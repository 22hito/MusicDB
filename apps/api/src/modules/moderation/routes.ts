import {
  type CorrectionDraft,
  endpoints,
  type Report,
  type Submission,
  type TrackDraft,
} from "@musicdb/contracts";
import {
  artistFollows,
  artists,
  assets,
  auditLog,
  bugReports,
  type DbOrTx,
  indexEntities,
  messages,
  playlists,
  plays,
  posts,
  removeFromIndex,
  reports,
  sessions,
  submissions,
  threads,
  trackArtists,
  trackRatings,
  tracks,
  users,
} from "@musicdb/db";
import { and, count, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { Deps, SessionUser } from "../../context";
import { offsetPage, readOffset } from "../../http/cursor";
import { implement } from "../../http/endpoint";
import { badRequest, conflict, forbidden, notFound } from "../../http/errors";
import { clearMemo } from "../../http/memo";
import { loadTrackDetail } from "../catalog/detail";
import { iso, loadUserRefs, toUserRef } from "../catalog/hydrate";
import { createTrack, removeTrack, updateTrack } from "../catalog/write";
import { imageUrlFromUpload } from "../me/routes";
import { grantPremium, revokePremium } from "../premium/routes";
import { notify } from "../social/notify";
import { listAdminTracks, loadAdminTrack } from "./admin-tracks";
import { audit } from "./audit";

type SubmissionRow = typeof submissions.$inferSelect;

async function hydrateSubmissions(deps: Deps, rows: SubmissionRow[]): Promise<Submission[]> {
  const people = await loadUserRefs(deps.db, [
    ...rows.map((r) => r.submitterId),
    ...rows.map((r) => r.reviewerId),
  ]);
  const assetIds = rows.flatMap((r) => (r.audioAssetId ? [r.audioAssetId] : []));
  const assetRows = assetIds.length
    ? await deps.db.select().from(assets).where(inArray(assets.id, assetIds))
    : [];
  const byId = new Map(assetRows.map((a) => [a.id, a]));
  return Promise.all(
    rows.map(async (r) => {
      const asset = r.audioAssetId ? byId.get(r.audioAssetId) : undefined;
      return {
        id: r.id,
        kind: r.kind,
        status: r.status,
        submitter: r.submitterId ? (people.get(r.submitterId) ?? null) : null,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        payload: r.payload,
        audio: asset
          ? {
              url: asset.storageKey
                ? await deps.storage.presignGet(asset.storageKey, {
                    expiresIn: 3600,
                    contentType: asset.mimeType ?? undefined,
                  })
                : null,
              name: asset.originalName,
            }
          : null,
        reviewer: r.reviewerId ? (people.get(r.reviewerId) ?? null) : null,
        reviewNote: r.reviewNote,
        reviewedAt: r.reviewedAt ? iso(r.reviewedAt) : null,
        resultTrackId: r.resultTrackId,
        createdAt: iso(r.createdAt),
      };
    }),
  );
}

async function ownAudio(db: DbOrTx, user: SessionUser, uploadId: string | undefined) {
  if (!uploadId) return null;
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, uploadId), eq(assets.ownerId, user.id), eq(assets.kind, "audio")));
  if (!asset || asset.status === "pending")
    throw badRequest("audio_not_uploaded", "Аудіофайл не завантажено");
  return asset.id;
}

async function correctionTargetLabel(db: DbOrTx, c: CorrectionDraft) {
  if (c.targetType === "artist") {
    const [a] = await db.select({ name: artists.name }).from(artists).where(eq(artists.id, c.targetId));
    if (!a) throw notFound("artist");
    return a.name;
  }
  if (c.targetType === "track") {
    const [t] = await db.select({ title: tracks.title }).from(tracks).where(eq(tracks.id, c.targetId));
    if (!t) throw notFound("track");
    const credits = await db
      .select({ name: artists.name })
      .from(trackArtists)
      .innerJoin(artists, eq(artists.id, trackArtists.artistId))
      .where(eq(trackArtists.trackId, c.targetId))
      .orderBy(trackArtists.position);
    return `${credits.map((x) => x.name).join(", ")} — ${t.title}`;
  }
  return c.targetId;
}

/** Підписникам виконавців — сповіщення про новий трек. */
export async function notifyNewTrack(deps: Deps, trackId: string) {
  const [t] = await deps.db.select({ title: tracks.title }).from(tracks).where(eq(tracks.id, trackId));
  if (!t) return;
  const credits = await deps.db
    .select({ id: artists.id, name: artists.name })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(eq(trackArtists.trackId, trackId));
  if (credits.length === 0) return;
  const followers = await deps.db
    .selectDistinct({ id: artistFollows.userId })
    .from(artistFollows)
    .where(
      inArray(
        artistFollows.artistId,
        credits.map((c) => c.id),
      ),
    );
  await notify(
    deps,
    followers.map((f) => f.id),
    {
      type: "new_release",
      entityType: "track",
      entityId: trackId,
      data: { title: t.title, artists: credits.map((c) => c.name).join(", ") },
    },
  );
}

async function reportTargetLabels(db: DbOrTx, rows: (typeof reports.$inferSelect)[]) {
  const labels = new Map<string, string>();
  const ids = (type: string) => rows.filter((r) => r.targetType === type).map((r) => r.targetId);
  const add = (type: string, list: { id: string; label: string }[]) => {
    for (const x of list) labels.set(`${type}:${x.id}`, x.label);
  };
  if (ids("track").length)
    add(
      "track",
      await db
        .select({ id: tracks.id, label: tracks.title })
        .from(tracks)
        .where(inArray(tracks.id, ids("track"))),
    );
  if (ids("user").length)
    add(
      "user",
      await db
        .select({ id: users.id, label: users.name })
        .from(users)
        .where(inArray(users.id, ids("user"))),
    );
  if (ids("thread").length)
    add(
      "thread",
      await db
        .select({ id: threads.id, label: threads.title })
        .from(threads)
        .where(inArray(threads.id, ids("thread"))),
    );
  if (ids("playlist").length) {
    add(
      "playlist",
      await db
        .select({ id: playlists.id, label: playlists.title })
        .from(playlists)
        .where(inArray(playlists.id, ids("playlist"))),
    );
  }
  if (ids("post").length) {
    add(
      "post",
      (
        await db
          .select({ id: posts.id, label: posts.body })
          .from(posts)
          .where(inArray(posts.id, ids("post")))
      ).map((p) => ({ ...p, label: p.label.slice(0, 120) })),
    );
  }
  if (ids("message").length) {
    add(
      "message",
      (
        await db
          .select({ id: messages.id, label: messages.body })
          .from(messages)
          .where(inArray(messages.id, ids("message")))
      ).map((m) => ({ ...m, label: m.label.slice(0, 120) })),
    );
  }
  return labels;
}

async function hydrateReports(deps: Deps, rows: (typeof reports.$inferSelect)[]): Promise<Report[]> {
  const [people, labels] = await Promise.all([
    loadUserRefs(
      deps.db,
      rows.map((r) => r.reporterId),
    ),
    reportTargetLabels(deps.db, rows),
  ]);
  return rows.map((r) => ({
    id: r.id,
    reporter: r.reporterId ? (people.get(r.reporterId) ?? null) : null,
    targetType: r.targetType as Report["targetType"],
    targetId: r.targetId,
    targetLabel: labels.get(`${r.targetType}:${r.targetId}`) ?? null,
    reason: r.reason as Report["reason"],
    details: r.details,
    status: r.status,
    resolution: r.resolution,
    createdAt: iso(r.createdAt),
  }));
}

/** Хто автор контенту, на який скаржаться (для блокування). */
async function contentAuthor(db: DbOrTx, type: string, id: string): Promise<string | null> {
  switch (type) {
    case "user":
      return id;
    case "track":
      return (await db.select({ a: tracks.uploaderId }).from(tracks).where(eq(tracks.id, id)))[0]?.a ?? null;
    case "message":
      return (
        (await db.select({ a: messages.senderId }).from(messages).where(eq(messages.id, id)))[0]?.a ?? null
      );
    case "post":
      return (await db.select({ a: posts.authorId }).from(posts).where(eq(posts.id, id)))[0]?.a ?? null;
    case "thread":
      return (await db.select({ a: threads.authorId }).from(threads).where(eq(threads.id, id)))[0]?.a ?? null;
    case "playlist":
      return (
        (await db.select({ a: playlists.ownerId }).from(playlists).where(eq(playlists.id, id)))[0]?.a ?? null
      );
    default:
      return null;
  }
}

async function removeContent(db: DbOrTx, type: string, id: string) {
  const now = new Date();
  switch (type) {
    case "track":
      await removeTrack(db, id);
      break;
    case "message":
      await db
        .update(messages)
        .set({ deletedAt: now, body: "", attachment: null })
        .where(eq(messages.id, id));
      break;
    case "post":
      await db.update(posts).set({ deletedAt: now }).where(eq(posts.id, id));
      break;
    case "thread":
      await db.update(threads).set({ deletedAt: now }).where(eq(threads.id, id));
      break;
    case "playlist":
      await db.update(playlists).set({ visibility: "private" }).where(eq(playlists.id, id));
      await removeFromIndex(db, "playlist", [id]);
      break;
    case "rating": {
      const [userId, trackId] = id.split(":");
      if (userId && trackId) {
        await db
          .update(trackRatings)
          .set({ review: null })
          .where(and(eq(trackRatings.userId, userId), eq(trackRatings.trackId, trackId)));
      }
      break;
    }
  }
}

async function banUser(db: DbOrTx, userId: string, reason: string | undefined) {
  await db
    .update(users)
    .set({ banned: true, banReason: reason ?? null })
    .where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await removeFromIndex(db, "user", [userId]);
}

export const moderationRoutes = [
  // ─── Заявки ─────────────────────────────────────────────────────────────

  implement(endpoints.submissions.create, async ({ deps, user, body }) => {
    const db = deps.db;
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.submitterId, user.id),
          gte(submissions.createdAt, new Date(Date.now() - 3600_000)),
        ),
      );
    if (n >= 20) throw conflict("too_many_submissions", "Забагато заявок за годину, спробуйте пізніше");

    let row: SubmissionRow;
    if (body.kind === "correction") {
      const c = body.correction;
      [row] = (await db
        .insert(submissions)
        .values({
          kind: "correction",
          submitterId: user.id,
          targetType: c.targetType,
          targetId: c.targetId,
          targetLabel: await correctionTargetLabel(db, c),
          payload: { field: c.field, message: c.message, sourceUrl: c.sourceUrl ?? null },
          audioAssetId: await ownAudio(db, user, c.audioUploadId),
        })
        .returning()) as [SubmissionRow];
    } else {
      const t = body.track;
      [row] = (await db
        .insert(submissions)
        .values({
          kind: body.kind,
          submitterId: user.id,
          targetLabel: `${t.artists.join(", ")} — ${t.title}`,
          payload: t as unknown as Record<string, unknown>,
          audioAssetId: await ownAudio(db, user, t.audioUploadId),
        })
        .returning()) as [SubmissionRow];
    }
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
    const [s] = await hydrateSubmissions(deps, [row]);
    return s!;
  }),

  implement(endpoints.submissions.mine, async ({ deps, user, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(submissions)
      .where(eq(submissions.submitterId, user.id))
      .orderBy(desc(submissions.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateSubmissions(deps, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.submissions.withdraw, async ({ deps, user, params }) => {
    const res = await deps.db
      .update(submissions)
      .set({ status: "withdrawn" })
      .where(
        and(
          eq(submissions.id, params.id),
          eq(submissions.submitterId, user.id),
          eq(submissions.status, "pending"),
        ),
      )
      .returning({ id: submissions.id });
    if (res.length === 0) throw notFound("submission");
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
  }),

  implement(endpoints.admin.submissions, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(submissions)
      .where(eq(submissions.status, query.status))
      .orderBy(query.status === "pending" ? submissions.createdAt : desc(submissions.reviewedAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateSubmissions(deps, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.admin.review, async ({ deps, user, params, body }) => {
    const result = await deps.db.transaction(async (tx) => {
      const [s] = await tx.select().from(submissions).where(eq(submissions.id, params.id)).for("update");
      if (!s) throw notFound("submission");
      if (s.status !== "pending") throw conflict("already_reviewed", "Заявку вже розглянуто");
      let resultTrackId: string | null = null;
      if (body.decision === "approve") {
        if (s.kind === "catalog_track" || s.kind === "community_track") {
          const draft = { ...(s.payload as unknown as TrackDraft), ...(body.track ?? {}) } as TrackDraft;
          if (s.audioAssetId) draft.audioUploadId = s.audioAssetId;
          const created = await createTrack(tx, draft, {
            source: s.kind === "community_track" ? "community" : "catalog",
            uploaderId: s.kind === "community_track" ? s.submitterId : null,
          });
          resultTrackId = created.id;
        } else if (
          s.targetType === "track" &&
          s.targetId &&
          s.audioAssetId &&
          (s.payload as { field?: string }).field === "audio"
        ) {
          await updateTrack(tx, s.targetId, { audioUploadId: s.audioAssetId });
          resultTrackId = s.targetId;
        }
      }
      const [updated] = await tx
        .update(submissions)
        .set({
          status: body.decision === "approve" ? "approved" : "rejected",
          reviewerId: user.id,
          reviewNote: body.note ?? null,
          reviewedAt: new Date(),
          resultTrackId,
        })
        .where(eq(submissions.id, s.id))
        .returning();
      await audit(tx, {
        actorId: user.id,
        action: `submission.${body.decision}`,
        entityType: "submission",
        entityId: s.id,
        label: s.targetLabel ?? undefined,
      });
      return updated!;
    });
    if (result.submitterId) {
      await notify(deps, [result.submitterId], {
        type: body.decision === "approve" ? "submission_approved" : "submission_rejected",
        actorId: user.id,
        entityType: result.resultTrackId ? "track" : "submission",
        entityId: result.resultTrackId ?? result.id,
        data: { label: result.targetLabel, note: result.reviewNote },
      });
    }
    if (result.resultTrackId && result.kind !== "correction")
      await deps.jobs.enqueue("notify.new_track", { trackId: result.resultTrackId });
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
    if (result.resultTrackId) {
      clearMemo();
      deps.realtime.broadcast({ type: "catalog.changed", trackIds: [result.resultTrackId] });
    }
    const [hydrated] = await hydrateSubmissions(deps, [result]);
    return hydrated!;
  }),

  // ─── Скарги й баг-репорти ───────────────────────────────────────────────

  implement(endpoints.reports.create, async ({ deps, user, body }) => {
    const [existing] = await deps.db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, user.id),
          eq(reports.targetType, body.targetType),
          eq(reports.targetId, body.targetId),
          eq(reports.status, "open"),
        ),
      );
    if (!existing) {
      await deps.db.insert(reports).values({
        reporterId: user.id,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        details: body.details ?? null,
      });
      deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
    }
    return { ok: true as const };
  }),

  implement(endpoints.reports.bug, async ({ deps, user, body }) => {
    let screenshots: string[] = [];
    if (body.screenshotUploadIds.length) {
      if (!user) throw forbidden("login_required", "Скріншоти можуть додавати лише користувачі з входом");
      const rows = await deps.db
        .select({ key: assets.storageKey })
        .from(assets)
        .where(
          and(
            inArray(assets.id, body.screenshotUploadIds),
            eq(assets.ownerId, user.id),
            eq(assets.kind, "image"),
          ),
        );
      screenshots = rows.map((r) => r.key);
    }
    await deps.db.insert(bugReports).values({
      userId: user?.id ?? null,
      description: body.description,
      context: body.context ?? null,
      screenshots,
    });
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
    return { ok: true as const };
  }),

  implement(endpoints.admin.reports, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(reports)
      .where(eq(reports.status, query.status))
      .orderBy(desc(reports.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return { items: await hydrateReports(deps, page.items), nextCursor: page.nextCursor };
  }),

  implement(endpoints.admin.resolveReport, async ({ deps, user, params, body }) => {
    const updated = await deps.db.transaction(async (tx) => {
      const [r] = await tx.select().from(reports).where(eq(reports.id, params.id));
      if (!r) throw notFound("report");
      if (body.action === "remove_content") await removeContent(tx, r.targetType, r.targetId);
      if (body.action === "ban_user") {
        const author = await contentAuthor(tx, r.targetType, r.targetId);
        if (!author) throw badRequest("no_author", "Не вдалося визначити автора");
        if (author === user.id) throw badRequest("cannot_ban_self", "Не можна заблокувати себе");
        await banUser(tx, author, body.note);
        await removeContent(tx, r.targetType, r.targetId);
      }
      // Усі відкриті скарги на ту саму ціль закриваються разом.
      const rows = await tx
        .update(reports)
        .set({
          status: body.action === "dismiss" ? "dismissed" : "actioned",
          resolvedBy: user.id,
          resolvedAt: new Date(),
          resolution: body.note ?? body.action,
        })
        .where(
          and(
            eq(reports.targetType, r.targetType),
            eq(reports.targetId, r.targetId),
            eq(reports.status, "open"),
          ),
        )
        .returning();
      await audit(tx, {
        actorId: user.id,
        action: `report.${body.action}`,
        entityType: r.targetType,
        entityId: r.targetId,
      });
      return rows.find((x) => x.id === r.id) ?? r;
    });
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
    const [hydrated] = await hydrateReports(deps, [updated]);
    return hydrated!;
  }),

  implement(endpoints.admin.bugReports, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(bugReports)
      .where(eq(bugReports.status, query.status))
      .orderBy(desc(bugReports.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    const people = await loadUserRefs(
      deps.db,
      page.items.map((r) => r.userId),
    );
    return {
      items: await Promise.all(
        page.items.map(async (r) => ({
          id: r.id,
          user: r.userId ? (people.get(r.userId) ?? null) : null,
          description: r.description,
          context: r.context,
          screenshots: await Promise.all(
            r.screenshots.map((key) => deps.storage.presignGet(key, { expiresIn: 3600 })),
          ),
          status: r.status === "resolved" ? ("resolved" as const) : ("open" as const),
          createdAt: iso(r.createdAt),
        })),
      ),
      nextCursor: page.nextCursor,
    };
  }),

  implement(endpoints.admin.setBugReportStatus, async ({ deps, user, params, body }) => {
    const res = await deps.db
      .update(bugReports)
      .set({
        status: body.status,
        resolvedBy: body.status === "resolved" ? user.id : null,
        resolvedAt: body.status === "resolved" ? new Date() : null,
      })
      .where(eq(bugReports.id, params.id))
      .returning({ id: bugReports.id });
    if (res.length === 0) throw notFound("bug_report");
    deps.realtime.publishToRole("moderator", { type: "moderation.changed" });
  }),

  // ─── Каталог (адмін) ────────────────────────────────────────────────────

  implement(endpoints.admin.tracks, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const { rows, total } = await listAdminTracks(deps.db, query, offset);
    return { ...offsetPage(rows, offset, query.limit), total };
  }),

  implement(endpoints.admin.track, async ({ deps, params }) => {
    const t = await loadAdminTrack(deps.db, params.id);
    if (!t) throw notFound("track");
    return t;
  }),

  implement(endpoints.admin.createTrack, async ({ deps, user, body }) => {
    const { source, ...draft } = body;
    const created = await deps.db.transaction(async (tx) => {
      const c = await createTrack(tx, draft, { source, uploaderId: source === "community" ? user.id : null });
      await audit(tx, {
        actorId: user.id,
        action: "track.create",
        entityType: "track",
        entityId: c.id,
        label: draft.title,
      });
      return c;
    });
    await deps.jobs.enqueue("notify.new_track", { trackId: created.id });
    clearMemo();
    deps.realtime.broadcast({ type: "catalog.changed", trackIds: [created.id] });
    return loadTrackDetail(deps, created.id, user);
  }),

  implement(endpoints.admin.updateTrack, async ({ deps, user, params, body }) => {
    const [exists] = await deps.db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, params.id));
    if (!exists) throw notFound("track");
    await deps.db.transaction(async (tx) => {
      await updateTrack(tx, params.id, body);
      await audit(tx, {
        actorId: user.id,
        action: "track.update",
        entityType: "track",
        entityId: params.id,
        data: { fields: Object.keys(body) },
      });
    });
    clearMemo();
    deps.realtime.broadcast({ type: "catalog.changed", trackIds: [params.id] });
    const updated = await loadAdminTrack(deps.db, params.id);
    if (!updated) throw notFound("track");
    return updated;
  }),

  implement(endpoints.admin.deleteTrack, async ({ deps, user, params }) => {
    await deps.db.transaction(async (tx) => {
      await removeTrack(tx, params.id);
      await audit(tx, { actorId: user.id, action: "track.delete", entityType: "track", entityId: params.id });
    });
    clearMemo();
    deps.realtime.broadcast({ type: "catalog.changed", trackIds: [params.id] });
  }),

  implement(endpoints.admin.updateArtist, async ({ deps, user, params, body }) => {
    const [a] = await deps.db.select().from(artists).where(eq(artists.id, params.id));
    if (!a) throw notFound("artist");
    const patch: Partial<typeof artists.$inferInsert> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.bio !== undefined) patch.bio = { ...(a.bio ?? {}), ...body.bio };
    if (body.verified !== undefined) patch.verified = body.verified;
    if (body.imageUploadId !== undefined) {
      patch.imageUrl = body.imageUploadId ? await imageUrlFromUpload(deps, user, body.imageUploadId) : null;
    }
    const [updated] = await deps.db.update(artists).set(patch).where(eq(artists.id, a.id)).returning();
    await indexEntities(deps.db, "artist", [a.id]);
    await audit(deps.db, {
      actorId: user.id,
      action: "artist.update",
      entityType: "artist",
      entityId: a.id,
      label: updated!.name,
    });
    return {
      id: updated!.id,
      name: updated!.name,
      slug: updated!.slug,
      imageUrl: updated!.imageUrl,
      verified: updated!.verified,
      followerCount: updated!.followerCount,
      trackCount: updated!.trackCount,
    };
  }),

  // ─── Люди, журнал, зведення ─────────────────────────────────────────────

  implement(endpoints.admin.users, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const term = query.q ? `%${query.q}%` : null;
    const rows = await deps.db
      .select()
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          term
            ? or(ilike(users.name, term), ilike(users.email, term), ilike(users.username, term))
            : undefined,
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    return {
      items: page.items.map((u) => ({
        ...toUserRef(u),
        email: u.email,
        role: (["user", "artist", "moderator", "admin"].includes(u.role) ? u.role : "user") as "user",
        banned: !!u.banned,
        createdAt: iso(u.createdAt),
      })),
      nextCursor: page.nextCursor,
    };
  }),

  implement(endpoints.admin.setUser, async ({ deps, user, params, body }) => {
    if (params.id === user.id)
      throw badRequest("cannot_change_self", "Свою роль чи блокування змінити не можна");
    const [target] = await deps.db.select({ id: users.id }).from(users).where(eq(users.id, params.id));
    if (!target) throw notFound("user");
    await deps.db.transaction(async (tx) => {
      if (body.role) await tx.update(users).set({ role: body.role }).where(eq(users.id, params.id));
      if (body.banned === true) await banUser(tx, params.id, body.banReason);
      if (body.premiumDays !== undefined) {
        if (body.premiumDays === 0) await revokePremium(tx, params.id);
        else await grantPremium(tx, params.id, body.premiumDays, "manual", user.id);
      }
      if (body.banned === false) {
        await tx.update(users).set({ banned: false, banReason: null }).where(eq(users.id, params.id));
        await indexEntities(tx, "user", [params.id]);
      }
      await audit(tx, {
        actorId: user.id,
        action: "user.update",
        entityType: "user",
        entityId: params.id,
        data: body,
      });
    });
  }),

  implement(endpoints.admin.audit, async ({ deps, query }) => {
    const offset = readOffset(query.cursor);
    const rows = await deps.db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.id))
      .limit(query.limit + 1)
      .offset(offset);
    const page = offsetPage(rows, offset, query.limit);
    const people = await loadUserRefs(
      deps.db,
      page.items.map((r) => r.actorId),
    );
    return {
      items: page.items.map((r) => ({
        id: r.id,
        actor: r.actorId ? (people.get(r.actorId) ?? null) : null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        label: r.label,
        createdAt: iso(r.createdAt),
      })),
      nextCursor: page.nextCursor,
    };
  }),

  implement(endpoints.admin.stats, async ({ deps }) => {
    const db = deps.db;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [[u], [t], [c], [a], [p], [s], [r], [b]] = await Promise.all([
      db.select({ n: count() }).from(users).where(isNull(users.deletedAt)),
      db
        .select({ n: count() })
        .from(tracks)
        .where(and(eq(tracks.status, "published"), eq(tracks.source, "catalog"))),
      db
        .select({ n: count() })
        .from(tracks)
        .where(and(eq(tracks.status, "published"), eq(tracks.source, "community"))),
      db.select({ n: count() }).from(artists).where(sql`${artists.trackCount} > 0`),
      db.select({ n: count() }).from(plays).where(gte(plays.playedAt, today)),
      db.select({ n: count() }).from(submissions).where(eq(submissions.status, "pending")),
      db.select({ n: count() }).from(reports).where(eq(reports.status, "open")),
      db.select({ n: count() }).from(bugReports).where(eq(bugReports.status, "open")),
    ]);
    return {
      users: u?.n ?? 0,
      tracks: t?.n ?? 0,
      communityTracks: c?.n ?? 0,
      artists: a?.n ?? 0,
      playsToday: p?.n ?? 0,
      pendingSubmissions: s?.n ?? 0,
      openReports: r?.n ?? 0,
      openBugReports: b?.n ?? 0,
    };
  }),
];
