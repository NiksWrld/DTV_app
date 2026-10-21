-- 001_initial.sql: Users, profiles, embassies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applicant_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    nationality TEXT NOT NULL,
    current_country TEXT NOT NULL,
    current_city TEXT,
    intended_path TEXT NOT NULL,
    has_dependents BOOLEAN NOT NULL DEFAULT false,
    preferred_embassy_id UUID,
    intended_stay_duration TEXT,
    soft_power_interest TEXT,
    employment_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE embassies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    name TEXT NOT NULL,
    website_url TEXT,
    notes TEXT,
    UNIQUE(country, city)
);
