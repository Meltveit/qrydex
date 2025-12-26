'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/routing';

interface SearchBarProps {
    defaultQuery?: string;
    className?: string;
    size?: 'default' | 'large';
    autoFocus?: boolean;
    placeholder?: string;
}

export default function SearchBar({
    defaultQuery = '',
    className = '',
    size = 'default',
    autoFocus = false,
    placeholder = 'Søk etter produkter, tjenester eller bedrifter...'
}: SearchBarProps) {
    const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string; type: string; logo: string | null }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [query, setQuery] = useState(defaultQuery);
    const router = useRouter();
    const isLarge = size === 'large';

    // Debounce search suggestions
    const [debouncedQuery, setDebouncedQuery] = useState(defaultQuery);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            setShowSuggestions(false);
        }
    };

    // Effect for fetching suggestions
    // Effect for fetching suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                try {
                    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuggestions(data);
                        setShowSuggestions(true);
                    }
                } catch (e) {
                    console.error(e);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Handle blur to close dropdown (delayed to allow click)
    const handleBlur = () => {
        setTimeout(() => setShowSuggestions(false), 200);
    };

    return (
        <div className={`relative ${className}`}>
            <form
                onSubmit={handleSubmit}
                className="relative"
            >
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    name="q"
                    className={`w-full rounded-full border border-gray-200 bg-white text-gray-900
            dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg
            outline-none transition-all hover:shadow-md
            ${isLarge ? 'px-5 py-4 text-base md:px-6 md:py-5 md:text-lg pr-12 md:pr-14' : 'px-4 py-3 text-sm md:text-base pr-10 md:pr-12'}`}
                />
                <button
                    type="submit"
                    className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full
            text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all
            dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-slate-700
            ${isLarge ? 'right-2 md:right-3' : 'right-1 md:right-2'}`}
                    aria-label="Søk"
                >
                    <svg
                        className={`${isLarge ? 'w-5 h-5 md:w-6 md:h-6' : 'w-4 h-4 md:w-5 md:h-5'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-50 overflow-hidden max-h-[50vh] overflow-y-auto">
                    {suggestions.map((item, index) => (
                        <button
                            key={`${item.value}-${index}`}
                            onClick={() => {
                                if (item.type === 'category') {
                                    // Search for category
                                    router.push(`/search?q=${encodeURIComponent(item.value)}`);
                                } else {
                                    // Go to business directly
                                    router.push(`/business/${item.value}`);
                                }
                                setQuery(item.label);
                                setShowSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0"
                        >
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold overflow-hidden ${item.type === 'category'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                                }`}>
                                {item.type === 'category' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                ) : item.logo ? (
                                    <img src={item.logo} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    item.label.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{item.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.type === 'category' ? 'Søk i bransje' : `Org.nr: ${item.value}`}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
