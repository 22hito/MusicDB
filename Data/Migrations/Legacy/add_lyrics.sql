-- Текст пісні — заповнюється вручну адміном, без сторонніх API.

ALTER TABLE lab.music
    ADD COLUMN IF NOT EXISTS lyrics TEXT;
