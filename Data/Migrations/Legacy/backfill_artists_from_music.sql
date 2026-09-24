-- Розбиває lab.music.artist (рядок через кому) на нормалізованих lab.artists +
-- зв'язки lab.music_artists. Ідемпотентний, можна повторювати. 

BEGIN;

INSERT INTO lab.artists (name, normalized_name)
SELECT DISTINCT ON (LOWER(TRIM(a.artist_name)))
       TRIM(a.artist_name), LOWER(TRIM(a.artist_name))
FROM lab.music m
CROSS JOIN LATERAL regexp_split_to_table(m.artist, '\s*,\s*') AS a(artist_name)
WHERE NOT EXISTS (SELECT 1 FROM lab.music_artists ma WHERE ma.music_id = m.id)
  AND TRIM(a.artist_name) <> ''
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO lab.music_artists (music_id, artist_id, position)
SELECT m.id, ar.id, (ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY a.ord) - 1)
FROM lab.music m
CROSS JOIN LATERAL regexp_split_to_table(m.artist, '\s*,\s*') WITH ORDINALITY AS a(artist_name, ord)
JOIN lab.artists ar ON ar.normalized_name = LOWER(TRIM(a.artist_name))
WHERE NOT EXISTS (SELECT 1 FROM lab.music_artists ma WHERE ma.music_id = m.id)
  AND TRIM(a.artist_name) <> '';

COMMIT;
