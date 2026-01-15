import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Settings, Users } from 'lucide-react';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { FollowButton } from '@/components/profile/FollowButton';
import { ProfileTabs } from '@/components/profile/ProfileTabs';

interface Props {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { username } = await params;
    return {
        title: `${username} - Qrydex`,
        description: `Profile of ${username} on Qrydex`,
    };
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

    if (!profile) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">User Not Found</h1>
                    <p className="text-gray-400 mb-8">This user doesn't exist.</p>
                    <Link href="/" className="text-neon-blue hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const isOwnProfile = user?.id === profile.id;

    // Check if current user follows this profile
    let isFollowing = false;
    if (user && !isOwnProfile) {
        const { data } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .single();
        isFollowing = !!data;
    }

    return (
        <div className="min-h-screen bg-noir-bg">
            {/* Profile Header */}
            <div className="bg-noir-panel border-b border-gray-800">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-6">
                            <ProfileAvatar
                                avatarUrl={profile.avatar_url}
                                username={profile.username}
                                displayName={profile.display_name}
                                size="xl"
                            />
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    {profile.display_name || profile.username}
                                </h1>
                                <p className="text-gray-400">u/{profile.username}</p>
                                {profile.bio && <p className="text-gray-300 mt-2">{profile.bio}</p>}

                                <div className="flex items-center space-x-6 mt-3 text-sm">
                                    <div className="flex items-center text-gray-400">
                                        <Users className="w-4 h-4 mr-1" />
                                        <span className="font-bold text-white">{profile.followers_count || 0}</span>
                                        <span className="ml-1">Followers</span>
                                    </div>
                                    <div className="text-gray-400">
                                        <span className="font-bold text-white">{profile.following_count || 0}</span>
                                        <span className="ml-1">Following</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            {isOwnProfile ? (
                                <Link
                                    href="/settings/profile"
                                    className="inline-flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </Link>
                            ) : user ? (
                                <FollowButton
                                    profileId={profile.id}
                                    initialFollowing={isFollowing}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <ProfileTabs profileId={profile.id} />
        </div>
    );
}
