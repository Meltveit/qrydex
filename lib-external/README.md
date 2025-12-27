# 🤖 Qrydex Bot System

Comprehensive data acquisition system for building a rich business database.

## 📊 Bot Overview

### 1. **Nordic & EU Registry Populator**
Adds businesses from multiple countries to the database.
- 🇸🇪 Sweden: 1000+ businesses
- 🇩🇰 Denmark: 800+ businesses
- 🇫🇮 Finland: 600+ businesses
- 🇩🇪 Germany: 500+ businesses
- 🇫🇷 France: 500+ businesses
- 🇬🇧 UK: 500+ businesses

### 2. **Website Discovery Bot**
Finds missing websites for businesses using:
- Common domain patterns
- Gemini AI web search
- Verification against org numbers

### 3. **Parallel Website Scraper**
Scrapes websites concurrently (5x faster):
- Company descriptions
- Products & services
- Contact information
- Social media links
- Logos and images

### 4. **News Crawler**
Crawls Norwegian business news sources:
- E24.no
- DN.no
- TU.no
- More sources...

### 5. **News Intelligence Bot**
AI-powered news analysis:
- Extracts company mentions
- Sentiment analysis
- Auto-discovers new businesses
- Links news to companies

## 🚀 Quick Start

### Run Everything (Recommended)
```bash
cd lib-external
node master-bot.ts
```

### Run Specific Bots

```bash
# Only populate Nordic countries
node master-bot.ts --registry-only

# Skip news (faster)
node master-bot.ts --no-news

# Individual bots
node populate-nordic-eu.ts SE DK FI
node website-discovery-bot.ts
node parallel-scraper.ts
```

## 📋 Prerequisites

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
GEMINI_API_KEY=your-gemini-key
```

### Optional (for better results)
```env
OPENCORPORATES_API_KEY=your-key  # Higher rate limits
```

### Database Migrations
Run these first:
```sql
-- In Supabase SQL Editor
-- Run: 011_smart_rescraping.sql
-- Run: 012_news_integration.sql
```

## 📈 Execution Flow

```
┌─────────────────────────────────────────────────┐
│  1. Registry Populator                         │
│     ├─ Adds businesses from registries         │
│     └─ Target: 4000+ businesses                │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  2. Website Discovery                          │
│     ├─ Finds missing domains                   │
│     └─ Uses AI + pattern matching              │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  3. Website Scraper                            │
│     ├─ Scrapes 5 sites concurrently            │
│     ├─ Extracts rich data                      │
│     └─ Updates database                        │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  4. News Crawler                               │
│     ├─ Crawls E24, DN, TU                      │
│     └─ Stores articles in DB                   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  5. News Intelligence                          │
│     ├─ AI analysis                             │
│     ├─ Links to businesses                     │
│     └─ Auto-discovers new companies            │
└─────────────────────────────────────────────────┘
```

## ⚡ Performance

- **Registry Populator**: ~2-5 min (depends on API limits)
- **Website Discovery**: ~10-20 min for 200 businesses
- **Website Scraper**: ~5-10 min for 100 sites (5 concurrent)
- **News Crawler**: ~2-5 min per source
- **News Intelligence**: ~10-20 min for 50 articles

**Total**: ~30-60 minutes for full enrichment

## 🔄 Scheduled Execution

### Vercel Cron (Already configured in `vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/rescrape",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Manual Cron (Alternative)
```bash
# Add to crontab
0 2 * * * cd /path/to/qrydex/lib-external && node master-bot.ts
```

## 📊 Monitoring

Check bot execution:
```sql
-- Count businesses by country
SELECT country_code, COUNT(*) 
FROM businesses 
GROUP BY country_code 
ORDER BY COUNT(*) DESC;

-- Check scraping status
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN last_scraped_at IS NOT NULL THEN 1 END) as scraped,
  COUNT(CASE WHEN domain IS NOT NULL THEN 1 END) as has_domain
FROM businesses;

-- Check news articles
SELECT COUNT(*) FROM news_articles;

-- Check news-business links
SELECT COUNT(*) FROM business_news;
```

## 🐛 Troubleshooting

### "Module not found" errors
```bash
npm install p-limit
```

### API Rate Limits
- OpenCorporates: 100 req/month (free), 5000 with API key
- Gemini: Should be fine with your existing key
- News sources: Respect rate limits (built-in delays)

### Database Connection Issues
```bash
# Check .env files
cat .env.local | grep SUPABASE
```

## 🎯 Next Steps

1. ✅ Run migrations (011, 012)
2. ✅ Set `CRON_SECRET` environment variable
3. ✅ Run `node master-bot.ts`
4. ✅ Deploy to Vercel
5. ✅ Monitor execution in logs

## 📝 Notes

- Bots are designed to be **idempotent** (safe to re-run)
- All operations **skip duplicates** automatically
- Built-in **rate limiting** to respect external APIs
- **Error handling** with detailed logging
- **Graceful degradation** if a bot fails

---

**🚀 Ready to build the Google for Businesses!**
