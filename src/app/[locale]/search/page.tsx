import SearchBar from '@/components/SearchBar';
import BusinessCard from '@/components/BusinessCard';
import { searchBusinesses } from '@/lib/search';
import Link from 'next/link';
import { headers } from 'next/headers';
import crypto from 'crypto';

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

    // Analytics Context (Bot B)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const country = headersList.get('x-vercel-ip-country') || 'NO'; // Fallback to NO for dev
    const region = headersList.get('x-vercel-ip-city') || undefined;
    const ua = headersList.get('user-agent') || '';
    const date = new Date().toISOString().split('T')[0];
    const sessionId = crypto.createHash('sha256').update(`${ip}${ua}${date}`).digest('hex').substring(0, 16);

    const results = await searchBusinesses(query, {}, page, 20, {
        country,
        region,
        sessionId
    });

    return (
        <div className="min-h-screen bg-[var(--color-background)] dark:bg-slate-950">
            {/* Header with search */}
            <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-[var(--color-border)] transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0 p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[var(--color-primary)] dark:bg-blue-600 flex items-center justify-center shadow">
                            <span className="text-white font-bold text-lg">Q</span>
                        </div>
                        <span className="text-xl font-bold text-[var(--color-primary)] dark:text-blue-400 hidden sm:block">
                            Qrydex
                        </span>
                    </Link>

                    {/* Search bar */}
                    <div className="flex-1 max-w-xl">
                        <SearchBar defaultQuery={query} />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {/* Results info */}
                <div className="mb-4 md:mb-6">
                    <p className="text-sm md:text-base text-[var(--color-text-secondary)] dark:text-gray-400">
                        Viser {results.total} bedrifter
                        {results.articles && results.articles.length > 0 && ` og ${results.articles.length} artikler`}
                        {query && ` for "${query}"`}
                    </p>
                </div>

                {/* News Articles Section (if any) */}
                {results.articles && results.articles.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Relevante Nyheter</h2>
                        <div className="grid gap-3">
                            {results.articles.map((article) => (
                                <a
                                    key={article.id}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-colors shadow-sm hover:shadow-md group"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                {article.summary}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    News
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(article.published_at || '').toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-3">
                    {results.businesses.length > 0 && (
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bedrifter</h2>
                    )}
                </div>

                {/* Results */}
                {results.businesses.length > 0 ? (
                    <div className="space-y-3">
                        {results.businesses.map((business) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                            />
                        ))}
                    </div>
                ) : (
                    !results.articles?.length && (
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
                                    ? `Fant ingen verifiserte bedrifter eller nyheter for "${query}"`
                                    : 'Begynn med å søke etter en bedrift'}
                            </p>
                        </div>
                    )
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
