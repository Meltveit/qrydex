-- Enhanced Business Data Fields
-- Adds fields required for Google rich snippets and Schema.org LocalBusiness markup

-- Add new columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS social_media JSONB,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS product_categories TEXT[],
ADD COLUMN IF NOT EXISTS geo_coordinates JSONB; -- {lat: number, lng: number}

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_geo_coordinates ON businesses USING GIN(geo_coordinates);
CREATE INDEX IF NOT EXISTS idx_opening_hours ON businesses USING GIN(opening_hours);
CREATE INDEX IF NOT EXISTS idx_social_media ON businesses USING GIN(social_media);
CREATE INDEX IF NOT EXISTS idx_product_categories ON businesses USING GIN(product_categories);

-- Add full-text search index for company description
CREATE INDEX IF NOT EXISTS idx_company_description_fts ON businesses USING GIN(to_tsvector('norwegian', COALESCE(company_description, '')));

-- Update the search vector trigger to include company description
CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('norwegian', 
    COALESCE(NEW.legal_name, '') || ' ' || 
    COALESCE(NEW.org_number, '') || ' ' ||
    COALESCE(NEW.domain, '') || ' ' ||
    COALESCE(NEW.registry_data->>'registered_address', '') || ' ' ||
    COALESCE(NEW.company_description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN businesses.logo_url IS 'URL to company logo, extracted from website';
COMMENT ON COLUMN businesses.opening_hours IS 'Business hours in structured format for Schema.org markup';
COMMENT ON COLUMN businesses.social_media IS 'Social media profiles: {linkedin, facebook, instagram, twitter}';
COMMENT ON COLUMN businesses.company_description IS 'Brief description of the company, extracted from website or meta tags';
COMMENT ON COLUMN businesses.product_categories IS 'Array of product/service categories';
COMMENT ON COLUMN businesses.geo_coordinates IS 'Geographical coordinates: {lat: number, lng: number}';

-- Example opening_hours JSONB format:
-- {
--   "monday": {"open": "09:00", "close": "17:00"},
--   "tuesday": {"open": "09:00", "close": "17:00"},
--   "wednesday": {"open": "09:00", "close": "17:00"},
--   "thursday": {"open": "09:00", "close": "17:00"},
--   "friday": {"open": "09:00", "close": "17:00"},
--   "saturday": null,
--   "sunday": null
-- }

-- Example social_media JSONB format:
-- {
--   "linkedin": "https://linkedin.com/company/example",
--   "facebook": "https://facebook.com/example",
--   "instagram": "https://instagram.com/example",
--   "twitter": "https://twitter.com/example"
-- }

-- Example geo_coordinates JSONB format:
-- {
--   "lat": 59.9139,
--   "lng": 10.7522
-- }
