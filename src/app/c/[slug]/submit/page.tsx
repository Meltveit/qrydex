import { SubmitForm } from '@/app/submit/page';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ChannelSubmitPage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Get channel details
    const { data: channel } = await supabase
        .from('channels')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

    if (!channel) {
        return notFound();
    }

    // Verify user is a member
    const { data: membership } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channel.id)
        .eq('user_id', user.id)
        .single();

    if (!membership) {
        redirect(`/c/${slug}`);
    }

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
