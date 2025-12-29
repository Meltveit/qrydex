-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.business_news (
  business_id uuid NOT NULL,
  article_id uuid NOT NULL,
  relevance_score double precision DEFAULT 1.0,
  mentioned_as text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_news_pkey PRIMARY KEY (business_id, article_id),
  CONSTRAINT business_news_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
  CONSTRAINT business_news_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id)
);
CREATE TABLE public.business_news_mentions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  business_id uuid,
  relevance_score double precision,
  mention_context text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_news_mentions_pkey PRIMARY KEY (id),
  CONSTRAINT business_news_mentions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.news_articles(id),
  CONSTRAINT business_news_mentions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.businesses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_number character varying NOT NULL UNIQUE,
  legal_name text NOT NULL,
  country_code character varying NOT NULL,
  domain character varying,
  registry_data jsonb DEFAULT '{}'::jsonb,
  quality_analysis jsonb DEFAULT '{}'::jsonb,
  news_signals jsonb DEFAULT '[]'::jsonb,
  trust_score integer DEFAULT 0,
  trust_score_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_verified_at timestamp with time zone,
  verification_status character varying DEFAULT 'pending'::character varying,
  search_vector tsvector,
  website_last_crawled timestamp with time zone,
  website_crawl_count integer DEFAULT 0,
  website_status character varying DEFAULT 'unknown'::character varying,
  indexed_pages_count integer DEFAULT 0,
  last_change_detected timestamp with time zone,
  crawl_priority integer DEFAULT 50,
  logo_url text,
  opening_hours jsonb,
  social_media jsonb,
  company_description text,
  product_categories ARRAY,
  geo_coordinates jsonb,
  sitelinks jsonb,
  translations jsonb DEFAULT '{}'::jsonb,
  next_scrape_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  content_hash text,
  last_scraped_at timestamp with time zone,
  scrape_count integer DEFAULT 0,
  discovery_source text DEFAULT 'brreg'::text,
  discovery_article_id uuid,
  CONSTRAINT businesses_pkey PRIMARY KEY (id),
  CONSTRAINT businesses_discovery_article_id_fkey FOREIGN KEY (discovery_article_id) REFERENCES public.news_articles(id)
);
CREATE TABLE public.crawl_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bot_name character varying,
  action character varying,
  business_id uuid,
  url text,
  details jsonb,
  success boolean,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crawl_logs_pkey PRIMARY KEY (id),
  CONSTRAINT crawl_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.crawl_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_type character varying,
  url text,
  business_id uuid,
  priority integer DEFAULT 50,
  status character varying DEFAULT 'pending'::character varying,
  attempts integer DEFAULT 0,
  last_attempt timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  details jsonb,
  CONSTRAINT crawl_queue_pkey PRIMARY KEY (id),
  CONSTRAINT crawl_queue_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.news_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id uuid,
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  content text,
  author text,
  published_at timestamp with time zone,
  crawled_at timestamp with time zone DEFAULT now(),
  keywords ARRAY,
  sentiment character varying CHECK (sentiment::text = ANY (ARRAY['positive'::character varying, 'negative'::character varying, 'neutral'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  sentiment_score double precision,
  topics ARRAY,
  companies_mentioned ARRAY,
  CONSTRAINT news_articles_pkey PRIMARY KEY (id),
  CONSTRAINT news_articles_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.news_sources(id)
);
CREATE TABLE public.news_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  country_code character varying NOT NULL,
  category character varying,
  coverage_area text,
  crawl_enabled boolean DEFAULT false,
  last_crawled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT news_sources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.premium_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  verification_type character varying,
  status character varying,
  verified_date date,
  expiry_date date,
  certificate_document_url text,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT premium_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT premium_verifications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);
CREATE TABLE public.search_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  query text NOT NULL,
  filters jsonb,
  results_count integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_analytics_pkey PRIMARY KEY (id)
);
CREATE TABLE public.search_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  query text,
  filters jsonb,
  location_country text,
  location_region text,
  result_count integer,
  anonymized_session_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT search_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.verification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  verification_type character varying,
  status character varying,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT verification_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);