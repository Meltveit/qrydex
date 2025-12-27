import { crawlAllNewsSources } from './news-crawler';

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('📰 News Crawler - CONTINUOUS MODE');
    console.log('   Continuously fetching articles from RSS sources');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                await crawlAllNewsSources();

                console.log('\n⏱️  Sleeping 30 minutes before next crawl...');
                await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000)); // 30 min

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
