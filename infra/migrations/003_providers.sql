-- 003_providers.sql

CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    cities_served TEXT[],
    dtv_path_relevance TEXT[],
    description TEXT,
    documents_they_issue TEXT[],
    supports_dtv BOOLEAN NOT NULL DEFAULT false,
    verification_status TEXT NOT NULL DEFAULT 'unreviewed',
    affiliate_type TEXT,
    lead_capture_settings JSONB,
    external_url TEXT,
    admin_evidence_attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
