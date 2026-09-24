-- Текст пісні на етапі заявки — переноситься на пісню при підтвердженні. 

ALTER TABLE lab.music_requests
    ADD COLUMN IF NOT EXISTS lyrics TEXT;
