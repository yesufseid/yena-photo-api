CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    registered_face BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(telegram_id),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    telegram_file_id TEXT NOT NULL,
    telegram_file_unique_id TEXT,
    faces_count INT DEFAULT 0,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    embedding vector(512) NOT NULL,
    bbox JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE face_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    embedding vector(512) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_photo_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    seen_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, photo_id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    new_photos_count INT DEFAULT 0,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_face_embeddings ON face_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_face_registrations ON face_registrations USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_photos_event ON photos(event_id);
CREATE INDEX idx_user_photo_views_user ON user_photo_views(user_id);
CREATE INDEX idx_events_code ON events(code);

CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    telegram_file_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_photos_user ON user_photos(user_id);
