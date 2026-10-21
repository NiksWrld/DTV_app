-- 005_checklist_seed.sql: DTV checklist template seed data

-- ─────────────────────────────────────────────────────────────────────────────
-- WORKCATION path
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, min_validity_days, min_balance_amount, freshness_window_days) VALUES

('workcation', NULL, 'Valid Passport',
 'Passport must be valid for at least 6 months beyond your intended stay. Must have at least 2 blank visa pages.',
 true, 10,
 '["passport"]', 180, NULL, NULL),

('workcation', NULL, 'Passport-Size Photos',
 '2 photos, 35×45 mm, white background, taken within the last 6 months.',
 true, 20,
 '["photo"]', NULL, NULL, 180),

('workcation', NULL, 'DTV Application Form (TM.87)',
 'Completed and signed Thai visa application form TM.87. Available at the embassy or online.',
 true, 30,
 '["pdf"]', NULL, NULL, NULL),

('workcation', NULL, 'Travel / Health Insurance',
 'Insurance covering the full intended stay in Thailand, minimum coverage of 40,000 THB (approx. $1,100).',
 true, 40,
 '["pdf","jpg","png"]', NULL, NULL, 90),

('workcation', NULL, 'Bank Statements (6 months)',
 'Official bank statements covering the last 6 months showing sufficient funds. Minimum balance equivalent to 500,000 THB (~$14,000) recommended.',
 true, 50,
 '["pdf"]', NULL, '500000', 90),

('workcation', NULL, 'Proof of Remote Employment or Freelance Work',
 'Employment contract, letter from employer confirming remote work arrangement, or freelance contracts/invoices. Must demonstrate ability to work remotely.',
 true, 60,
 '["pdf","jpg","png"]', NULL, NULL, 180),

('workcation', NULL, 'Proof of Income',
 'Recent payslips (last 3 months) or tax returns/income declaration for freelancers. Shows stable income to sustain stay.',
 true, 70,
 '["pdf"]', NULL, NULL, 90),

('workcation', NULL, 'Accommodation Proof',
 'Hotel booking, rental agreement, or invitation letter from host. Required for initial entry — temporary booking acceptable.',
 false, 80,
 '["pdf","jpg","png"]', NULL, NULL, 90),

('workcation', NULL, 'Visa Fee Payment',
 'DTV visa fee: 10,000 THB (approx. $275). Payable at the embassy — check embassy website for accepted payment methods.',
 true, 90,
 NULL, NULL, NULL, NULL),

('workcation', NULL, 'Return or Onward Flight Ticket',
 'Some embassies require proof of onward travel. A flexible or refundable ticket is acceptable.',
 false, 100,
 '["pdf","jpg","png"]', NULL, NULL, 90);

-- ─────────────────────────────────────────────────────────────────────────────
-- SOFT POWER path — shared items
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, min_validity_days, min_balance_amount, freshness_window_days) VALUES

('soft_power', NULL, 'Valid Passport',
 'Passport must be valid for at least 6 months beyond your intended stay. Must have at least 2 blank visa pages.',
 true, 10,
 '["passport"]', 180, NULL, NULL),

('soft_power', NULL, 'Passport-Size Photos',
 '2 photos, 35×45 mm, white background, taken within the last 6 months.',
 true, 20,
 '["photo"]', NULL, NULL, 180),

('soft_power', NULL, 'DTV Application Form (TM.87)',
 'Completed and signed Thai visa application form TM.87.',
 true, 30,
 '["pdf"]', NULL, NULL, NULL),

('soft_power', NULL, 'Travel / Health Insurance',
 'Insurance covering the full intended stay, minimum 40,000 THB coverage.',
 true, 40,
 '["pdf","jpg","png"]', NULL, NULL, 90),

('soft_power', NULL, 'Bank Statements (3 months)',
 'Bank statements for the last 3 months showing sufficient funds to cover your stay.',
 true, 50,
 '["pdf"]', NULL, '200000', 90),

('soft_power', NULL, 'Enrollment Letter from Provider',
 'Official letter from your Thai program provider confirming enrollment in a minimum 6-month program. Must include program name, start date, duration, and fees.',
 true, 60,
 '["pdf"]', NULL, NULL, 180),

('soft_power', NULL, 'Program Schedule / Curriculum',
 'Detailed schedule or curriculum showing the program spans at least 6 months. Required to demonstrate DTV eligibility.',
 true, 70,
 '["pdf","jpg","png"]', NULL, NULL, NULL),

('soft_power', NULL, 'Proof of Tuition Payment',
 'Receipt or confirmation of tuition / program fee payment.',
 false, 80,
 '["pdf","jpg","png"]', NULL, NULL, NULL),

('soft_power', NULL, 'Visa Fee Payment',
 'DTV visa fee: 10,000 THB. Check embassy website for payment method.',
 true, 90,
 NULL, NULL, NULL, NULL);

-- Muay Thai specific
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types) VALUES
('soft_power', 'muay_thai', 'Muay Thai Gym Accreditation',
 'Documentation showing the gym is recognized / registered with the Sports Authority of Thailand (SAT) or a similar body. Strengthens your application significantly.',
 false, 95,
 '["pdf","jpg","png"]');

-- Cooking specific
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types) VALUES
('soft_power', 'cooking', 'Cooking School Accreditation',
 'Certificate or registration showing the cooking school operates a recognized culinary program.',
 false, 95,
 '["pdf","jpg","png"]');

-- Medical specific
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, freshness_window_days) VALUES
('soft_power', 'medical', 'Medical Treatment Plan',
 'Official letter from a Thai hospital or clinic detailing the medical treatment plan, expected duration, and treating physician.',
 true, 95,
 '["pdf"]', 90),
('soft_power', 'medical', 'Medical Records / Referral Letter',
 'Home-country medical records or referral letter explaining the reason for seeking treatment in Thailand.',
 false, 96,
 '["pdf"]', NULL);

-- Seminar specific
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types) VALUES
('soft_power', 'seminar', 'Seminar / Workshop Programme',
 'Official program brochure or schedule showing the seminar or workshop covers a minimum 6-month engagement.',
 true, 95,
 '["pdf","jpg","png"]');

-- ─────────────────────────────────────────────────────────────────────────────
-- DEPENDENT path
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, min_validity_days) VALUES

('dependent', NULL, 'Valid Passport',
 'Passport valid for at least 6 months, with at least 2 blank visa pages.',
 true, 10,
 '["passport"]', 180),

('dependent', NULL, 'Passport-Size Photos',
 '2 photos, 35×45 mm, white background, taken within the last 6 months.',
 true, 20,
 '["photo"]', NULL),

('dependent', NULL, 'DTV Application Form (TM.87)',
 'Completed and signed Thai visa application form for the dependent applicant.',
 true, 30,
 '["pdf"]', NULL),

('dependent', NULL, 'Principal DTV Holder — Visa Copy',
 'Copy of the principal applicant''s DTV visa or approval letter. Your application is linked to theirs.',
 true, 40,
 '["pdf","jpg","png"]', NULL),

('dependent', NULL, 'Proof of Relationship',
 'Marriage certificate (for spouse) or birth certificate (for child). Must be an officially translated and/or apostilled copy if not in Thai or English.',
 true, 50,
 '["pdf","jpg","png"]', NULL),

('dependent', NULL, 'Travel / Health Insurance',
 'Insurance covering the full stay, minimum 40,000 THB coverage.',
 true, 60,
 '["pdf","jpg","png"]', NULL),

('dependent', NULL, 'Visa Fee Payment',
 'DTV dependent visa fee: 10,000 THB per applicant.',
 true, 70,
 NULL, NULL);
