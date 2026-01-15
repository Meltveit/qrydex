import { createClient } from '@/lib/supabase/server';

export type ChannelRole = 'owner' | 'moderator' | 'member';

export interface ChannelPermissions {
    canDelete: boolean;
    canEdit: boolean;
    canAssignModerators: boolean;
    canDeletePosts: boolean;
    canPinPosts: boolean;
    canBanUsers: boolean;
}

/**
 * Get user's role in a channel
 */
export async function getUserChannelRole(
    channelId: string,
    userId: string
): Promise<ChannelRole | null> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .single();

    return data?.role as ChannelRole | null;
}

/**
 * Check if user has permission to perform action in channel
 */
export async function checkChannelPermission(
    channelId: string,
    userId: string,
    requiredRole: ChannelRole | ChannelRole[]
): Promise<{
    hasPermission: boolean;
    userRole: ChannelRole | null;
}> {
    const userRole = await getUserChannelRole(channelId, userId);

    if (!userRole) {
        return { hasPermission: false, userRole: null };
    }

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasPermission = roles.includes(userRole);

    return { hasPermission, userRole };
}

/**
 * Get all permissions for user in channel
 */
export async function getChannelPermissions(
    channelId: string,
    userId: string
): Promise<ChannelPermissions> {
    const userRole = await getUserChannelRole(channelId, userId);

    const permissions: ChannelPermissions = {
        canDelete: userRole === 'owner',
        canEdit: userRole === 'owner',
        canAssignModerators: userRole === 'owner',
        canDeletePosts: userRole === 'owner' || userRole === 'moderator',
        canPinPosts: userRole === 'owner' || userRole === 'moderator',
        canBanUsers: userRole === 'owner' || userRole === 'moderator',
    };

    return permissions;
}

/**
 * Check if user can edit a post (owns it or is mod/owner)
 */
export async function canEditPost(
    postId: string,
    userId: string
): Promise<boolean> {
    const supabase = await createClient();

    const { data: post } = await supabase
        .from('posts')
        .select('user_id, channel_id')
        .eq('id', postId)
        .single();

    if (!post) return false;

    // User owns the post
    if (post.user_id === userId) return true;

    // User is moderator or owner of the channel
    if (post.channel_id) {
        const { hasPermission } = await checkChannelPermission(
            post.channel_id,
            userId,
            ['owner', 'moderator']
        );
        return hasPermission;
    }

    return false;
}
