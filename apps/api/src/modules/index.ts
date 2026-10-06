import type { Implementation } from "../http/endpoint";
import { battleRoutes } from "./battle/routes";
import { catalogRoutes } from "./catalog/routes";
import { discoverRoutes } from "./discover/routes";
import { legacyRoutes } from "./legacy/routes";
import { libraryRoutes } from "./library/routes";
import { meRoutes } from "./me/routes";
import { moderationRoutes } from "./moderation/routes";
import { playlistRoutes } from "./playlists/routes";
import { premiumRoutes } from "./premium/routes";
import { ratingRoutes } from "./ratings/routes";
import { conversationRoutes } from "./social/conversations";
import { notificationRoutes, threadRoutes } from "./social/threads";
import { uploadRoutes } from "./uploads/routes";
import { userRoutes } from "./users/routes";

export const allRoutes: Implementation[] = [
  ...meRoutes,
  ...catalogRoutes,
  ...discoverRoutes,
  ...libraryRoutes,
  ...playlistRoutes,
  ...ratingRoutes,
  ...userRoutes,
  ...conversationRoutes,
  ...threadRoutes,
  ...notificationRoutes,
  ...uploadRoutes,
  ...moderationRoutes,
  ...legacyRoutes,
  ...premiumRoutes,
  ...battleRoutes,
];
