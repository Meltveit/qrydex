/// <reference types="node" />

import { createServerClient } from '@/lib/supabase';
import { scrapeWebsite, type WebsiteData } from '@/lib/crawler/website-scraper';
import * as crypto from 'crypto';

// Smart Rescraping Logic
// 1. Prioritize pages with error status
// 2. Prioritize key pages (contact, about)
// 3. Respect crawl budget

export async function runSmartRescrape(limit: number = 100) {
    console.log('🔄 Smart Rescraper - Starting...');

    // Check if running directly
    if (require.main === module) {
        // Logic here if needed for standalone run
    }
}

if (require.main === module) {
    runSmartRescrape();
}
