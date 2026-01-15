import Link from 'next/link';
import { User, Shield, Settings as SettingsIcon } from 'lucide-react';

export const metadata = {
    title: 'Settings - Qrydex',
};

export default function SettingsPage() {
    const settingsLinks = [
        {
            href: '/settings/profile',
            icon: User,
            title: 'Profile',
            description: 'Update your username, display name, and bio',
        },
        {
            href: '/settings/account',
            icon: Shield,
            title: 'Account',
            description: 'Manage your password and linked accounts',
        },
        {
            href: '/settings/preferences',
            icon: SettingsIcon,
            title: 'Preferences',
            description: 'Theme, notifications, and content settings',
        },
    ];

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                <div className="space-y-4">
                    {settingsLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-start space-x-4 bg-noir-panel border border-gray-800 rounded-xl p-4 hover:border-neon-blue transition-colors group"
                        >
                            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-neon-blue/20 transition-colors">
                                <link.icon className="w-6 h-6 text-gray-400 group-hover:text-neon-blue transition-colors" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white group-hover:text-neon-blue transition-colors">
                                    {link.title}
                                </h2>
                                <p className="text-gray-400 text-sm">{link.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
