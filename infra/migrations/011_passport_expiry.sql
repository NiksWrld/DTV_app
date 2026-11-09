-- 011_passport_expiry.sql: passport expiry on the applicant profile

ALTER TABLE applicant_profiles
  ADD COLUMN IF NOT EXISTS passport_expiry DATE;
