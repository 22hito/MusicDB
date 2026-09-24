-- Нормалізація регістру жанрів у lab.genre: приводить назви до нижнього регістру
-- й об'єднує дублікати, що відрізняються лише регістром. Одруківки НЕ виправляє.
-- Виконувати ОДИН РАЗ, бажано з бекапом бази.

BEGIN;

-- 1. Визначаємо "канонічний" id (найменший) для кожної групи однакових після lower/trim жанрів.
WITH groups AS (
    SELECT
        id,
        LOWER(TRIM(genre)) AS normalized,
        MIN(id) OVER (PARTITION BY LOWER(TRIM(genre))) AS canonical_id
    FROM lab.genre
),
duplicates AS (
    SELECT id, canonical_id
    FROM groups
    WHERE id <> canonical_id
)
-- 2. Переносимо всі зв'язки music_genre з дубліката на канонічний жанр.
UPDATE lab.music_genre mg
SET genre_id = d.canonical_id
FROM duplicates d
WHERE mg.genre_id = d.id
  AND NOT EXISTS (
      SELECT 1 FROM lab.music_genre mg2
      WHERE mg2.music_id = mg.music_id AND mg2.genre_id = d.canonical_id
  );

-- 3. Видаляємо залишкові зв'язки з дублікатами.
DELETE FROM lab.music_genre mg
USING (
    SELECT id, MIN(id) OVER (PARTITION BY LOWER(TRIM(genre))) AS canonical_id
    FROM lab.genre
) d
WHERE mg.genre_id = d.id AND d.id <> d.canonical_id;

-- 4. Видаляємо самі жанри-дублікати.
DELETE FROM lab.genre g
USING (
    SELECT id, MIN(id) OVER (PARTITION BY LOWER(TRIM(genre))) AS canonical_id
    FROM lab.genre
) d
WHERE g.id = d.id AND d.id <> d.canonical_id;

-- 5. Приводимо назви жанрів, що лишились, до нижнього регістру.
UPDATE lab.genre SET genre = LOWER(TRIM(genre));

COMMIT;
