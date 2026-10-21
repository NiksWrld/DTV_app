-- 006_providers_plan.sql: Provider enhancements + user plan

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS pricing JSONB,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE TABLE user_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    start_month INTEGER NOT NULL DEFAULT 1,
    duration_months INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Seed providers ────────────────────────────────────────────────────────────
INSERT INTO providers (name, category, cities_served, dtv_path_relevance, description, supports_dtv, verification_status, location, pricing, external_url) VALUES

('Fairtex Training Center',
 'muay_thai_gym',
 ARRAY['Bangkok'],
 ARRAY['soft_power'],
 'World-class Muay Thai training center in Bangkok with over 40 years of history. Offers structured 1–12 month programs with DTV-compliant enrollment letters and certification.',
 true, 'verified_docs_seen',
 'Bang Phli, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":15000},{"months":3,"price":40000},{"months":6,"price":70000},{"months":12,"price":120000}]}'::jsonb,
 'https://www.fairtexmuaythai.com'),

('Tiger Muay Thai',
 'muay_thai_gym',
 ARRAY['Phuket'],
 ARRAY['soft_power'],
 'One of Southeast Asia''s largest Muay Thai and MMA facilities. Located in Phuket, offering daily classes, accommodation packages and DTV-ready enrollment documentation.',
 true, 'verified_docs_seen',
 'Chalong, Phuket',
 '{"currency":"THB","tiers":[{"months":1,"price":18000},{"months":3,"price":48000},{"months":6,"price":82000},{"months":12,"price":150000}]}'::jsonb,
 'https://www.tigermuaythai.com'),

('Sitsongpeenong Muay Thai',
 'muay_thai_gym',
 ARRAY['Bangkok'],
 ARRAY['soft_power'],
 'Traditional Muay Thai gym training champions since 1960. Immersive training programs with authentic Thai boxing methodology. Full DTV program documentation provided.',
 true, 'listed',
 'Pattanakarn, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":12000},{"months":3,"price":32000},{"months":6,"price":58000},{"months":12,"price":100000}]}'::jsonb,
 'https://sitsongpeenong.com'),

('Blue Elephant Cooking School',
 'cooking_school',
 ARRAY['Bangkok'],
 ARRAY['soft_power'],
 'Award-winning Royal Thai cuisine cooking school in a 19th-century mansion. Offers structured 6–12 month culinary programs with professional certification and DTV enrollment letters.',
 true, 'verified_docs_seen',
 'Sathorn, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":25000},{"months":3,"price":65000},{"months":6,"price":110000},{"months":12,"price":190000}]}'::jsonb,
 'https://www.blueelephant.com/cooking-school'),

('Silom Thai Cooking School',
 'cooking_school',
 ARRAY['Bangkok','Chiang Mai'],
 ARRAY['soft_power'],
 'Friendly cooking school with locations in Bangkok and Chiang Mai. Offers flexible 1–12 month enrollment programs covering Thai street food, curries and regional cuisine.',
 true, 'listed',
 'Silom, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":14000},{"months":3,"price":36000},{"months":6,"price":62000},{"months":12,"price":108000}]}'::jsonb,
 'https://www.silomthaicooking.com'),

('Samitivej Hospital',
 'medical',
 ARRAY['Bangkok'],
 ARRAY['soft_power'],
 'International-standard private hospital with dedicated DTV medical visa support. Covers wellness programs, specialist treatment and long-stay medical care plans.',
 true, 'verified_docs_seen',
 'Sukhumvit, Bangkok',
 '{"currency":"THB","note":"Treatment-based pricing. Contact hospital for long-stay plan quote.","tiers":[]}'::jsonb,
 'https://www.samitivejhospitals.com'),

('HUBBA Coworking',
 'coworking',
 ARRAY['Bangkok'],
 ARRAY['workcation'],
 'Bangkok''s leading coworking community for entrepreneurs and remote workers. Flexible desks, private offices, fast internet and regular community events.',
 false, 'listed',
 'Ekkamai, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":4500},{"months":3,"price":12000},{"months":6,"price":22000},{"months":12,"price":40000}]}'::jsonb,
 'https://hubbathailand.com'),

('The Hive Coworking',
 'coworking',
 ARRAY['Bangkok'],
 ARRAY['workcation'],
 'Modern coworking spaces across Bangkok with 24/7 access, meeting rooms and a strong international community. Multiple locations in Ekkamai, Thonglor and Ratchada.',
 false, 'listed',
 'Thonglor, Bangkok',
 '{"currency":"THB","tiers":[{"months":1,"price":3900},{"months":3,"price":10500},{"months":6,"price":19000},{"months":12,"price":35000}]}'::jsonb,
 'https://thehive.co.th');
