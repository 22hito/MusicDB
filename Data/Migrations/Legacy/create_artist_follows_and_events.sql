-- Підписка на артиста + журнал подій каталогу (додано/видалено пісню, додано текст).
-- Непрочитане — без фан-ауту: подія пишеться раз, "прочитано" — per-(user, artist) last_read_at.

CREATE TABLE IF NOT EXISTS lab.artist_follows (
    user_id      INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    artist_id    INTEGER NOT NULL REFERENCES lab.artists(id) ON DELETE CASCADE,
    followed_at  TIMESTAMP NOT NULL DEFAULT now(),
    last_read_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_artist_follows_user ON lab.artist_follows (user_id);

CREATE TABLE IF NOT EXISTS lab.artist_events (
    id         SERIAL PRIMARY KEY,
    artist_id  INTEGER NOT NULL REFERENCES lab.artists(id) ON DELETE CASCADE,
    music_id   INTEGER REFERENCES lab.music(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,   -- 'song_added' | 'song_removed' | 'lyrics_added'
    song_label TEXT NOT NULL,   -- "Артист — Назва", знімок на момент події (лишається читабельним навіть якщо пісню згодом видалено)
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artist_events_artist ON lab.artist_events (artist_id, created_at DESC);
