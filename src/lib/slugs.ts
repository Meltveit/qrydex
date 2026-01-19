import { customAlphabet } from 'nanoid';

// Use URL-safe alphabet (no special chars)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

/**
 * Generate a short, unique ID for posts
 * Format: 8 characters, lowercase alphanumeric
 * Example: 'a1b2c3d4'
 */
export function generateShortId(): string {
    return nanoid();
}

/**
 * Generate URL-friendly slug from title
 * Example: "Italian Night: Some Gems!" -> "italian-night-some-gems"
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        // Remove special characters except spaces and hyphens
        .replace(/[^\w\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Replace multiple hyphens with single hyphen
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Limit length
        .substring(0, 100);
}

/**
 * Build Reddit-style post URL
 * Format: /{country}/{shortId}/{slug}
 * Example: /usa/a1b2c3d4/italian-night-some-gems
 */
export function buildPostUrl(country: string, shortId: string, slug?: string): string {
    if (slug) {
        return `/${country}/${shortId}/${slug}`;
    }
    return `/${country}/${shortId}`;
}

/**
 * Extract shortId from URL path
 * Supports both formats:
 * - /{country}/{shortId}
 * - /{country}/{shortId}/{slug}
 */
export function extractShortId(path: string): string | null {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
        return parts[1]; // Second part is always shortId
    }
    return null;
}
