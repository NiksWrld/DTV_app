-- 014_provider_views.sql: one view per viewer per provider per day, for partner outreach stats

CREATE TABLE IF NOT EXISTS provider_views (
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    viewer_key TEXT NOT NULL,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider_id, viewer_key, view_date)
);

CREATE INDEX IF NOT EXISTS provider_views_date_idx ON provider_views (provider_id, view_date);
