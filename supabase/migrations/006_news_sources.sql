-- News Sources Table
-- Tracks B2B news and media outlets for future news monitoring features

CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  category VARCHAR(50), -- 'business_news', 'tech_news', 'trade_journal'
  coverage_area TEXT, -- 'nordic', 'norway', 'denmark', 'sweden', 'finland'
  crawl_enabled BOOLEAN DEFAULT false,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_sources_country ON news_sources(country_code);
CREATE INDEX IF NOT EXISTS idx_news_sources_category ON news_sources(category);
CREATE INDEX IF NOT EXISTS idx_news_sources_crawl_enabled ON news_sources(crawl_enabled);

-- Insert initial Nordic B2B news sources

-- Norway
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('E24', 'https://e24.no', 'NO', 'business_news', 'norway', false),
('Dagens Næringsliv', 'https://www.dn.no', 'NO', 'business_news', 'norway', false),
('Finansavisen', 'https://www.finansavisen.no', 'NO', 'business_news', 'norway', false),
('Digi.no', 'https://www.digi.no', 'NO', 'tech_news', 'norway', false),
('Shifter', 'https://shifter.no', 'NO', 'tech_news', 'norway', false),
('NTB (Norwegian News Agency)', 'https://ntb.no', 'NO', 'business_news', 'norway', false);

-- Sweden
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Dagens Industri', 'https://www.di.se', 'SE', 'business_news', 'sweden', false),
('Breakit', 'https://www.breakit.se', 'SE', 'tech_news', 'sweden', false),
('DI Digital', 'https://digital.di.se', 'SE', 'tech_news', 'sweden', false),
('Øresund Startups', 'https://oresundstartups.com', 'SE', 'tech_news', 'sweden', false);

-- Denmark
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Børsen', 'https://borsen.dk', 'DK', 'business_news', 'denmark', false),
('Elektronikfokus.dk', 'https://elektronikfokus.dk', 'DK', 'trade_journal', 'denmark', false),
('Emballagefokus.dk', 'https://emballagefokus.dk', 'DK', 'trade_journal', 'denmark', false),
('Klimafokus.dk', 'https://klimafokus.dk', 'DK', 'trade_journal', 'denmark', false);

-- Finland
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Helsinki Times Business', 'https://www.helsinkitimes.fi/business', 'FI', 'business_news', 'finland', false),
('Good News Finland', 'https://www.goodnewsfinland.com', 'FI', 'business_news', 'finland', false),
('Kauppalehti', 'https://www.kauppalehti.fi', 'FI', 'business_news', 'finland', false);

-- Nordic-wide
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Nordic Business Report', 'https://nbforum.com', 'NO', 'business_news', 'nordic', false),
('Nordic Business Magazine', 'https://nordicbusiness.media', 'NO', 'business_news', 'nordic', false),
('Nordiske Medier', 'https://nordiskemediehus.dk', 'DK', 'business_news', 'nordic', false);

COMMENT ON TABLE news_sources IS 'B2B news and media sources for monitoring business mentions and news signals';
COMMENT ON COLUMN news_sources.crawl_enabled IS 'Whether this source is actively crawled for news mentions';
