-- Виправлення хибного об'єднання жанрів: "Alternative Rock" помилково
-- злилось з "alternative r&b" в "alternative pop" через нечітке порівняння.

UPDATE lab.genre
SET genre = 'Alternative Rock'
WHERE genre = 'alternative pop';
