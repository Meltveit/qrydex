'use client';

import { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';

interface FollowButtonProps {
    profileId: string;
    initialFollowing: boolean;
}

export function FollowButton({ profileId, initialFollowing }: FollowButtonProps) {
    const [following, setFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    const handleFollow = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followingId: profileId }),
            });

            if (res.ok) {
                const data = await res.json();
                setFollowing(data.following);
            }
        } catch (error) {
            console.error('Follow error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleFollow}
            disabled={loading}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${following
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-neon-blue text-noir-bg hover:bg-neon-blue/90'
                }`}
        >
            {following ? (
                <>
                    <UserMinus className="w-4 h-4" />
                    <span>Unfollow</span>
                </>
            ) : (
                <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                </>
            )}
        </button>
    );
}
