-- Qrydex Database Schema
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  org_number VARCHAR(50) UNIQUE NOT NULL,
  legal_name TEXT NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  domain VARCHAR(255),
  
  -- Registry Verification Data (JSONB for flexibility)
  registry_data JSONB DEFAULT '{}'::jsonb,
  
  -- AI Quality Analysis (JSONB)
  quality_analysis JSONB DEFAULT '{}'::jsonb,
  
  -- News Signals (JSONB array)
  news_signals JSONB DEFAULT '[]'::jsonb,
  
  -- Trust Score (0-100)
  trust_score INTEGER DEFAULT 0,
  trust_score_breakdown JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  verification_status VARCHAR(20) DEFAULT 'pending',
  
  -- Search optimization
  search_vector TSVECTOR
);

-- Verification logs table
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  verification_type VARCHAR(50),
  status VARCHAR(20),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium verifications table
CREATE TABLE premium_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  verification_type VARCHAR(100),
  status VARCHAR(20),
  verified_date DATE,
  expiry_date DATE,
  certificate_document_url TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_number ON businesses(org_number);
CREATE INDEX idx_country ON businesses(country_code);
CREATE INDEX idx_domain ON businesses(domain);
CREATE INDEX idx_trust_score ON businesses(trust_score DESC);
CREATE INDEX idx_search_vector ON businesses USING GIN(search_vector);
CREATE INDEX idx_registry_data ON businesses USING GIN(registry_data);
CREATE INDEX idx_verification_logs_business ON verification_logs(business_id);
CREATE INDEX idx_premium_verifications_business ON premium_verifications(business_id);

-- Function to update search_vector
CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('norwegian', 
    COALESCE(NEW.legal_name, '') || ' ' || 
    COALESCE(NEW.org_number, '') || ' ' ||
    COALESCE(NEW.domain, '') || ' ' ||
    COALESCE(NEW.registry_data->>'registered_address', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector updates
CREATE TRIGGER trigger_update_search_vector
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_business_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_verifications ENABLE ROW LEVEL SECURITY;

-- Public read access for businesses
CREATE POLICY "Public read access" ON businesses
  FOR SELECT USING (true);

-- Service role full access for businesses
CREATE POLICY "Service role full access" ON businesses
  FOR ALL USING (auth.role() = 'service_role');

-- Service role access for verification_logs
CREATE POLICY "Service role access" ON verification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Service role access for premium_verifications
CREATE POLICY "Service role access" ON premium_verifications
  FOR ALL USING (auth.role() = 'service_role');
