'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
    defaultQuery?: string;
    className?: string;
    size?: 'default' | 'large';
    autoFocus?: boolean;
}

export default function SearchBar({
    defaultQuery = '',
    className = '',
    size = 'default',
    autoFocus = false
}: SearchBarProps) {
    const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string; logo: string | null }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounce search suggestions
    const [debouncedQuery, setDebouncedQuery] = useState(defaultQuery);

    // Update debounced query
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        // Basic debounce via timeout in effect would be better, but let's just trigger here with delay or use effect
    };

    // Effect for fetching suggestions
    import { useEffect, useRef } from 'react';
    // ... hooks inside component ...
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
                    placeholder="Søk etter bedriftsnavn eller org.nummer..."
                    autoFocus={autoFocus}
                    className={`w-full rounded-full border border-gray-200 bg-white
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg
            outline-none transition-all hover:shadow-md
            ${isLarge ? 'px-6 py-5 text-lg pr-14' : 'px-5 py-3 pr-12'}`}
                />
                <button
                    type="submit"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
            text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all
            ${isLarge ? 'right-3' : 'right-2'}`}
                    aria-label="Søk"
                >
                    <svg
                        className={`${isLarge ? 'w-6 h-6' : 'w-5 h-5'}`}
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
                    {suggestions.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => {
                                router.push(`/business/${item.value}`);
                                setQuery(item.label);
                                setShowSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                        >
                            <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-400 font-bold overflow-hidden">
                                {item.logo ? (
                                    <img src={item.logo} alt="" className="w-full h-full object-contain" />
                                ) : (
                                    item.label.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{item.label}</div>
                                <div className="text-xs text-gray-500">Org.nr: {item.value}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
