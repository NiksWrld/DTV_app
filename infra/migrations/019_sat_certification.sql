-- 019_sat_certification.sql: Sports Authority of Thailand (SAT) recognition for providers,
-- embassies that require it for Muay Thai, and a checklist item for those embassies.
-- dtv_certified (010) stays a separate, admin-only editorial flag. SAT is its own
-- evidence-backed certification with a review flow and an expiry date.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS sat_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sat_certificate_number TEXT,
  ADD COLUMN IF NOT EXISTS sat_valid_until DATE,
  ADD COLUMN IF NOT EXISTS sat_evidence_key TEXT,
  ADD COLUMN IF NOT EXISTS sat_evidence_filename TEXT,
  ADD COLUMN IF NOT EXISTS sat_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sat_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sat_review_note TEXT;

CREATE INDEX IF NOT EXISTS providers_sat_status_idx ON providers (sat_status);

ALTER TABLE embassies
  ADD COLUMN IF NOT EXISTS requires_sat_for_muay_thai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sat_note TEXT;

-- Reported requirement (Nov 2026). Embassy rules change, so admins can toggle this
-- per embassy under Admin > Settings. The seed file sets the same on fresh databases.
UPDATE embassies
SET requires_sat_for_muay_thai = true,
    sat_note = COALESCE(sat_note, 'Reported to require that Muay Thai camps are recognised by the Sports Authority of Thailand (SAT), with a letter or documents from SAT. Rules change, so check the embassy website before applying.')
WHERE (country = 'United States' AND city = 'Los Angeles')
   OR (country = 'Singapore' AND city = 'Singapore');

-- Added by the checklist generator only when the applicant's embassy requires SAT.
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, evidence_examples)
SELECT 'embassy_sat', 'muay_thai',
       'SAT recognition of your Muay Thai camp',
       'Your embassy asks for proof that the camp is recognised by the Sports Authority of Thailand (SAT). Ask the camp for its SAT certificate or a letter from SAT.',
       true, 61,
       '["pdf","jpg","png"]'::jsonb,
       '["SAT certificate of the camp", "Letter from the Sports Authority of Thailand"]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM checklist_templates WHERE visa_path = 'embassy_sat' AND subcategory = 'muay_thai'
);
