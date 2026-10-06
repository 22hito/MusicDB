import { relations } from "drizzle-orm";
import { users } from "./auth";
import {
  artists,
  assets,
  genres,
  releaseArtists,
  releases,
  releaseTracks,
  trackArtists,
  trackGenres,
  tracks,
} from "./catalog";
import { playlistItems, playlists } from "./library";

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  primaryRelease: one(releases, { fields: [tracks.primaryReleaseId], references: [releases.id] }),
  audio: one(assets, { fields: [tracks.audioAssetId], references: [assets.id] }),
  uploader: one(users, { fields: [tracks.uploaderId], references: [users.id] }),
  artists: many(trackArtists),
  genres: many(trackGenres),
  releases: many(releaseTracks),
}));

export const trackArtistsRelations = relations(trackArtists, ({ one }) => ({
  track: one(tracks, { fields: [trackArtists.trackId], references: [tracks.id] }),
  artist: one(artists, { fields: [trackArtists.artistId], references: [artists.id] }),
}));

export const trackGenresRelations = relations(trackGenres, ({ one }) => ({
  track: one(tracks, { fields: [trackGenres.trackId], references: [tracks.id] }),
  genre: one(genres, { fields: [trackGenres.genreId], references: [genres.id] }),
}));

export const releasesRelations = relations(releases, ({ many }) => ({
  artists: many(releaseArtists),
  tracks: many(releaseTracks),
}));

export const releaseArtistsRelations = relations(releaseArtists, ({ one }) => ({
  release: one(releases, { fields: [releaseArtists.releaseId], references: [releases.id] }),
  artist: one(artists, { fields: [releaseArtists.artistId], references: [artists.id] }),
}));

export const releaseTracksRelations = relations(releaseTracks, ({ one }) => ({
  release: one(releases, { fields: [releaseTracks.releaseId], references: [releases.id] }),
  track: one(tracks, { fields: [releaseTracks.trackId], references: [tracks.id] }),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  tracks: many(trackArtists),
  releases: many(releaseArtists),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  owner: one(users, { fields: [playlists.ownerId], references: [users.id] }),
  items: many(playlistItems),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, { fields: [playlistItems.playlistId], references: [playlists.id] }),
  track: one(tracks, { fields: [playlistItems.trackId], references: [tracks.id] }),
}));
