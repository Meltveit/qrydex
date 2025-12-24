-- Add details column to crawl_queue for flexible job parameters
ALTER TABLE crawl_queue 
ADD COLUMN IF NOT EXISTS details JSONB;
