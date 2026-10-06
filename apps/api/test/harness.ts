/**
 * Тестовий застосунок: справжній Postgres у пам'яті (PGlite) з продовими міграціями, справжній better-auth,
 * локальне сховище в тимчасовій теці, реалтайм і черга — записувачі подій.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  artists,
  genres,
  rebuildSearchIndex,
  recomputeCounters,
  releaseArtists,
  releases,
  releaseTracks,
  trackArtists,
  trackGenres,
  tracks,
  users,
} from "@musicdb/db";
import { createTestDb } from "@musicdb/db/testing";
import { eq } from "drizzle-orm";
import pino from "pino";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth";
import type { Deps } from "../src/context";
import { loadEnv } from "../src/env";
import { RecordingJobs } from "../src/services/jobs";
import { RecordingRealtime } from "../src/services/realtime";
import { LocalStorage } from "../src/services/storage";
import { noYoutube } from "../src/services/youtube";

export const ORIGIN = "http://localhost:3000";

export async function createTestApp(envOverrides: Record<string, string> = {}) {
  const { db, close } = await createTestDb();
  const env = loadEnv({
    NODE_ENV: "test",
    API_URL: "http://localhost",
    WEB_ORIGINS: ORIGIN,
    AUTH_SECRET: "test-secret-test-secret-test-secret-123",
    ADMIN_EMAILS: "admin@test.dev",
    LOG_LEVEL: "silent",
    ...envOverrides,
  });
  const realtime = new RecordingRealtime();
  const jobs = new RecordingJobs();
  const storage = new LocalStorage(mkdtempSync(join(tmpdir(), "nowl-test-")), env.API_URL, env.AUTH_SECRET);
  const deps: Deps = {
    env,
    db,
    auth: createAuth(env, db),
    storage,
    realtime,
    youtube: noYoutube,
    jobs,
    log: pino({ level: process.env.TEST_LOG ?? "silent" }),
  };
  const app = createApp(deps);

  async function request<T = unknown>(
    method: string,
    path: string,
    opts: { body?: unknown; cookie?: string; headers?: Record<string, string> } = {},
  ) {
    const res = await app.request(path, {
      method,
      headers: {
        origin: ORIGIN,
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(opts.cookie ? { cookie: opts.cookie } : {}),
        ...opts.headers,
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as T) : (undefined as T);
    return { status: res.status, body: json, headers: res.headers };
  }

  /** Реєстрація через email+пароль; повертає cookie сесії й id. */
  async function signUp(email: string, name = email.split("@")[0]!) {
    const res = await app.request("/v1/auth/sign-up/email", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password-123", name }),
    });
    if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    return { cookie, id: u!.id };
  }

  return { app, deps, db, close, realtime, jobs, storage, request, signUp };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;

/** Невеликий каталог: 3 виконавці, 2 релізи, 6 треків, 3 жанри. */
export async function seedCatalog(t: TestApp) {
  const db = t.db;
  const [lp, bmth, oe] = await db
    .insert(artists)
    .values([
      {
        name: "Linkin Park",
        slug: "linkin-park",
        normalizedName: "linkin park",
        imageUrl: "https://img/lp.jpg",
      },
      { name: "Bring Me The Horizon", slug: "bring-me-the-horizon", normalizedName: "bring me the horizon" },
      {
        name: "Океан Ельзи",
        slug: "okean-elzy",
        normalizedName: "океан ельзи",
        bio: { uk: "Український гурт" },
      },
    ])
    .returning();
  const [rock, metalcore, nu] = await db
    .insert(genres)
    .values([
      { name: "rock", slug: "rock" },
      { name: "metalcore", slug: "metalcore" },
      { name: "nu metal", slug: "nu-metal" },
    ])
    .returning();
  const [meteora, sempiternal] = await db
    .insert(releases)
    .values([
      { title: "Meteora", type: "album", releaseDate: "2003-03-25", coverUrl: "https://img/meteora.jpg" },
      { title: "Sempiternal", type: "album", releaseDate: "2013-04-01", coverUrl: "https://img/semp.jpg" },
    ])
    .returning();
  await db.insert(releaseArtists).values([
    { releaseId: meteora!.id, artistId: lp!.id },
    { releaseId: sempiternal!.id, artistId: bmth!.id },
  ]);
  const trackRows = await db
    .insert(tracks)
    .values([
      {
        title: "Numb",
        durationMs: 185_000,
        primaryReleaseId: meteora!.id,
        trackNumber: 13,
        youtubeVideoId: "kXYiU_JCYtU",
        releaseDate: "2003-03-25",
      },
      {
        title: "Faint",
        durationMs: 162_000,
        primaryReleaseId: meteora!.id,
        trackNumber: 7,
        youtubeVideoId: "LYU-8IFcDPw",
      },
      { title: "Somewhere I Belong", durationMs: 213_000, primaryReleaseId: meteora!.id, trackNumber: 3 },
      {
        title: "Shadow Moses",
        durationMs: 245_000,
        primaryReleaseId: sempiternal!.id,
        trackNumber: 6,
        youtubeVideoId: "-0rYxkUhcSQ",
      },
      {
        title: "Can You Feel My Heart",
        durationMs: 228_000,
        primaryReleaseId: sempiternal!.id,
        trackNumber: 1,
      },
      {
        title: "Обійми",
        durationMs: 240_000,
        youtubeVideoId: "abcdefghijk",
        lyrics: "Обійми мене",
        lyricsSynced: "[00:01.00]Обійми\n[00:03.50]мене",
      },
    ])
    .returning();
  const [numb, faint, somewhere, moses, heart, obiimy] = trackRows;
  await db.insert(trackArtists).values([
    { trackId: numb!.id, artistId: lp!.id },
    { trackId: faint!.id, artistId: lp!.id },
    { trackId: somewhere!.id, artistId: lp!.id },
    { trackId: moses!.id, artistId: bmth!.id },
    { trackId: heart!.id, artistId: bmth!.id },
    { trackId: obiimy!.id, artistId: oe!.id },
  ]);
  await db.insert(releaseTracks).values([
    { releaseId: meteora!.id, trackId: numb!.id, position: 13 },
    { releaseId: meteora!.id, trackId: faint!.id, position: 7 },
    { releaseId: meteora!.id, trackId: somewhere!.id, position: 3 },
    { releaseId: sempiternal!.id, trackId: moses!.id, position: 6 },
    { releaseId: sempiternal!.id, trackId: heart!.id, position: 1 },
  ]);
  await db.insert(trackGenres).values([
    { trackId: numb!.id, genreId: nu!.id },
    { trackId: numb!.id, genreId: rock!.id, position: 1 },
    { trackId: faint!.id, genreId: nu!.id },
    { trackId: somewhere!.id, genreId: nu!.id },
    { trackId: moses!.id, genreId: metalcore!.id },
    { trackId: heart!.id, genreId: metalcore!.id },
    { trackId: obiimy!.id, genreId: rock!.id },
  ]);
  await recomputeCounters(db);
  await rebuildSearchIndex(db);
  return {
    artists: { lp: lp!, bmth: bmth!, oe: oe! },
    genres: { rock: rock!, metalcore: metalcore!, nu: nu! },
    releases: { meteora: meteora!, sempiternal: sempiternal! },
    tracks: {
      numb: numb!,
      faint: faint!,
      somewhere: somewhere!,
      moses: moses!,
      heart: heart!,
      obiimy: obiimy!,
    },
  };
}
