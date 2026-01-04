import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['no', 'en', 'de', 'fr', 'es', 'da', 'sv', 'fi'],

    // Used when no locale matches
    defaultLocale: 'en',

    // Explicitly set this to 'always' so that /en, /no, etc. are always used.
    // This avoids the 'redirect' confusion where /no redirects to / and vice-versa.
    // For SEO, consistent URLs (always having the language prefix) are often safer.
    localePrefix: 'always'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
    createNavigation(routing);
