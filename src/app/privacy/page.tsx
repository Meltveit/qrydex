import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy - Qrydex',
    description: 'Qrydex Privacy Policy - How we collect, use, and protect your data',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-gray-400 mb-8">Last updated: January 2026</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <p className="text-gray-300 mb-4">
                            We collect information you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Account information (email, username, password)</li>
                            <li>Profile information (display name, bio, avatar)</li>
                            <li>Content you submit (posts, comments, votes)</li>
                            <li>Communications with us</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                        <p className="text-gray-300 mb-4">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process transactions and send related information</li>
                            <li>Send technical notices and support messages</li>
                            <li>Respond to your comments and questions</li>
                            <li>Monitor and analyze trends and usage</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Cookies</h2>
                        <p className="text-gray-300">
                            We use cookies and similar technologies to collect information about your
                            browsing activities and to distinguish you from other users. This helps
                            us provide you with a good experience and allows us to improve our site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
                        <p className="text-gray-300">
                            We take reasonable measures to help protect your personal information
                            from loss, theft, misuse, unauthorized access, disclosure, alteration,
                            and destruction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Your Rights (GDPR)</h2>
                        <p className="text-gray-300 mb-4">
                            If you are in the European Economic Area, you have certain rights including:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Right to access your personal data</li>
                            <li>Right to rectification of inaccurate data</li>
                            <li>Right to erasure ("right to be forgotten")</li>
                            <li>Right to data portability</li>
                            <li>Right to object to processing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Contact Us</h2>
                        <p className="text-gray-300">
                            If you have questions about this Privacy Policy, please contact us at:{' '}
                            <a href="mailto:privacy@qrydex.com" className="text-neon-blue hover:underline">
                                privacy@qrydex.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
