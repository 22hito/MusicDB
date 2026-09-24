-- Власна аватарка користувача (URL), замінює фото з Google-акаунту.

ALTER TABLE lab.user_profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;
