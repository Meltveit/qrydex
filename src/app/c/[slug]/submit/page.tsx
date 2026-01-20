'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SubmitForm } from '@/app/submit/page';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
    params: Promise<{ slug: string }>;
}

function ChannelSubmitContent({ params }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [channel, setChannel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [slug, setSlug] = useState('');

    useEffect(() => {
        const init = async () => {
            const resolvedParams = await params;
            setSlug(resolvedParams.slug);

            // Verify user is logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Get channel details
            const { data: channelData } = await supabase
                .from('channels')
                .select('id, name, slug')
                .eq('slug', resolvedParams.slug)
                .single();

            if (!channelData) {
                router.push('/c');
                return;
            }

            // Verify user is a member
            const { data: membership } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', channelData.id)
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                router.push(`/c/${resolvedParams.slug}`);
                return;
            }

            setChannel(channelData);
            setLoading(false);
        };

        init();
    }, [params, router, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!channel) return null;

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href={`/c/${slug}`} className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to c/{channel.name}
                </Link>

                <SubmitForm channelId={channel.id} channelName={channel.name} />
            </div>
        </div>
    );
}

export default function ChannelSubmitPage(props: Props) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
            </div>
        }>
            <ChannelSubmitContent {...props} />
        </Suspense>
    );
}
