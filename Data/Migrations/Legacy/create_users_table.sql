-- Канонічний реєстр користувачів — дає стабільний opaque integer id для
-- дружніх запитів / підписок на артистів (email назовні не світиться).
-- Апсертиться при кожному логіні (Program.cs, OnTicketReceived), тож завжди
-- має свіже імʼя/фото, на відміну від спарс lab.user_profiles.

CREATE TABLE IF NOT EXISTS lab.users (
    id             SERIAL PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    google_name    TEXT,
    google_picture TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMP
);
