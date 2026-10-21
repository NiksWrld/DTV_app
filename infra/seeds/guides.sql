-- Seed guide content

INSERT INTO guides (content_type, title, slug, body, tags, related_paths, published) VALUES
('guide', 'What is the Destination Thailand Visa (DTV)?', 'what-is-dtv',
 E'# What is the Destination Thailand Visa (DTV)?\n\nThe Destination Thailand Visa (DTV) is a long-term visa introduced by the Royal Thai Government to attract remote workers, digital nomads, and individuals interested in Thai culture and activities.\n\n## Key Features\n- Valid for up to 5 years\n- Multiple entries\n- Stay up to 180 days per entry (extendable)\n- Available for: Workcation, Thai Soft Power, and Dependent categories\n\n## Important\nDTV Workspace is a preparation tool. Final applications are submitted through the official Thai e-Visa website.',
 ARRAY['overview', 'introduction', 'basics'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('guide', 'Workcation vs Soft Power vs Dependent', 'path-comparison',
 E'# Workcation vs Soft Power vs Dependent\n\n## Workcation\nFor remote workers, freelancers, and employees who want to work from Thailand.\n- Requires proof of remote work capability\n- Financial evidence of 500,000+ THB\n- Employment contract or freelance portfolio\n\n## Thai Soft Power\nFor individuals pursuing Thai cultural activities.\n- Muay Thai training\n- Thai cooking courses\n- Medical treatment\n- Requires activity confirmation from a Thai provider\n\n## Dependent\nFor spouses and children of DTV holders.\n- Requires relationship proof\n- Tied to main applicant''s visa status\n- Financial evidence from main applicant',
 ARRAY['comparison', 'paths', 'choosing'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('faq', 'What documents do I need for a DTV application?', 'required-documents-faq',
 E'Common documents across all DTV paths:\n\n1. Passport valid for at least 6 months\n2. Recent passport photograph\n3. Evidence of current location\n4. Financial evidence (500,000+ THB)\n\nAdditional documents depend on your chosen path. Use the checklist feature in DTV Workspace to get a personalized list.',
 ARRAY['documents', 'requirements', 'faq'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('faq', 'How much money do I need to show for DTV?', 'financial-requirement-faq',
 E'The commonly cited financial requirement is 500,000 THB (approximately $14,000 USD / €13,000 EUR). This can be in:\n- Bank savings account\n- Fixed deposit\n- Investment portfolio\n- Combination of accounts\n\nSome embassies may have specific requirements about how long the funds must be held. Check with your specific embassy for details.',
 ARRAY['financial', 'money', 'requirements', 'faq'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('faq', 'Can I apply for DTV from my home country?', 'where-to-apply-faq',
 E'DTV applications are submitted through the Thai e-Visa system. You typically apply through the Royal Thai Embassy or Consulate-General in your country of residence or nationality.\n\nSome applicants may be able to apply from a country where they have legal residence status. Check the specific embassy website for eligibility.',
 ARRAY['application', 'embassy', 'where', 'faq'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('common_mistake', 'Passport validity miscalculation', 'passport-validity-mistake',
 E'# Common Mistake: Passport Validity\n\nMany applicants miscalculate the 6-month validity requirement.\n\n**The rule:** Your passport must be valid for at least 6 months from your intended date of travel to Thailand, not from your application date.\n\n**Example:** If you plan to travel on December 1st, your passport must be valid until at least June 1st of the following year.\n\n**Tip:** Check your passport expiry date early. Renewing a passport can take 4-8 weeks in many countries.',
 ARRAY['passport', 'validity', 'common-mistake'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('common_mistake', 'Bank statement freshness', 'bank-statement-freshness',
 E'# Common Mistake: Outdated Bank Statements\n\nEmbassies typically require financial documents issued within the last 30 days.\n\n**Don''t:** Submit a bank statement that is 2-3 months old\n**Do:** Request a fresh statement from your bank close to your application date\n\nMost banks can issue an official statement on demand or you can download a recent PDF from online banking.',
 ARRAY['financial', 'bank-statement', 'freshness', 'common-mistake'], ARRAY['workcation', 'soft_power', 'dependent'], true),

('embassy_note', 'Embassy-specific requirements may apply', 'embassy-variations',
 E'# Important: Embassy-Specific Requirements\n\nDTV requirements can vary by embassy or consulate. Some known variations include:\n\n- Some embassies require additional supporting documents from your employer\n- Financial evidence requirements may differ (some accept joint accounts, others don''t)\n- Document translation requirements vary by post\n- Some embassies have specific photo specifications\n\n**Always check your specific embassy''s website for the most current requirements.** DTV Workspace includes embassy-specific overrides where known, but official sources take precedence.',
 ARRAY['embassy', 'variations', 'requirements'], ARRAY['workcation', 'soft_power', 'dependent'], true);
