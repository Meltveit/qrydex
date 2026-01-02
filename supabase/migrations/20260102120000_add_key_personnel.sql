-- Add key_personnel JSONB column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS key_personnel JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN businesses.key_personnel IS 'List of key personnel (CEO, Directors) extracted from website';
