-- Ком'юніті-функції: головна таблиця_2 (пісні від користувачів), сповіщення
-- адмінів, особисті повідомлення, гілки обговорень, оцінки/рецензії пісень.
-- Ідемпотентний — можна запускати повторно.

-- ─── Головна таблиця_2 ─────────────────────────────────────────────────────
-- Та сама lab.music, а не окрема таблиця: улюблені, плейлисти, історія,
-- топ, рекомендації посилаються на music.id — так вони працюють для обох
-- таблиць без дублювання. source розрізняє, в якій таблиці показувати пісню.
ALTER TABLE lab.music ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalog'; -- 'catalog' | 'community'
ALTER TABLE lab.music ADD COLUMN IF NOT EXISTS submitted_by_user_id INTEGER REFERENCES lab.users(id) ON DELETE SET NULL;
-- Ім'я файлу в сховищі аудіо (див. AudioStorageService), не шлях і не URL.
ALTER TABLE lab.music ADD COLUMN IF NOT EXISTS audio_file TEXT;
CREATE INDEX IF NOT EXISTS idx_music_source ON lab.music (source);

ALTER TABLE lab.music_requests ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'catalog'; -- 'catalog' | 'community'
ALTER TABLE lab.music_requests ADD COLUMN IF NOT EXISTS requester_user_id INTEGER REFERENCES lab.users(id) ON DELETE SET NULL;
ALTER TABLE lab.music_requests ADD COLUMN IF NOT EXISTS audio_file TEXT;

-- ─── Сповіщення адмінів ────────────────────────────────────────────────────
-- Один рядок на подію для всіх адмінів (без фан-ауту); "прочитано" —
-- last_read_at на адміна, як і в artist_follows.
CREATE TABLE IF NOT EXISTS lab.admin_events (
    id            SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES lab.users(id) ON DELETE SET NULL,
    event_type    TEXT NOT NULL, -- 'request_submitted' | 'request_approved' | 'request_rejected' | 'song_added'
    label         TEXT NOT NULL, -- знімок "Артист — Назва"
    source        TEXT NOT NULL DEFAULT 'catalog',
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_events_created ON lab.admin_events (created_at DESC);

CREATE TABLE IF NOT EXISTS lab.admin_notification_reads (
    user_id      INTEGER PRIMARY KEY REFERENCES lab.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Особисті повідомлення ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab.direct_messages (
    id           SERIAL PRIMARY KEY,
    sender_id    INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    body         TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    read_at      TIMESTAMP,
    CONSTRAINT ck_direct_messages_not_self CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON lab.direct_messages (recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_dm_pair ON lab.direct_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);

-- ─── Гілки обговорень ком'юніті ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab.discussion_threads (
    id           SERIAL PRIMARY KEY,
    author_id    INTEGER REFERENCES lab.users(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    last_post_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_last_post ON lab.discussion_threads (last_post_at DESC);

CREATE TABLE IF NOT EXISTS lab.discussion_posts (
    id         SERIAL PRIMARY KEY,
    thread_id  INTEGER NOT NULL REFERENCES lab.discussion_threads(id) ON DELETE CASCADE,
    author_id  INTEGER REFERENCES lab.users(id) ON DELETE SET NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON lab.discussion_posts (thread_id, created_at);

-- ─── Оцінки й рецензії (0–100, тимчасова шкала) ───────────────────────────
CREATE TABLE IF NOT EXISTS lab.song_ratings (
    user_id    INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    music_id   INTEGER NOT NULL REFERENCES lab.music(id) ON DELETE CASCADE,
    score      SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    review     TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, music_id)
);
CREATE INDEX IF NOT EXISTS idx_song_ratings_music ON lab.song_ratings (music_id);

-- ─── Запити на листування ──────────────────────────────────────────────────
-- Друзі пишуть одне одному вільно. Не-другу перше повідомлення надходить як
-- запит; писати далі можна лише після схвалення. Один рядок на пару (як у
-- friend_requests): pair_low/pair_high + UNIQUE захищають від гонки.
CREATE TABLE IF NOT EXISTS lab.dm_requests (
    id            SERIAL PRIMARY KEY,
    requester_id  INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    addressee_id  INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined'
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    responded_at  TIMESTAMP,
    pair_low      INTEGER GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
    pair_high     INTEGER GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    CONSTRAINT ck_dm_requests_not_self CHECK (requester_id <> addressee_id),
    CONSTRAINT uq_dm_requests_pair UNIQUE (pair_low, pair_high)
);
CREATE INDEX IF NOT EXISTS idx_dm_requests_addressee ON lab.dm_requests (addressee_id, status);
