-- Schema updates for crawler ecosystem
-- Run this in Supabase SQL Editor

-- Add new columns to businesses table
ALTER TABLE businesses 
  ADD COLUMN IF NOT EXISTS website_last_crawled TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS website_crawl_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_status VARCHAR(20) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS indexed_pages_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_change_detected TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crawl_priority INTEGER DEFAULT 50;

-- Create crawl queue table
CREATE TABLE IF NOT EXISTS crawl_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50), -- 'discover', 'index', 're-index', 'search'
  url TEXT,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 50,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create crawl logs table
CREATE TABLE IF NOT EXISTS crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name VARCHAR(50),
  action VARCHAR(100),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  url TEXT,
  details JSONB,
  success BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status_priority ON crawl_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_business ON crawl_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_bot_created ON crawl_logs(bot_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_crawl_priority ON businesses(crawl_priority DESC, website_last_crawled NULLS FIRST);

-- Enable RLS
ALTER TABLE crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read crawl_queue" ON crawl_queue FOR SELECT USING (true);
CREATE POLICY "Service write crawl_queue" ON crawl_queue FOR ALL USING (true);

CREATE POLICY "Public read crawl_logs" ON crawl_logs FOR SELECT USING (true);
CREATE POLICY "Service write crawl_logs" ON crawl_logs FOR ALL USING (true);
