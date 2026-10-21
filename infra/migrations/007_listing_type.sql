-- 007_listing_type.sql: Distinguish DTV program providers from useful links / partners

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'dtv_program';

-- Coworking, insurance, visa advisory, relocation are partners / useful links
UPDATE providers
  SET listing_type = 'useful_link'
  WHERE category IN ('coworking', 'insurance', 'visa_advisory', 'relocation');
