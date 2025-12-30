/**
 * IndexNow Integration
 * Instantly notify Bing/Yandex when pages are created or updated
 * https://www.indexnow.org/documentation
 */

const INDEXNOW_API_KEY = 'c7a2b20d020e401cab37c533f7880f35';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowOptions {
    /**
     * The base domain (without protocol)
     * Example: 'qrydex.com'
     */
    host?: string;

    /**
     * List of URLs to submit (max 10,000 per request)
     */
    urls: string[];
}

/**
 * Submit URLs to IndexNow for instant indexing
 * 
 * @param options - Configuration with host and URLs to submit
 * @returns Success status and any error message
 */
export async function submitToIndexNow(options: IndexNowOptions): Promise<{ success: boolean; error?: string }> {
    const { urls, host = 'qrydex.com' } = options;

    if (!urls || urls.length === 0) {
        return { success: false, error: 'No URLs provided' };
    }

    // IndexNow supports max 10,000 URLs per request
    if (urls.length > 10000) {
        console.warn(`⚠️ IndexNow: Truncating ${urls.length} URLs to 10,000 max`);
    }

    const urlList = urls.slice(0, 10000);

    try {
        const response = await fetch(INDEXNOW_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                host,
                key: INDEXNOW_API_KEY,
                keyLocation: `https://${host}/${INDEXNOW_API_KEY}.txt`,
                urlList
            })
        });

        // IndexNow returns:
        // - 200: OK (URLs submitted)
        // - 202: Accepted (URLs queued)
        // - 400/422: Bad request
        // - 403: Forbidden (key verification failed)
        // - 429: Too many requests

        if (response.status === 200 || response.status === 202) {
            console.log(`✅ IndexNow: Submitted ${urlList.length} URL(s) to Bing/Yandex`);
            return { success: true };
        }

        const errorText = await response.text();
        console.error(`❌ IndexNow error (${response.status}):`, errorText);
        return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`
        };

    } catch (error: any) {
        console.error('❌ IndexNow submission failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Submit a single business profile URL to IndexNow
 * 
 * @param orgNumber - Organization number of the business
 * @param host - Optional: custom domain (defaults to qrydex.com)
 */
export async function submitBusinessProfile(orgNumber: string, host = 'qrydex.com'): Promise<void> {
    const url = `https://${host}/business/${orgNumber}`;
    await submitToIndexNow({ urls: [url], host });
}

/**
 * Batch submit multiple business profiles
 * Useful for maintenance bot or scraper workers after updating profiles
 * 
 * @param orgNumbers - Array of organization numbers
 * @param host - Optional: custom domain
 */
export async function submitBusinessProfiles(orgNumbers: string[], host = 'qrydex.com'): Promise<void> {
    if (orgNumbers.length === 0) return;

    const urls = orgNumbers.map(orgNr => `https://${host}/business/${orgNr}`);
    await submitToIndexNow({ urls, host });
}
