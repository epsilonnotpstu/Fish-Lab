-- Store the lab coordinates as text so they can be edited in the generic
-- settings form; existing NULLs become empty strings.
ALTER TABLE "SiteSettings"
  ALTER COLUMN "labLat" TYPE TEXT USING COALESCE("labLat"::text, ''),
  ALTER COLUMN "labLng" TYPE TEXT USING COALESCE("labLng"::text, '');

UPDATE "SiteSettings" SET "labLat" = COALESCE("labLat", ''), "labLng" = COALESCE("labLng", '');

ALTER TABLE "SiteSettings"
  ALTER COLUMN "labLat" SET DEFAULT '',
  ALTER COLUMN "labLat" SET NOT NULL,
  ALTER COLUMN "labLng" SET DEFAULT '',
  ALTER COLUMN "labLng" SET NOT NULL;
