
import { Organization, WithContext } from 'schema-dts';

export default function SchemaOrganization() {
    const schema: WithContext<Organization> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Qrydex',
        url: process.env.NEXT_PUBLIC_BASE_URL || 'https://qrydex.com', // Fallback
        logo: 'https://qrydex.com/logo.png', // Placeholder, should be env or verified URL
        sameAs: [
            // Add social profiles here later
        ],
        description: 'The Nordic B2B Search Engine verifying trust and business authenticity.',
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@qrydex.com'
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
