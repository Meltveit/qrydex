import Link from 'next/link';
import { User, Bell, Shield, Palette, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
    const settingsCategories = [
        {
            title: 'Profile',
            description: 'Manage your profile information',
            icon: User,
            href: '/settings/profile',
        },
        {
            title: 'Account',
            description: 'Update your account settings',
            icon: Shield,
            href: '/settings/account',
        },
        {
            title: 'Preferences',
            description: 'Customize your experience',
            icon: Palette,
            href: '/settings/preferences',
        },
    ];

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                <div className="space-y-4">
                    {settingsCategories.map((link) => (
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
