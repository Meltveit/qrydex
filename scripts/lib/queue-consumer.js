/**
 * Queue Consumer Wrapper
 * Generic wrapper to make any bot consume jobs from crawl_queue
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * Process jobs from queue
 * @param {string} jobType - Type of job to process (e.g. 'discover', 'registry', 'index')
 * @param {Function} processor - Async function(job) => result
 * @param {Object} options - { batchSize: 1, pollInterval: 5000 }
 */
async function consumeQueue(jobType, processor, options = {}) {
    const { batchSize = 1, pollInterval = 10000 } = options;
    const botName = `queue-consumer-${jobType}`;

    console.log(`🤖 ${botName} started. Waiting for jobs...`);

    while (true) {
        try {
            // 1. Fetch pending jobs
            const { data: jobs, error } = await supabase
                .from('crawl_queue')
                .select('*')
                .eq('status', 'pending')
                .eq('job_type', jobType)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true })
                .limit(batchSize);

            if (error) {
                console.error('Error fetching jobs:', error.message);
                await sleep(pollInterval);
                continue;
            }

            if (!jobs || jobs.length === 0) {
                // No jobs, wait
                await sleep(pollInterval);
                continue;
            }

            console.log(`Processing ${jobs.length} jobs...`);

            // 2. Process each job
            for (const job of jobs) {
                // Mark as processing
                await updateJobStatus(job.id, 'processing');

                try {
                    const startTime = Date.now();
                    const result = await processor(job);
                    const duration = Date.now() - startTime;

                    // Success
                    await updateJobStatus(job.id, 'completed');

                    // Log success
                    await logCrawl(botName, 'job_completed', job.business_id, job.url, {
                        job_id: job.id,
                        duration_ms: duration,
                        result
                    }, true);

                } catch (err) {
                    console.error(`Job ${job.id} failed:`, err.message);

                    // Failure
                    await updateJobStatus(job.id, 'failed', err.message);

                    // Log failure
                    await logCrawl(botName, 'job_failed', job.business_id, job.url, {
                        job_id: job.id,
                        error: err.message
                    }, false);
                }
            }

        } catch (err) {
            console.error('Consumer error:', err);
            await sleep(pollInterval);
        }
    }
}

async function updateJobStatus(id, status, errorMessage = null) {
    const update = {
        status,
        last_attempt: new Date().toISOString()
    };

    if (errorMessage) update.error_message = errorMessage;
    if (status === 'processing') update.attempts = 1; // Increment logic usually here

    await supabase
        .from('crawl_queue')
        .update(update)
        .eq('id', id);
}

async function logCrawl(botName, action, businessId, url, details, success) {
    await supabase.from('crawl_logs').insert({
        bot_name: botName,
        action,
        business_id: businessId,
        url,
        details,
        success
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { consumeQueue, logCrawl };
