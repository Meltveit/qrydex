-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES news_sources(id) ON DELETE SET NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT, -- Full content or snippet
    author TEXT,
    published_at TIMESTAMPTZ,
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    keywords TEXT[], -- Array of keywords/tags
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    embedding vector(1536), -- Optional: for semantic search later
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search index for articles
CREATE INDEX idx_news_articles_fts ON news_articles USING GIN (to_tsvector('english', title || ' ' || coalesce(summary, '')));

-- Create junction table for linking articles to businesses
CREATE TABLE IF NOT EXISTS business_news_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    relevance_score FLOAT, -- 0 to 1
    mention_context TEXT, -- Snippet of text where business is mentioned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, business_id)
);

-- Index for faster lookups by business
CREATE INDEX idx_business_news_mentions_business_id ON business_news_mentions(business_id);
