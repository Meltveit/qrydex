-- Add sitelinks column to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sitelinks JSONB;

-- Comment: Sitelinks structure will be:
-- [
--   { "title": "Contact", "url": "https://example.com/contact" },
--   { "title": "About Us", "url": "https://example.com/about" },
--   { "title": "Services", "url": "https://example.com/services" }
-- ]
