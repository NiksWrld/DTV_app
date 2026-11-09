-- 017_app_settings.sql: global app settings editable by admins

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Off by default: unclaimed providers stay fully visible until the partner programme is ready.
INSERT INTO app_settings (key, value) VALUES ('hide_unclaimed_contacts', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
