-- Нормалізовані виконавці + зв'язок many-to-many з піснями.
-- lab.music.artist лишається вільним текстом (джерело правди для показу);
-- це похідна нормалізація — кожен виконавець зі списку через кому отримує
-- сторінку з повною дискографією. normalized_name = lower(trim(name)).

CREATE TABLE IF NOT EXISTS lab.artists (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    bio             TEXT,
    image_url       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_artists_normalized_name ON lab.artists (normalized_name);

CREATE TABLE IF NOT EXISTS lab.music_artists (
    music_id  INTEGER NOT NULL REFERENCES lab.music(id) ON DELETE CASCADE,
    artist_id INTEGER NOT NULL REFERENCES lab.artists(id) ON DELETE CASCADE,
    position  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (music_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_music_artists_artist ON lab.music_artists (artist_id);
