-- Профіль користувача, улюблені пісні, плейлисти, історія прослуховувань
-- (для ШІ-рекомендацій). Користувач ідентифікується за email.

CREATE TABLE IF NOT EXISTS lab.user_profiles (
    user_email   TEXT PRIMARY KEY,
    display_name TEXT,
    updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab.favorites (
    user_email TEXT NOT NULL,
    music_id   INTEGER NOT NULL REFERENCES lab.music(id) ON DELETE CASCADE,
    added_at   TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_email, music_id)
);

CREATE TABLE IF NOT EXISTS lab.playlists (
    id         SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    name       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab.playlist_songs (
    playlist_id INTEGER NOT NULL REFERENCES lab.playlists(id) ON DELETE CASCADE,
    music_id    INTEGER NOT NULL REFERENCES lab.music(id) ON DELETE CASCADE,
    added_at    TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (playlist_id, music_id)
);

CREATE TABLE IF NOT EXISTS lab.listening_history (
    id          SERIAL PRIMARY KEY,
    user_email  TEXT NOT NULL,
    music_id    INTEGER NOT NULL REFERENCES lab.music(id) ON DELETE CASCADE,
    listened_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_history_user ON lab.listening_history (user_email, listened_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON lab.playlists (user_email);
