# Qrydex Crawler Ecosystem - Deployment Guide

## Quick Start

### 1. Update Database Schema
Run in Supabase SQL Editor:
```sql
-- Run content from: supabase/migrations/003_crawler_ecosystem.sql
```

### 2. Install PM2 (Production Process Manager)
```bash
npm install -g pm2
```

### 3. Start All Bots
```bash
pm2 start ecosystem.config.js
```

### 4. Monitor Bots
```bash
pm2 monit          # Real-time monitoring
pm2 logs           # View logs
pm2 status         # Check status
```

---

## Available Bots

### 🌐 Web Discovery Bot
**Purpose:** Crawls the internet 24/7 to find new B2B businesses
```bash
# Single run
npm run bot:discovery

# Continuous (999 iterations)
npm run bot:discovery:continuous

# Or via PM2
pm2 start ecosystem.config.js --only web-discovery-bot
```

**What it does:**
- Crawls business directories (Proff, Europages, etc.)
- Finds external business websites
- Validates org numbers against Brønnøysund
- Filters for B2B relevance
- Adds verified businesses to database

---

### 📋 Registry Crawler
**Purpose:** Fetches businesses from official registries daily
```bash
npm run crawler

# Or via PM2
pm2 start ecosystem.config.js --only registry-crawler
```

**What it does:**
- Queries Brønnøysund API by NACE code
- Filters for B2B industries (manufacturing, IT, logistics, etc.)
- Adds ~150 businesses per run
- Runs daily at 2 AM

---

### 📚 Website Indexer
**Purpose:** Deep-crawls existing business websites weekly
```bash
npm run indexer

# Or via PM2
pm2 start ecosystem.config.js --only website-indexer
```

**What it does:**
- Finds businesses with domain but not fully indexed
- Crawls up to 50 pages per website
- Extracts all text content for search
- Stores in `quality_analysis.indexed_pages`
- Runs weekly on Sundays at 3 AM

---

## PM2 Commands

### Start/Stop/Restart
```bash
pm2 start ecosystem.config.js          # Start all
pm2 stop all                            # Stop all
pm2 restart all                         # Restart all
pm2 delete all                          # Delete all

pm2 restart web-discovery-bot           # Restart specific bot
```

### Monitoring
```bash
pm2 monit                               # Dashboard
pm2 logs                                # All logs
pm2 logs web-discovery-bot              # Specific bot logs
pm2 logs --lines 100                    # Last 100 lines
```

### Save & Auto-Start
```bash
pm2 save                                # Save current process list
pm2 startup                             # Auto-start on server reboot
```

---

## Logs

All logs are stored in `./logs/`:
- `web-discovery-out.log` - Discovery bot output
- `web-discovery-error.log` - Discovery bot errors
- `registry-out.log` - Registry crawler output
- `indexer-out.log` - Indexer output

View logs:
```bash
tail -f logs/web-discovery-out.log
```

---

## Production Deployment

### Option 1: VPS (Recommended for bots)
Deploy bots on a small VPS (DigitalOcean, AWS EC2, etc.):

1. **Provision server** (Ubuntu 22.04, 1GB RAM)
2. **Install Node.js 22+**
3. **Clone repo and install**:
   ```bash
   git clone <repo>
   cd qrydex
   npm install
   ```
4. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with Supabase credentials
   ```
5. **Start PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Option 2: Vercel + Separate Bot Server
- **Frontend**: Deploy to Vercel
- **Bots**: Run on VPS with PM2
- **Database**: Supabase (shared)

---

## Monitoring Dashboard

Check crawler status at:
```
http://localhost:3000/admin/dashboard
```

Metrics shown:
- Total businesses indexed
- Businesses added today/week
- Bot health status
- Crawl success rate

---

## Troubleshooting

### Bot not starting
```bash
pm2 logs <bot-name> --err      # Check error logs
pm2 describe <bot-name>         # Show configuration
```

### High memory usage
```bash
pm2 restart <bot-name>          # Restart to free memory
```

### Database connection issues
- Check `.env.local` credentials
- Verify Supabase service role key
- Check network/firewall

---

## Next Steps

1. ✅ Run database migration
2. ✅ Start bots with PM2
3. ⏳ Monitor for 24 hours
4. 🔧 Add EU registry support (VIES, Companies House)
5. 🌍 Expand to USA registries (SEC, OpenCorporates)
