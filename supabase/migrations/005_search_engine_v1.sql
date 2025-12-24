-- Search Engine Expansion v1
-- Covers: Search Analytics, Contextual Ads, and Crawler Queue Fixes

-- 1. Fix Crawler Queue (Missing details column)
ALTER TABLE crawl_queue 
ADD COLUMN IF NOT EXISTS details JSONB;

-- 2. Search Analytics Table
-- Stores user search intent for intelligence and "Zero Result" tracking
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  filters JSONB, -- { "country": "NO", "location": "Oslo" }
  results_count INTEGER, -- How many hits found
  clicked_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  session_id TEXT, -- Ephemeral session ID for flow tracking
  user_agent TEXT,
  ip_city TEXT, -- Approximate location
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Contextual Ad Campaigns
-- Simple keyword-based ad matching
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    keywords TEXT[], -- ['regnskap', 'lønn']
    target_locations TEXT[], -- ['Oslo', 'Viken']
    bid_amount DECIMAL(10, 2) DEFAULT 1.00,
    daily_budget DECIMAL(10, 2) DEFAULT 100.00,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, depleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ad Impressions/Clicks (for billing)
CREATE TABLE IF NOT EXISTS ad_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    event_type VARCHAR(20), -- 'impression', 'click'
    search_query TEXT,
    cost DECIMAL(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast analytics and ad matching
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_keywords ON ad_campaigns USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);

-- RLS Policies
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to insert analytics (logging searches)
CREATE POLICY "Public insert analytics" ON search_analytics FOR INSERT TO anon, authenticated, service_role USING (true);
CREATE POLICY "Service read analytics" ON search_analytics FOR SELECT TO service_role USING (true);

-- Ads are public read (to display them), service write (to manage)
CREATE POLICY "Public read ads" ON ad_campaigns FOR SELECT USING (true);
CREATE POLICY "Service write ads" ON ad_campaigns FOR ALL TO service_role USING (true);
