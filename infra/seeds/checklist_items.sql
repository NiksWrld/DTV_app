-- Seed checklist templates for all 3 DTV paths

-- ==================== COMMON (all paths) ====================
INSERT INTO checklist_templates (visa_path, title, description, required, display_order, accepted_document_types, evidence_examples, freshness_window_days, min_validity_days) VALUES
('workcation', 'Valid passport', 'Passport or travel document valid for at least 6 months from intended travel date', true, 1,
 '["passport"]', '["Passport bio page scan"]', NULL, 180),
('workcation', 'Recent passport photograph', 'Recent photograph meeting Thai visa photo requirements', true, 2,
 '["photograph"]', '["White background, 4x6 cm, no glasses"]', 180, NULL),
('workcation', 'Evidence of current location', 'Proof of your current country of residence', true, 3,
 '["bank_statement", "utility_bill", "residence_certificate"]', '["Bank statement showing address", "Utility bill", "Residence certificate from embassy"]', 90, NULL),
('workcation', 'Financial evidence', 'Proof of funds — commonly 500,000 THB or equivalent', true, 4,
 '["bank_statement", "savings_account", "investment_proof"]', '["Bank statement showing 500,000+ THB balance", "Savings account certificate", "Investment portfolio statement"]', 30, NULL),
('workcation', 'Travel insurance', 'Travel insurance covering the stay period', false, 5,
 '["insurance_policy"]', '["Insurance certificate with coverage details"]', NULL, NULL),
('workcation', 'Flight itinerary', 'Confirmed or planned flight booking', false, 6,
 '["flight_confirmation"]', '["Flight booking confirmation", "Itinerary"]', NULL, NULL),
('workcation', 'Accommodation evidence', 'Proof of accommodation in Thailand', false, 7,
 '["hotel_booking", "rental_agreement"]', '["Hotel booking confirmation", "Condominium rental agreement"]', NULL, NULL);

-- ==================== WORKCATION SPECIFIC ====================
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, evidence_examples) VALUES
('workcation', NULL, 'Employment contract', 'Current employment contract showing remote work capability', false, 10,
 '["employment_contract"]', '["Signed employment contract", "Offer letter with remote work clause"]'),
('workcation', NULL, 'Employer certificate', 'Certificate from employer confirming employment and remote work arrangement', false, 11,
 '["employer_certificate"]', '["Letter from HR confirming remote work", "Employer certificate on company letterhead"]'),
('workcation', NULL, 'Freelancer portfolio', 'Portfolio or evidence of freelance/remote work income', false, 12,
 '["freelancer_portfolio", "income_statement"]', '["Client contracts", "Invoice history", "Platform earnings report (Upwork, Fiverr)"]'),
('workcation', NULL, 'Remote work evidence', 'Evidence that your work can be performed remotely', false, 13,
 '["remote_work_policy", "company_statement"]', '["Company remote work policy", "Email from employer confirming remote arrangement"]');

-- ==================== SOFT POWER ====================
INSERT INTO checklist_templates (visa_path, subcategory, title, description, required, display_order, accepted_document_types, evidence_examples) VALUES
('soft_power', NULL, 'Valid passport', 'Passport valid for at least 6 months', true, 1,
 '["passport"]', '["Passport bio page"]', NULL, 180),
('soft_power', NULL, 'Recent passport photograph', 'Recent photograph meeting requirements', true, 2,
 '["photograph"]', '["White background, 4x6 cm"]', 180, NULL),
('soft_power', NULL, 'Evidence of current location', 'Proof of current residence', true, 3,
 '["bank_statement", "utility_bill"]', '["Bank statement", "Utility bill"]', 90, NULL),
('soft_power', NULL, 'Financial evidence', 'Proof of funds — commonly 500,000 THB', true, 4,
 '["bank_statement", "savings_account"]', '["Bank statement showing 500,000+ THB"]', 30, NULL),
('soft_power', 'muay_thai', 'Muay Thai gym confirmation', 'Confirmation letter from a registered Muay Thai gym in Thailand', true, 20,
 '["gym_confirmation"]', '["Letter from gym confirming enrollment", "Training schedule", "Payment receipt"]'),
('soft_power', 'cooking', 'Cooking school confirmation', 'Confirmation from a Thai cooking school', true, 21,
 '["school_confirmation"]', '["Enrollment letter", "Course schedule", "Payment receipt"]'),
('soft_power', 'medical', 'Medical treatment confirmation', 'Confirmation from a Thai medical provider', true, 22,
 '["medical_confirmation"]', '["Letter from hospital/clinic", "Treatment plan", "Appointment confirmation"]'),
('soft_power', 'muay_thai', 'Muay Thai gym proof of registration', 'Proof the gym is registered/recognized', false, 23,
 '["registration_document"]', '["Gym registration certificate", "Sports authority recognition"]'),
('soft_power', 'cooking', 'Cooking school accreditation', 'Proof of school accreditation', false, 24,
 '["accreditation"]', '["School license", "Accreditation certificate"]');

-- ==================== DEPENDENT ====================
INSERT INTO checklist_templates (visa_path, title, description, required, display_order, accepted_document_types, evidence_examples) VALUES
('dependent', 'Valid passport', 'Passport valid for at least 6 months', true, 1,
 '["passport"]', '["Passport bio page"]'),
('dependent', 'Recent passport photograph', 'Recent photograph meeting requirements', true, 2,
 '["photograph"]', '["White background, 4x6 cm"]'),
('dependent', 'Evidence of current location', 'Proof of current residence', true, 3,
 '["bank_statement", "utility_bill"]', '["Bank statement", "Utility bill"]'),
('dependent', 'Relationship proof', 'Proof of relationship to the main DTV holder', true, 10,
 '["marriage_certificate", "birth_certificate", "family_registry"]', '["Marriage certificate", "Birth certificate for children", "Family registry document"]'),
('dependent', 'Main applicant DTV documentation', 'Copy of the main DTV holder''s visa documentation', true, 11,
 '["visa_copy", "passport_copy"]', '["Copy of main applicant''s DTV visa", "Copy of main applicant''s passport bio page"]'),
('dependent', 'Financial evidence (main applicant)', 'Proof that the main applicant meets financial requirements', true, 12,
 '["bank_statement", "savings_account"]', '["Main applicant''s bank statement showing 500,000+ THB"]', 30, NULL),
('dependent', 'Marriage certificate (spouse)', 'Official marriage certificate (if applying as spouse)', false, 13,
 '["marriage_certificate"]', '["Official marriage certificate", "Translation if not in English"]'),
('dependent', 'Birth certificate (child)', 'Official birth certificate (if applying as child)', false, 14,
 '["birth_certificate"]', '["Official birth certificate", "Translation if not in English"]');
