import { createServerClient } from '../supabase';
import { scrapeWebsite } from './website-scraper';

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🤖 Website Scraper - CONTINUOUS MODE');
    console.log('   Continuously scraping business websites');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Get businesses with domains but no scraped data
                const { data: businesses, count } = await supabase
                    .from('businesses')
                    .select('id, domain, legal_name, org_number', { count: 'exact' })
                    .not('domain', 'is', null)
                    .is('company_description', null)
                    .limit(20); // Process 20 per cycle

                if (!businesses || businesses.length === 0) {
                    console.log('✅ All websites scraped! Waiting for new websites...');
                } else {
                    console.log(`Found ${count} unscraped websites`);
                    console.log(`Processing ${businesses.length} in this cycle...\n`);

                    for (const business of businesses) {
                        try {
                            console.log(`  🌐 Scraping: ${business.domain}`);
                            const data = await scrapeWebsite(`https://${business.domain}`);

                            if (data) {
                                // Update database
                                await supabase
                                    .from('businesses')
                                    .update({
                                        company_description: data.description,
                                        products: data.products,
                                        services: data.services,
                                        logo_url: data.logoUrl,
                                        social_media: data.socialMedia,
                                        last_scraped_at: new Date().toISOString()
                                    })
                                    .eq('id', business.id);

                                console.log(`  ✅ Success: ${business.legal_name}`);
                            }

                            // Rate limiting
                            await new Promise(resolve => setTimeout(resolve, 3000));

                        } catch (error: any) {
                            console.error(`  ❌ Error scraping ${business.domain}:`, error.message);
                        }
                    }
                }

                console.log('\n⏱️  Sleeping 20 minutes before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 20 * 60 * 1000)); // 20 min

            } catch (err: any) {
                console.error('❌ Error in cycle:', err.message);
                console.log('   Retrying in 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            }
        }
    }

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
