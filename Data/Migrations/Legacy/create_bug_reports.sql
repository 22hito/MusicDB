-- Баг-репорти від користувачів (кнопка "Повідомити про баг" у меню профілю).
-- Ідемпотентний — можна запускати повторно.
CREATE TABLE IF NOT EXISTS lab.bug_reports (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES lab.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    -- Технічний контекст, який браузер додає сам (сторінка, пісня, розмір вікна,
    -- User-Agent) — лише якщо користувач не зняв галочку.
    context     TEXT,
    status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'resolved'
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES lab.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON lab.bug_reports (status, created_at DESC);
