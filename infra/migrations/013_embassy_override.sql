-- 013_embassy_override.sql: remember when the applicant picked a post by hand

ALTER TABLE applicant_profiles
  ADD COLUMN IF NOT EXISTS embassy_overridden BOOLEAN NOT NULL DEFAULT false;
