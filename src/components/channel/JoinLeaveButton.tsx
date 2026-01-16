'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinLeaveButtonProps {
    channelId: string;
    channelSlug: string;
    isMember: boolean;
    isOwner: boolean;
}

export function JoinLeaveButton({ channelId, channelSlug, isMember, isOwner }: JoinLeaveButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async () => {
        setLoading(true);
        const response = await fetch('/api/channel/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId }),
        });

        if (response.ok) {
            router.refresh();
        }
        setLoading(false);
    };

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this channel?')) return;

        setLoading(true);
        const response = await fetch('/api/channel/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId }),
        });

        if (response.ok) {
            router.refresh();
        }
        setLoading(false);
    };

    // Owner cannot leave their own channel
    if (isOwner) {
        return null;
    }

    if (isMember) {
        return (
            <button
                onClick={handleLeave}
                disabled={loading}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
                {loading ? 'Leaving...' : 'Leave Channel'}
            </button>
        );
    }

    return (
        <button
            onClick={handleJoin}
            disabled={loading}
            className="bg-neon-blue text-noir-bg font-bold px-6 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
        >
            {loading ? 'Joining...' : 'Join Channel'}
        </button>
    );
}
