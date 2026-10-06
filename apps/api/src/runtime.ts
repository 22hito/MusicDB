/** Збирання залежностей процесу — спільне для API-сервера й окремого воркера. */
import { createDb } from "@musicdb/db";
import pino from "pino";
import { createAuth } from "./auth";
import type { Deps } from "./context";
import type { Env } from "./env";
import { notifyNewTrack } from "./modules/moderation/routes";
import { processAudioAsset } from "./services/audio";
import { type JobHandlers, PgJobs } from "./services/jobs";
import { RealtimeHub } from "./services/realtime";
import { createStorage } from "./services/storage";
import { noYoutube, YoutubeDataApi } from "./services/youtube";

export function createRuntime(env: Env) {
  const log = pino({
    level: env.LOG_LEVEL,
    ...(env.isProd
      ? {}
      : { transport: { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } } }),
  });
  const { db, close } = createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
  const realtime = new RealtimeHub();
  const deps: Deps = {
    env,
    db,
    auth: createAuth(env, db),
    storage: createStorage(env),
    realtime,
    youtube: env.youtubeKeys.length ? new YoutubeDataApi(env.youtubeKeys) : noYoutube,
    jobs: new PgJobs(db),
    log,
  };
  return { deps, realtime, log, close };
}

export function jobHandlers(deps: Deps): JobHandlers {
  return {
    "audio.process": ({ assetId, reprocess }) => processAudioAsset(deps, assetId, { reprocess: !!reprocess }),
    "notify.new_track": ({ trackId }) => notifyNewTrack(deps, trackId),
  };
}
