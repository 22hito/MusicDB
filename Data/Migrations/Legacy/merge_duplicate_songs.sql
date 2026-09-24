-- Об'єднання наявних дублікатів пісень у lab.music (виконавець + назва
-- збігаються без урахування регістру/пробілів) у канонічний (найменший id) запис.
-- Перед запуском рекомендується бекап бази.

BEGIN;

WITH groups AS (
    SELECT
        id,
        MIN(id) OVER (PARTITION BY LOWER(TRIM(artist)), LOWER(TRIM(title))) AS canonical_id
    FROM lab.music
),
duplicates AS (
    SELECT id, canonical_id FROM groups WHERE id <> canonical_id
)
-- Переносимо жанрові зв'язки дубліката на канонічний запис.
UPDATE lab.music_genre mg
SET music_id = d.canonical_id
FROM duplicates d
WHERE mg.music_id = d.id
  AND NOT EXISTS (
      SELECT 1 FROM lab.music_genre mg2
      WHERE mg2.music_id = d.canonical_id AND mg2.genre_id = mg.genre_id
  );

-- Видаляємо залишкові зв'язки дублікатів.
DELETE FROM lab.music_genre mg
USING (
    SELECT id, MIN(id) OVER (PARTITION BY LOWER(TRIM(artist)), LOWER(TRIM(title))) AS canonical_id
    FROM lab.music
) d
WHERE mg.music_id = d.id AND d.id <> d.canonical_id;

-- Видаляємо самі рядки-дублікати з lab.music.
DELETE FROM lab.music m
USING (
    SELECT id, MIN(id) OVER (PARTITION BY LOWER(TRIM(artist)), LOWER(TRIM(title))) AS canonical_id
    FROM lab.music
) d
WHERE m.id = d.id AND d.id <> d.canonical_id;

COMMIT;
