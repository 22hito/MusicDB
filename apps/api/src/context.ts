import type { Database } from "@musicdb/db";
import type { Logger } from "pino";
import type { Auth } from "./auth";
import type { Env } from "./env";
import type { Jobs } from "./services/jobs";
import type { Realtime } from "./services/realtime";
import type { Storage } from "./services/storage";
import type { YoutubeResolver } from "./services/youtube";

export type Role = "user" | "artist" | "moderator" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: Role;
  sessionId: string;
};

/** Залежності застосунку — передаються явно (легко підміняти в тестах). */
export type Deps = {
  env: Env;
  db: Database;
  auth: Auth;
  storage: Storage;
  realtime: Realtime;
  youtube: YoutubeResolver;
  jobs: Jobs;
  log: Logger;
};

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
    requestId: string;
  };
};

export const isStaff = (user: SessionUser | null) => user?.role === "admin" || user?.role === "moderator";
