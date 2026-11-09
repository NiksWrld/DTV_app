-- 018_dedupe_providers.sql: merge providers duplicated by repeated startup seeding,
-- then forbid duplicate names. Safe to re-run. No semicolons inside statements
-- (the API's startup runner splits files on them).

DROP TABLE IF EXISTS provider_dedupe_map;

-- Keep one row per lower(trim(name)): owned/claimed first, then approved or pending
-- claims, then verified, then the oldest.
CREATE TABLE provider_dedupe_map AS
WITH ranked AS (
    SELECT id, lower(trim(name)) AS name_key,
           row_number() OVER (
               PARTITION BY lower(trim(name))
               ORDER BY (owner_user_id IS NOT NULL) DESC,
                        (claim_status = 'approved') DESC,
                        (claim_status = 'pending') DESC,
                        (verification_status IN ('verified_docs_seen', 'featured')) DESC,
                        created_at, id
           ) AS rn
    FROM providers
)
SELECT d.id AS dup_id, k.id AS keep_id
FROM ranked d
JOIN ranked k ON k.name_key = d.name_key AND k.rn = 1
WHERE d.rn > 1;

-- Repoint everything that references a duplicate to the kept row.
UPDATE user_plan_items t SET provider_id = m.keep_id
FROM provider_dedupe_map m WHERE t.provider_id = m.dup_id;

UPDATE provider_packages t SET provider_id = m.keep_id
FROM provider_dedupe_map m WHERE t.provider_id = m.dup_id;

UPDATE provider_bookings t SET provider_id = m.keep_id
FROM provider_dedupe_map m WHERE t.provider_id = m.dup_id;

UPDATE provider_reviews t SET provider_id = m.keep_id
FROM provider_dedupe_map m WHERE t.provider_id = m.dup_id;

-- Views have a (provider, viewer, day) key, so copy them over and let the
-- duplicates' rows go with the cascade delete below.
INSERT INTO provider_views (provider_id, viewer_key, view_date, created_at)
SELECT m.keep_id, v.viewer_key, v.view_date, v.created_at
FROM provider_views v JOIN provider_dedupe_map m ON v.provider_id = m.dup_id
ON CONFLICT DO NOTHING;

-- Carry over an owner, contact details, or photos the kept row is missing.
UPDATE providers k SET
    owner_user_id = COALESCE(k.owner_user_id, d.owner_user_id),
    claim_status = CASE WHEN k.owner_user_id IS NULL AND d.owner_user_id IS NOT NULL THEN d.claim_status ELSE k.claim_status END,
    contact_email = COALESCE(k.contact_email, d.contact_email),
    contact_phone = COALESCE(k.contact_phone, d.contact_phone),
    image_url = COALESCE(k.image_url, d.image_url),
    photo_urls = CASE WHEN COALESCE(jsonb_array_length(k.photo_urls), 0) = 0 THEN d.photo_urls ELSE k.photo_urls END
FROM provider_dedupe_map m
JOIN providers d ON d.id = m.dup_id
WHERE k.id = m.keep_id;

DELETE FROM providers WHERE id IN (SELECT dup_id FROM provider_dedupe_map);

DROP TABLE IF EXISTS provider_dedupe_map;

CREATE UNIQUE INDEX IF NOT EXISTS providers_name_unique_idx ON providers (lower(trim(name)));
