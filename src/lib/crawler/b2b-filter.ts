/**
 * B2B Filtering & Detection Logic
 * Determines if a website/business is B2B-relevant
 */

// B2B Industry Keywords
export const B2B_KEYWORDS = [
    // Core B2B
    'manufacturer', 'produsent', 'producer', 'fabrikant',
    'supplier', 'leverandør', 'distributor', 'distributør',
    'wholesale', 'engros', 'grossist', 'bulk',
    'b2b', 'enterprise', 'industrial', 'industri',

    // Tech/IT/IoT
    'software', 'programvare', 'saas', 'platform',
    'iot', 'automation', 'cloud', 'data center',
    'hardware', 'networking', 'infrastructure',
    'ai', 'machine learning', 'analytics',

    // Services
    'logistics', 'logistikk', 'transport', 'shipping',
    'consulting', 'rådgiving', 'engineering', 'ingeniør',
    'construction', 'bygg', 'entreprenør', 'contractor',

    // Trade
    'export', 'eksport', 'import', 'trading',
    'oem', 'original equipment manufacturer',
];

// Non-B2B / Noise Keywords
export const NOISE_KEYWORDS = [
    // Consumer-facing
    'restaurant', 'restaurang', 'café', 'cafe', 'coffee shop',
    'hotel', 'hotell', 'motel', 'inn', 'bed and breakfast',
    'bar', 'pub', 'nightclub', 'club',
    'retail', 'butikk', 'shop', 'store',
    'salon', 'frisør', 'barbershop', 'spa',

    // Personal/Blog
    'blog', 'wordpress', 'blogspot', 'tumblr',
    'personal', 'portfolio', 'cv', 'resume',
    'wix.com', 'squarespace.com', 'weebly.com',

    // Social/Media
    'facebook.com', 'instagram.com', 'twitter.com',
    'youtube.com', 'tiktok.com', 'pinterest.com',

    // Other
    'apartment', 'leilighet', 'housing',
    'church', 'kirke', 'temple', 'mosque',
];

// NACE codes for B2B industries
export const B2B_NACE_CODES = [
    // Manufacturing (10-33)
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33',

    // Construction (41-43)
    '41', '42', '43',

    // Wholesale trade (46)
    '46',

    // Transportation & storage (49-53)
    '49', '50', '51', '52', '53',

    // Information & communication (58-63) - IT/Software/IoT
    '58', '59', '60', '61', '62', '63',

    // Professional, scientific, technical (71-75)
    '71', '72', '73', '74', '75',

    // Administrative services (77-82)
    '77', '78', '79', '80', '81', '82',
];

// SIC codes (USA equivalent) for B2B
export const B2B_SIC_CODES = [
    // Manufacturing (20-39)
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',

    // Transportation (40-47)
    '40', '41', '42', '44', '45', '46', '47',

    // Wholesale trade (50-51)
    '50', '51',

    // IT/Software (73, 87)
    '73', '87',
];

/**
 * Check if text content indicates B2B business
 */
export function isB2BContent(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for noise keywords (immediate rejection)
    for (const keyword of NOISE_KEYWORDS) {
        if (lowerText.includes(keyword.toLowerCase())) {
            return false;
        }
    }

    // Count B2B keyword matches
    let b2bScore = 0;
    for (const keyword of B2B_KEYWORDS) {
        if (lowerText.includes(keyword.toLowerCase())) {
            b2bScore++;
        }
    }

    // Need at least 2 B2B indicators
    return b2bScore >= 2;
}

/**
 * Check if URL indicates B2B business
 */
export function isB2BUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();

    // Reject common hosting platforms (personal sites)
    const personalHosting = [
        'wordpress.com', 'blogspot.com', 'wix.com',
        'squarespace.com', 'weebly.com', 'tumblr.com'
    ];

    for (const host of personalHosting) {
        if (lowerUrl.includes(host)) return false;
    }

    // Reject social media
    const socialMedia = [
        'facebook.com', 'instagram.com', 'twitter.com',
        'linkedin.com/in/', // Personal profiles (not company pages)
        'youtube.com', 'tiktok.com'
    ];

    for (const social of socialMedia) {
        if (lowerUrl.includes(social)) return false;
    }

    return true;
}

/**
 * Check if NACE/SIC code is B2B-relevant
 */
export function isB2BIndustryCode(code: string, type: 'NACE' | 'SIC' = 'NACE'): boolean {
    const codePrefix = code.substring(0, 2); // First 2 digits

    if (type === 'NACE') {
        return B2B_NACE_CODES.includes(codePrefix);
    } else {
        return B2B_SIC_CODES.includes(codePrefix);
    }
}

/**
 * Calculate B2B relevance score (0-100)
 */
export function calculateB2BScore(data: {
    url?: string;
    content?: string;
    industryCode?: string;
    industryCodeType?: 'NACE' | 'SIC';
}): number {
    let score = 0;

    // URL check (20 points)
    if (data.url && isB2BUrl(data.url)) {
        score += 20;
    } else if (data.url && !isB2BUrl(data.url)) {
        return 0; // Auto-reject
    }

    // Content check (50 points)
    if (data.content) {
        const lowerContent = data.content.toLowerCase();

        // Noise check (auto-reject)
        for (const noise of NOISE_KEYWORDS) {
            if (lowerContent.includes(noise.toLowerCase())) {
                return 0;
            }
        }

        // Count B2B keywords
        let keywordCount = 0;
        for (const keyword of B2B_KEYWORDS) {
            if (lowerContent.includes(keyword.toLowerCase())) {
                keywordCount++;
            }
        }

        score += Math.min(50, keywordCount * 5);
    }

    // Industry code check (30 points)
    if (data.industryCode && data.industryCodeType) {
        if (isB2BIndustryCode(data.industryCode, data.industryCodeType)) {
            score += 30;
        }
    }

    return Math.min(100, score);
}

/**
 * Validate if business should be accepted
 */
export function shouldAcceptBusiness(b2bScore: number, minScore: number = 40): boolean {
    return b2bScore >= minScore;
}
