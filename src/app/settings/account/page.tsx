'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

export default function AccountSettingsPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/settings" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </Link>

                <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

                {/* Password Change */}
                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-white font-medium mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                                placeholder="Enter new password"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`px-4 py-3 rounded-lg ${message.includes('Error')
                                ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                                : 'bg-green-500/10 border border-green-500/50 text-green-400'
                                }`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            <span>{loading ? 'Updating...' : 'Update Password'}</span>
                        </button>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className="bg-noir-panel border border-red-500/30 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
                    <p className="text-gray-400 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                        className="bg-red-500/20 text-red-400 border border-red-500/50 font-bold px-6 py-3 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
