'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinCountryButtonProps {
    countryId: string;
    countryCode: string;
    isSubscribed: boolean;
}

export function JoinCountryButton({ countryId, countryCode, isSubscribed: initialSubscribed }: JoinCountryButtonProps) {
    const [loading, setLoading] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
    const router = useRouter();

    const handleJoin = async () => {
        setLoading(true);
        const response = await fetch('/api/country/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryId }),
        });

        if (response.ok) {
            setIsSubscribed(true);
            router.refresh();
        }
        setLoading(false);
    };

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to unsubscribe from this country?')) return;

        setLoading(true);
        const response = await fetch('/api/country/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryId }),
        });

        if (response.ok) {
            setIsSubscribed(false);
            router.refresh();
        }
        setLoading(false);
    };

    if (isSubscribed) {
        return (
            <button
                onClick={handleLeave}
                disabled={loading}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
                {loading ? 'Leaving...' : 'Leave Country'}
            </button>
        );
    }

    return (
        <button
            onClick={handleJoin}
            disabled={loading}
            className="bg-neon-blue text-noir-bg font-bold px-6 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
        >
            {loading ? 'Joining...' : 'Join Country'}
        </button>
    );
}
