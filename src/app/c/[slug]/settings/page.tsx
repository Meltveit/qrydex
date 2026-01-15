import { createClient } from '@/lib/supabase/server';
import { getChannelPermissions } from '@/lib/permissions';
import Link from 'next/link';
import { ArrowLeft, Trash2, Shield, Settings as SettingsIcon } from 'lucide-react';
import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ChannelSettingsPage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get channel
    const { data: channel } = await supabase
        .from('channels')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!channel) {
        redirect('/c');
    }

    // Check permissions
    const permissions = await getChannelPermissions(channel.id, user.id);

    if (!permissions.canEdit) {
        redirect(`/c/${slug}`);
    }

    // Get members with roles
    const { data: members } = await supabase
        .from('channel_members')
        .select(`
            user_id,
            role,
            joined_at,
            profiles:user_id (username, avatar_url)
        `)
        .eq('channel_id', channel.id)
        .order('joined_at', { ascending: true });

    const ownerMembers = members?.filter(m => m.role === 'owner') || [];
    const modMembers = members?.filter(m => m.role === 'moderator') || [];
    const regularMembers = members?.filter(m => m.role === 'member') || [];

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Link
                    href={`/c/${slug}`}
                    className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to c/{channel.name}
                </Link>

                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-8">
                        <SettingsIcon className="w-6 h-6 text-neon-blue" />
                        <h1 className="text-2xl font-bold text-white">Community Settings</h1>
                    </div>

                    {/* General Settings */}
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-white mb-4">General</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Community Name</label>
                                <input
                                    type="text"
                                    defaultValue={channel.name}
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue"
                                    disabled
                                />
                                <p className="text-xs text-gray-500 mt-1">Contact admin to change name</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Description</label>
                                <textarea
                                    defaultValue={channel.description}
                                    rows={3}
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue"
                                    disabled
                                />
                            </div>
                        </div>
                    </div>

                    {/* Moderators */}
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-yellow-400" />
                            Moderation Team
                        </h2>

                        <div className="space-y-4">
                            {/* Owners */}
                            {ownerMembers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-2">Owner</h3>
                                    {ownerMembers.map((member: any) => (
                                        <div key={member.user_id} className="flex items-center justify-between bg-noir-bg rounded-lg p-3 border border-gray-800">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-sm font-bold">
                                                        {member.profiles?.username?.[0]?.toUpperCase() || '?'}
                                                    </span>
                                                </div>
                                                <span className="text-white">u/{member.profiles?.username || 'Unknown'}</span>
                                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-medium">
                                                    Owner
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Moderators */}
                            {modMembers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-400 mb-2">Moderators</h3>
                                    <div className="space-y-2">
                                        {modMembers.map((member: any) => (
                                            <div key={member.user_id} className="flex items-center justify-between bg-noir-bg rounded-lg p-3 border border-gray-800">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-bold">
                                                            {member.profiles?.username?.[0]?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <span className="text-white">u/{member.profiles?.username || 'Unknown'}</span>
                                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">
                                                        Moderator
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-gray-500">
                                You have {regularMembers.length} regular members
                            </p>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    {permissions.canDelete && (
                        <div className="border-t border-gray-800 pt-8">
                            <h2 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h2>
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-white font-bold mb-1">Delete Community</h3>
                                        <p className="text-sm text-gray-400">
                                            Once deleted, this community and all its posts will be permanently removed.
                                        </p>
                                    </div>
                                    <form
                                        action={async () => {
                                            'use server';
                                            const supabase = await createClient();
                                            await supabase
                                                .from('channels')
                                                .delete()
                                                .eq('id', channel.id);
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete</span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
