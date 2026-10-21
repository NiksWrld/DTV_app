-- Seed provider directory (sample data)

INSERT INTO providers (name, category, cities_served, dtv_path_relevance, description, documents_they_issue, supports_dtv, verification_status, external_url) VALUES
('Sitmonchai Gym', 'muay_thai_gym', ARRAY['Bangkok', 'Kanchanaburi']::TEXT[], ARRAY['soft_power']::TEXT[],
 'Traditional Muay Thai gym offering training programs for foreigners. DTV-friendly enrollment packages available.',
 ARRAY['Training confirmation letter', 'Enrollment certificate']::TEXT[], true, 'listed', 'https://sitmonchai.com'),

('Rattachai Muay Thai', 'muay_thai_gym', ARRAY['Bangkok', 'Phuket']::TEXT[], ARRAY['soft_power']::TEXT[],
 'Modern Muay Thai training facility with dedicated DTV applicant programs.',
 ARRAY['Training confirmation', 'Course completion certificate']::TEXT[], true, 'listed', 'https://rattachaimuaythai.com'),

('Blue Elephant Cooking School', 'cooking_school', ARRAY['Bangkok', 'Phuket']::TEXT[], ARRAY['soft_power']::TEXT[],
 'Premier Thai cooking school offering certified courses. DTV-friendly program packages available.',
 ARRAY['Enrollment confirmation', 'Course certificate']::TEXT[], true, 'listed', 'https://blueelephant.com/cooking-school'),

('Bangkok Hospital', 'medical', ARRAY['Bangkok']::TEXT[], ARRAY['soft_power']::TEXT[],
 'JCI-accredited hospital offering medical treatment programs for DTV applicants.',
 ARRAY['Treatment confirmation', 'Medical appointment letter']::TEXT[], true, 'verified_docs_seen', 'https://bangkokhospital.com'),

('Bumrungrad International Hospital', 'medical', ARRAY['Bangkok']::TEXT[], ARRAY['soft_power']::TEXT[],
 'World-class medical facility with dedicated international patient department.',
 ARRAY['Treatment plan', 'Appointment confirmation']::TEXT[], true, 'verified_docs_seen', 'https://bumrungrad.com'),

('Visa Thailand Help', 'visa_advisory', ARRAY['Bangkok', 'Phuket', 'Chiang Mai']::TEXT[], ARRAY['workcation', 'soft_power', 'dependent']::TEXT[],
 'Visa advisory service specializing in DTV applications and document preparation.',
 ARRAY['Document review', 'Application guidance']::TEXT[], true, 'listed', 'https://visathailandhelp.com'),

('Hubba Coworking', 'coworking', ARRAY['Bangkok']::TEXT[], ARRAY['workcation']::TEXT[],
 'Premium coworking spaces across Bangkok with DTV-friendly membership options.',
 ARRAY['Membership confirmation']::TEXT[], false, 'listed', 'https://hubbacoworking.com'),

('Pacific Cross Insurance', 'insurance', ARRAY['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya']::TEXT[], ARRAY['workcation', 'soft_power', 'dependent']::TEXT[],
 'Travel and health insurance provider with DTV-compliant coverage options.',
 ARRAY['Insurance policy certificate']::TEXT[], true, 'listed', 'https://pacificcross.co.th'),

('Siam Legal International', 'visa_advisory', ARRAY['Bangkok']::TEXT[], ARRAY['workcation', 'soft_power', 'dependent']::TEXT[],
 'Full-service law firm handling visa and legal matters for expats in Thailand.',
 ARRAY['Legal documentation', 'Visa application support']::TEXT[], true, 'verified_docs_seen', 'https://siam-legal.com'),

('Thai Visa Centre', 'visa_advisory', ARRAY['Bangkok', 'Chiang Mai']::TEXT[], ARRAY['workcation', 'soft_power', 'dependent']::TEXT[],
 'Dedicated DTV application support service with document checklist review.',
 ARRAY['Document checklist review', 'Application support']::TEXT[], true, 'listed', 'https://thaivisacentre.com');
