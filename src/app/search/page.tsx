import SearchBar from '@/components/SearchBar';
import BusinessCard from '@/components/BusinessCard';
import { searchBusinesses } from '@/lib/search';
import { getLocationFromIP, getCountryFlag } from '@/lib/geo/ip-location';
import { headers } from 'next/headers';
import Link from 'next/link';

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
        page?: string;
    }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const query = params.q || '';
    const page = params.page ? parseInt(params.page, 10) : 1;

    // Get user location
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0];
    const location = await getLocationFromIP(ip);

    const results = await searchBusinesses(query, {}, page);

    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            {/* Header with search */}
            <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)]">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                            <span className="text-white font-bold">Q</span>
                        </div>
                        <span className="text-xl font-bold text-[var(--color-primary)] hidden sm:block">
                            Qrydex
                        </span>
                    </Link>

                    {/* Search bar */}
                    <div className="flex-1 max-w-xl">
                        <SearchBar defaultQuery={query} />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Results info */}
                <div className="mb-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Viser {results.total} resultater {query && `for "${query}"`}
                        {location && (
                            <span className="ml-2">
                                · 📍 Sortert fra {location.city}, {location.country} {getCountryFlag(location.countryCode)}
                            </span>
                        )}
                    </p>
                </div>

                {/* Results */}
                {results.businesses.length > 0 ? (
                    <div className="space-y-3">
                        {results.businesses.map((business) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                distance={127} // TODO: Calculate real distance
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
                            Ingen resultater funnet
                        </h3>
                        <p className="text-[var(--color-text-secondary)]">
                            {query
                                ? `Fant ingen verifiserte bedrifter for "${query}"`
                                : 'Begynn med å søke etter en bedrift'}
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {results.total > results.pageSize && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        {page > 1 && (
                            <Link
                                href={`/search?q=${query}&page=${page - 1}`}
                                className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-gray-100 rounded-lg"
                            >
                                ← Forrige
                            </Link>
                        )}
                        <span className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">
                            Side {page} av {Math.ceil(results.total / results.pageSize)}
                        </span>
                        {page < Math.ceil(results.total / results.pageSize) && (
                            <Link
                                href={`/search?q=${query}&page=${page + 1}`}
                                className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-gray-100 rounded-lg"
                            >
                                Neste →
                            </Link>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
