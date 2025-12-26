-- Add translations column to businesses table for global support
-- Structure: { "en": { ... }, "fr": { ... }, "de": { ... }, "es": { ... } }

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Create an index for faster searching within translations
CREATE INDEX IF NOT EXISTS businesses_translations_gin_idx ON businesses USING GIN (translations);

-- Comment
COMMENT ON COLUMN businesses.translations IS 'Stores AI-generated translations for description, services, products in {lang: data} format.';
