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
    const router = useRouter();
    const [query, setQuery] = useState(defaultQuery);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const isLarge = size === 'large';

    return (
        <form
            onSubmit={handleSubmit}
            className={`relative ${className}`}
        >
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
    );
}
