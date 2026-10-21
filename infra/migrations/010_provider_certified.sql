-- 010_provider_certified.sql: DTV certification flag for providers

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS dtv_certified BOOLEAN NOT NULL DEFAULT false;
