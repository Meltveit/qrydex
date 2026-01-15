import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service - Qrydex',
    description: 'Qrydex Terms of Service - Rules and guidelines for using our platform',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
                <p className="text-gray-400 mb-8">Last updated: January 2026</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-300">
                            By accessing or using Qrydex, you agree to be bound by these Terms of Service
                            and all applicable laws and regulations. If you do not agree with any of these
                            terms, you are prohibited from using this site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. User Accounts</h2>
                        <p className="text-gray-300 mb-4">
                            To access certain features, you must register for an account. You agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide accurate and complete information</li>
                            <li>Maintain the security of your account</li>
                            <li>Notify us immediately of any unauthorized access</li>
                            <li>Accept responsibility for all activities under your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. User Content</h2>
                        <p className="text-gray-300 mb-4">
                            You retain ownership of content you submit. By posting content, you grant us
                            a non-exclusive, worldwide, royalty-free license to use, reproduce, modify,
                            and distribute your content in connection with our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Prohibited Content</h2>
                        <p className="text-gray-300 mb-4">
                            You may not post content that:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Is illegal, harmful, or fraudulent</li>
                            <li>Infringes intellectual property rights</li>
                            <li>Contains malware or harmful code</li>
                            <li>Harasses, threatens, or promotes violence</li>
                            <li>Contains child exploitation material</li>
                            <li>Violates any applicable laws</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. NSFW Content</h2>
                        <p className="text-gray-300">
                            Adult content is allowed only in designated NSFW channels. You must be 18 or
                            older to access NSFW content. Failure to properly tag adult content will
                            result in content removal and potential account suspension.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Termination</h2>
                        <p className="text-gray-300">
                            We may terminate or suspend your account at any time, without prior notice,
                            for conduct that we believe violates these Terms or is harmful to other users,
                            us, or third parties, or for any other reason.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Disclaimer</h2>
                        <p className="text-gray-300">
                            Qrydex is provided "as is" without warranties of any kind. We do not guarantee
                            the accuracy, completeness, or usefulness of any content. Use of prompts and
                            AI-generated content is at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Contact</h2>
                        <p className="text-gray-300">
                            Questions about these Terms? Contact us at:{' '}
                            <a href="mailto:legal@qrydex.com" className="text-neon-blue hover:underline">
                                legal@qrydex.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
