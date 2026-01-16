import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

// Track page views
export const pageview = (url: string) => {
    if (analytics) {
        logEvent(analytics, 'page_view', {
            page_path: url,
        });
    }
};

// Track custom events
export const event = ({ action, category, label, value }: {
    action: string;
    category: string;
    label?: string;
    value?: number;
}) => {
    if (analytics) {
        logEvent(analytics, action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
};

// Common events
export const trackEvent = {
    // Post interactions
    viewPost: (postId: string) => {
        if (analytics) {
            logEvent(analytics, 'view_item', {
                item_id: postId,
                item_category: 'post',
            });
        }
    },

    createPost: (type: string) => {
        if (analytics) {
            logEvent(analytics, 'create_post', {
                content_type: type,
            });
        }
    },

    upvotePost: (postId: string) => {
        if (analytics) {
            logEvent(analytics, 'select_content', {
                content_type: 'upvote',
                item_id: postId,
            });
        }
    },

    comment: (postId: string) => {
        if (analytics) {
            logEvent(analytics, 'generate_lead', {
                content_type: 'comment',
                item_id: postId,
            });
        }
    },

    // Channel interactions
    joinChannel: (channelId: string) => {
        if (analytics) {
            logEvent(analytics, 'join_group', {
                group_id: channelId,
            });
        }
    },

    leaveChannel: (channelId: string) => {
        if (analytics) {
            logEvent(analytics, 'leave_group', {
                group_id: channelId,
            });
        }
    },

    createChannel: (channelName: string) => {
        if (analytics) {
            logEvent(analytics, 'create_channel', {
                channel_name: channelName,
            });
        }
    },

    // User interactions
    signup: (method: string) => {
        if (analytics) {
            logEvent(analytics, 'sign_up', {
                method: method,
            });
        }
    },

    login: (method: string) => {
        if (analytics) {
            logEvent(analytics, 'login', {
                method: method,
            });
        }
    },

    followUser: (username: string) => {
        if (analytics) {
            logEvent(analytics, 'follow_user', {
                username: username,
            });
        }
    },

    // Search
    search: (query: string) => {
        if (analytics) {
            logEvent(analytics, 'search', {
                search_term: query,
            });
        }
    },
};
