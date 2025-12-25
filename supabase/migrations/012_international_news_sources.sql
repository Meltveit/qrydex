-- Protocol: International News Expansion
-- Adds major US, European, and Global business news sources to the tracking list

-- Global / International
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Reuters Business', 'https://www.reuters.com/business', 'US', 'business_news', 'global', true),
('Bloomberg', 'https://www.bloomberg.com', 'US', 'finance_news', 'global', true),
('Financial Times', 'https://www.ft.com', 'GB', 'finance_news', 'global', true),
('The Wall Street Journal', 'https://www.wsj.com', 'US', 'business_news', 'global', true),
('CNBC International', 'https://www.cnbc.com/world', 'US', 'business_news', 'global', true);

-- USA
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('TechCrunch', 'https://techcrunch.com', 'US', 'tech_news', 'usa', true),
('Forbes', 'https://www.forbes.com', 'US', 'business_news', 'usa', true),
('Business Insider', 'https://www.businessinsider.com', 'US', 'business_news', 'usa', true);

-- Europe (General)
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Politico Europe', 'https://www.politico.eu', 'BE', 'policy_news', 'europe', true),
('Euronews Business', 'https://www.euronews.com/business', 'FR', 'business_news', 'europe', true),
('Sifted.eu', 'https://sifted.eu', 'GB', 'tech_news', 'europe', true); -- European startup news

-- Germany
INSERT INTO news_sources (source_name, source_url, country_code, category, coverage_area, crawl_enabled) VALUES
('Handelsblatt', 'https://www.handelsblatt.com', 'DE', 'business_news', 'germany', false),
('Der Spiegel International', 'https://www.spiegel.de/international', 'DE', 'news', 'germany', false);

-- Enable crawling for these new high-value sources
-- (Note: 'crawl_enabled' is set to true for the primary global ones to start tracking immediately)
