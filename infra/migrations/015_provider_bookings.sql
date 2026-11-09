-- 015_provider_bookings.sql: enrollment / DTV letter requests from applicants to providers

ALTER TABLE applicant_profiles
  ADD COLUMN IF NOT EXISTS passport_number TEXT;

CREATE TABLE IF NOT EXISTS provider_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES provider_packages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    message TEXT,
    preferred_start DATE,
    course_name TEXT,
    start_date DATE,
    end_date DATE,
    hours_per_week DOUBLE PRECISION,
    fees_paid DOUBLE PRECISION,
    currency TEXT NOT NULL DEFAULT 'THB',
    reference_code TEXT UNIQUE,
    letter_storage_key TEXT,
    letter_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    decline_reason TEXT,
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_bookings_provider_idx ON provider_bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS provider_bookings_user_idx ON provider_bookings (user_id);
