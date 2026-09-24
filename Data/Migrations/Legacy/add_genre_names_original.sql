-- Оригінальний (неперекладений) варіант жанрів заявки — щоб адмін бачив
-- і переклад, і введений текст.

ALTER TABLE lab.music_requests
    ADD COLUMN IF NOT EXISTS genre_names_original TEXT;
