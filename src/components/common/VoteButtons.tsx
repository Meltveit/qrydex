'use client';

import { createClient } from '@/lib/supabase/client';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VoteButtonsProps {
    postId: string;
    initialLikes: number;
    initialUserVote?: number; // 1, -1, or 0
}

export function VoteButtons({ postId, initialLikes, initialUserVote = 0 }: VoteButtonsProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [userVote, setUserVote] = useState(initialUserVote);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        // Fetch user's existing vote
        const fetchUserVote = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('post_votes')
                .select('value')
                .eq('post_id', postId)
                .eq('user_id', user.id)
                .single();

            if (data) {
                setUserVote(data.value);
            }
        };

        fetchUserVote();
    }, [postId]);

    const handleVote = async (value: number) => {
        // Optimistic update
        const newVote = userVote === value ? 0 : value;
        const voteDiff = newVote - userVote;
        setLikes(prev => prev + voteDiff);
        setUserVote(newVote);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { error } = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, value: newVote }),
            }).then(res => res.json());

            if (error) throw error;
        } catch (err) {
            // Revert on error
            setLikes(prev => prev - voteDiff);
            setUserVote(userVote);
            console.error('Vote failed:', err);
        }
    };

    return (
        <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
            <button
                onClick={() => handleVote(1)}
                className={`p-1 rounded hover:bg-gray-700 transition-colors ${userVote === 1 ? 'text-neon-green' : 'text-gray-400'
                    }`}
            >
                <ArrowBigUp className={`w-6 h-6 ${userVote === 1 ? 'fill-current' : ''}`} />
            </button>
            <span className={`text-sm font-bold min-w-[1.5rem] text-center ${userVote === 1 ? 'text-neon-green' : userVote === -1 ? 'text-red-500' : 'text-white'
                }`}>
                {likes}
            </span>
            <button
                onClick={() => handleVote(-1)}
                className={`p-1 rounded hover:bg-gray-700 transition-colors ${userVote === -1 ? 'text-red-500' : 'text-gray-400'
                    }`}
            >
                <ArrowBigDown className={`w-6 h-6 ${userVote === -1 ? 'fill-current' : ''}`} />
            </button>
        </div>
    );
}
