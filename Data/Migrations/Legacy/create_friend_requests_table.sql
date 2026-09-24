-- Запити на дружбу. Дружба симетрична: status='accepted' означає requester і
-- addressee — друзі. pair_low/pair_high (LEAST/GREATEST) + UNIQUE гарантують
-- на рівні БД не більше одного рядка між двома юзерами (захист від гонки).

CREATE TABLE IF NOT EXISTS lab.friend_requests (
    id            SERIAL PRIMARY KEY,
    requester_id  INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    addressee_id  INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' (rejected/canceled = рядок видаляється)
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    responded_at  TIMESTAMP,
    pair_low      INTEGER GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
    pair_high     INTEGER GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    CONSTRAINT ck_friend_requests_not_self CHECK (requester_id <> addressee_id),
    CONSTRAINT uq_friend_requests_pair UNIQUE (pair_low, pair_high)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_addressee ON lab.friend_requests (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON lab.friend_requests (requester_id, status);
