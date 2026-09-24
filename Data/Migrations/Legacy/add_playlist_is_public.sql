-- Публічний плейлист видно іншим користувачам на сторінці "Батл рояль".
-- За замовчуванням — приватний.

ALTER TABLE lab.playlists
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
