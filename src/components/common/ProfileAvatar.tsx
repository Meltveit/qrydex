'use client';

import Image from 'next/image';

interface ProfileAvatarProps {
    avatarUrl?: string | null;
    username: string;
    displayName?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
};

export function ProfileAvatar({ avatarUrl, username, displayName, size = 'md' }: ProfileAvatarProps) {
    const initial = (displayName || username)?.[0]?.toUpperCase() || '?';

    if (avatarUrl) {
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-700 flex-shrink-0`}>
                <Image
                    src={avatarUrl}
                    alt={displayName || username}
                    width={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 40 : 32}
                    height={size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'md' ? 40 : 32}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-neon-blue to-purple-600 flex items-center justify-center font-bold text-white flex-shrink-0`}>
            {initial}
        </div>
    );
}
