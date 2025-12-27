-- Business-News Junction Table
CREATE TABLE IF NOT EXISTS business_news (
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  relevance_score FLOAT DEFAULT 1.0, -- 0-1: How confident we are about the link
  mentioned_as TEXT, -- How the business was mentioned (e.g. "Equinor ASA", "Equinor")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (business_id, article_id)
);

-- Index for finding articles by business
CREATE INDEX IF NOT EXISTS business_news_business_idx ON business_news(business_id, created_at DESC);

-- Index for finding businesses by article
CREATE INDEX IF NOT EXISTS business_news_article_idx ON business_news(article_id);

-- Add discovery tracking to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT 'brreg',
ADD COLUMN IF NOT EXISTS discovery_article_id UUID REFERENCES news_articles(id);

-- Add sentiment analysis to news_articles
ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS sentiment TEXT, -- 'positive', 'neutral', 'negative'
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT, -- -1.0 to 1.0
ADD COLUMN IF NOT EXISTS topics TEXT[], -- Extracted topics/keywords
ADD COLUMN IF NOT EXISTS companies_mentioned TEXT[]; -- Raw company names found by AI

-- Index for sentiment filtering
CREATE INDEX IF NOT EXISTS news_sentiment_idx ON news_articles(sentiment, published_at DESC);

-- Index for topic search
CREATE INDEX IF NOT EXISTS news_topics_idx ON news_articles USING GIN(topics);

COMMENT ON TABLE business_news IS 'Links news articles to businesses mentioned in them';
COMMENT ON COLUMN businesses.discovery_source IS 'How this business was discovered: brreg, news_article, manual';
COMMENT ON COLUMN news_articles.sentiment IS 'AI-analyzed sentiment of the article';
COMMENT ON COLUMN news_articles.topics IS 'AI-extracted topics and keywords';
