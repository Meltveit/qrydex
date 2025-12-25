-- Protocol: Bot B (Pulse Aggregator) Storage
-- Table for logging anonymized search queries for trend analysis

CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT,
    filters JSONB,
    location_country TEXT, -- e.g. 'NO', derived from IP
    location_region TEXT,  -- e.g. 'Oslo'
    result_count INTEGER,
    anonymized_session_id TEXT, -- Hash of session/IP for uniqueness estimation without PII
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast trend analysis
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_location ON search_logs(location_country);

-- RLS: Only service role should read/write logs (analytics are internal)
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can all search_logs"
    ON search_logs
    USING ( auth.role() = 'service_role' )
    WITH CHECK ( auth.role() = 'service_role' );
