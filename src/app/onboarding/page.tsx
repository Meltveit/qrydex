'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Globe, User, MapPin, Calendar, Check, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const INTEREST_TAGS = [
    { id: 'chatgpt', label: 'ChatGPT', category: 'AI Tools' },
    { id: 'gemini', label: 'Gemini', category: 'AI Tools' },
    { id: 'midjourney', label: 'Midjourney', category: 'AI Tools' },
    { id: 'claude', label: 'Claude', category: 'AI Tools' },
    { id: 'dalle', label: 'DALL-E', category: 'AI Tools' },
    { id: 'stable-diffusion', label: 'Stable Diffusion', category: 'AI Tools' },
    { id: 'copilot', label: 'GitHub Copilot', category: 'AI Tools' },
    { id: 'coding', label: 'Coding', category: 'Topics' },
    { id: 'writing', label: 'Writing', category: 'Topics' },
    { id: 'art', label: 'Art & Design', category: 'Topics' },
    { id: 'marketing', label: 'Marketing', category: 'Topics' },
    { id: 'business', label: 'Business', category: 'Topics' },
    { id: 'education', label: 'Education', category: 'Topics' },
    { id: 'gaming', label: 'Gaming', category: 'Topics' },
    { id: 'music', label: 'Music', category: 'Topics' },
    { id: 'video', label: 'Video', category: 'Topics' },
    { id: 'research', label: 'Research', category: 'Topics' },
];

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [countries, setCountries] = useState<any[]>([]);

    // Form state
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [gender, setGender] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [marketingConsent, setMarketingConsent] = useState(false);

    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // Check if already onboarded
            const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed, username')
                .eq('id', user.id)
                .single();

            if (profile?.onboarding_completed) {
                router.push('/');
                return;
            }

            // Pre-fill display name from auth metadata
            if (user.user_metadata?.name) {
                setDisplayName(user.user_metadata.name);
            }

            // Fetch countries
            const { data: countriesData } = await supabase
                .from('countries')
                .select('code, name, flag_emoji')
                .eq('is_active', true)
                .order('name');
            if (countriesData) setCountries(countriesData);

            setLoading(false);
        };
        init();
    }, []);

    // Username availability check
    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingUsername(true);
            const { data } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username.toLowerCase())
                .single();
            setUsernameAvailable(!data);
            setCheckingUsername(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const toggleInterest = (id: string) => {
        setInterests(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleComplete = async () => {
        if (!user) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                username: username.toLowerCase(),
                display_name: displayName,
                birthdate: birthdate || null,
                country_code: countryCode || null,
                gender: gender || null,
                interests: interests,
                marketing_consent: marketingConsent,
                terms_accepted_at: new Date().toISOString(),
                onboarding_completed: true,
                registration_method: user.app_metadata?.provider || 'email',
            })
            .eq('id', user.id);

        if (error) {
            console.error('Failed to save profile:', error);
            setSaving(false);
            return;
        }

        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noir-bg flex items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full">
                {/* Progress */}
                <div className="flex items-center justify-center mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-neon-blue text-noir-bg' : 'bg-gray-800 text-gray-500'
                                }`}>
                                {step > s ? <Check className="w-5 h-5" /> : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 h-1 ${step > s ? 'bg-neon-blue' : 'bg-gray-800'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Profile Basics */}
                {step === 1 && (
                    <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <User className="w-8 h-8 text-neon-blue" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Create Your Profile</h1>
                                <p className="text-gray-400">How should we call you?</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-white font-medium mb-2">Username *</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    placeholder="your_username"
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                                />
                                {checkingUsername && <p className="text-sm text-gray-500 mt-1">Checking...</p>}
                                {usernameAvailable === true && <p className="text-sm text-green-400 mt-1">✓ Available</p>}
                                {usernameAvailable === false && <p className="text-sm text-red-400 mt-1">✗ Already taken</p>}
                            </div>

                            <div>
                                <label className="block text-white font-medium mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Your Name"
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                                />
                            </div>

                            <div>
                                <label className="block text-white font-medium mb-2">Birthdate</label>
                                <input
                                    type="date"
                                    value={birthdate}
                                    onChange={(e) => setBirthdate(e.target.value)}
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                                />
                                <p className="text-xs text-gray-500 mt-1">Required for age-restricted content</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!username || username.length < 3 || usernameAvailable === false}
                            className="w-full mt-6 flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                        >
                            <span>Continue</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Step 2: Location & Demographics */}
                {step === 2 && (
                    <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <MapPin className="w-8 h-8 text-neon-blue" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Where Are You From?</h1>
                                <p className="text-gray-400">Help us personalize your experience</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-white font-medium mb-2">Country</label>
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                                >
                                    <option value="">Select your country...</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag_emoji} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-white font-medium mb-2">Gender (optional)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GENDER_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setGender(option.value)}
                                            className={`px-4 py-2 rounded-lg border transition-colors ${gender === option.value
                                                ? 'border-neon-blue bg-neon-blue/20 text-white'
                                                : 'border-gray-700 text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="flex-1 flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                            >
                                <span>Continue</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Interests */}
                {step === 3 && (
                    <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <Sparkles className="w-8 h-8 text-neon-blue" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">What Interests You?</h1>
                                <p className="text-gray-400">We'll recommend relevant channels</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-400 mb-3">AI Tools</p>
                            <div className="flex flex-wrap gap-2">
                                {INTEREST_TAGS.filter(t => t.category === 'AI Tools').map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleInterest(tag.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${interests.includes(tag.id)
                                            ? 'bg-neon-blue text-noir-bg'
                                            : 'bg-gray-800 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-400 mb-3">Topics</p>
                            <div className="flex flex-wrap gap-2">
                                {INTEREST_TAGS.filter(t => t.category === 'Topics').map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleInterest(tag.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${interests.includes(tag.id)
                                            ? 'bg-neon-blue text-noir-bg'
                                            : 'bg-gray-800 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-800 pt-4 mb-4">
                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={marketingConsent}
                                    onChange={(e) => setMarketingConsent(e.target.checked)}
                                    className="w-5 h-5 rounded bg-noir-bg border-gray-700 text-neon-blue focus:ring-neon-blue"
                                />
                                <span className="text-gray-400 text-sm">
                                    Send me updates about new features and communities
                                </span>
                            </label>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                <span>{saving ? 'Saving...' : 'Complete Setup'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
