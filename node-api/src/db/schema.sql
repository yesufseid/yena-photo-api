CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE cafes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    description TEXT,

    address TEXT,

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

    tags TEXT[] DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,

    platform TEXT NOT NULL,

    video_url TEXT NOT NULL,

    creator_name TEXT,

    thumbnail_url TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);