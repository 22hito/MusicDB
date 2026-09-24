-- Скріншоти в баг-репортах: імена файлів у сховищі (R2 на проді / диск локально).
-- Самі файли віддає GET /api/bug-reports/{id}/screenshots/{index} (лише адмінам).
-- Ідемпотентний — можна запускати повторно.
ALTER TABLE lab.bug_reports ADD COLUMN IF NOT EXISTS screenshots TEXT[] NOT NULL DEFAULT '{}';
