import Link from 'next/link';
import { Globe, Users, Zap, Shield, Mail } from 'lucide-react';

export const metadata = {
    title: 'About Qrydex - The World\'s AI Index',
    description: 'Learn about Qrydex, the global platform for sharing AI prompts and solutions',
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-16">
                {/* Hero */}
                <div className="text-center mb-16">
                    <div className="flex justify-center mb-6">
                        <Globe className="w-20 h-20 text-neon-blue" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        The World's AI Index
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Qrydex is a global, community-driven platform for sharing AI prompts,
                        queries, and solutions—organized by geography and powered by the community.
                    </p>
                </div>

                {/* Mission */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                    <p className="text-gray-300 mb-4">
                        We believe AI knowledge should be accessible to everyone, everywhere.
                        Qrydex connects people across borders to share prompts that work,
                        solutions to common problems, and creative ways to leverage AI tools.
                    </p>
                    <p className="text-gray-300">
                        Whether you're a developer in Tokyo, a student in Lagos, or a researcher
                        in São Paulo—your AI discoveries deserve to be shared with the world.
                    </p>
                </section>

                {/* Features */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-8">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                            <Globe className="w-10 h-10 text-neon-blue mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Country Hubs</h3>
                            <p className="text-gray-400">
                                Browse prompts and solutions organized by country. Find locally
                                relevant content or explore what's trending globally.
                            </p>
                        </div>
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                            <Users className="w-10 h-10 text-neon-blue mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Channels</h3>
                            <p className="text-gray-400">
                                Join topic-specific channels for GPT, Midjourney, Claude, and more.
                                Build communities around the tools you love.
                            </p>
                        </div>
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                            <Zap className="w-10 h-10 text-neon-blue mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">One-Click Copy</h3>
                            <p className="text-gray-400">
                                Every prompt is instantly copyable. Find what you need and use
                                it immediately in your favorite AI tool.
                            </p>
                        </div>
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                            <Shield className="w-10 h-10 text-neon-blue mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">Community Moderated</h3>
                            <p className="text-gray-400">
                                Quality content rises to the top through community voting.
                                The best prompts get the recognition they deserve.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section className="bg-noir-panel border border-gray-800 rounded-xl p-8 text-center">
                    <Mail className="w-12 h-12 text-neon-blue mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Get in Touch</h2>
                    <p className="text-gray-400 mb-4">
                        Have questions, feedback, or partnership inquiries?
                    </p>
                    <a
                        href="mailto:hello@qrydex.com"
                        className="text-neon-blue hover:underline font-medium"
                    >
                        hello@qrydex.com
                    </a>
                </section>
            </div>
        </div>
    );
}
