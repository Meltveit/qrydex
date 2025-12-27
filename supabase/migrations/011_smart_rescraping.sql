-- Add Smart Re-scraping columns
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS next_scrape_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scrape_count INTEGER DEFAULT 0;

-- Create index for efficient re-scraping queries
CREATE INDEX IF NOT EXISTS businesses_next_scrape_idx ON businesses(next_scrape_at) 
WHERE next_scrape_at IS NOT NULL;

-- Create index for high-priority businesses (high trust score)
CREATE INDEX IF NOT EXISTS businesses_rescrape_priority_idx ON businesses(trust_score DESC, next_scrape_at) 
WHERE next_scrape_at IS NOT NULL;

COMMENT ON COLUMN businesses.next_scrape_at IS 'When this business should be re-scraped next';
COMMENT ON COLUMN businesses.content_hash IS 'SHA-256 hash of website content to detect changes';
COMMENT ON COLUMN businesses.last_scraped_at IS 'Timestamp of last successful scrape';
COMMENT ON COLUMN businesses.scrape_count IS 'Total number of times this business has been scraped';
