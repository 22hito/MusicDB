-- "Видалити чат у себе": розмова ховається лише для того, хто її видалив.
-- Зберігаємо межу — id останнього повідомлення на момент видалення: усе до
-- неї (включно) цьому користувачу більше не показується, нові повідомлення —
-- видно знову. Співрозмовник свою копію переписки зберігає.
-- Ідемпотентний — можна запускати повторно.
CREATE TABLE IF NOT EXISTS lab.dm_cleared (
    user_id          INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    other_user_id    INTEGER NOT NULL REFERENCES lab.users(id) ON DELETE CASCADE,
    cleared_up_to_id INTEGER NOT NULL,
    cleared_at       TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, other_user_id)
);
