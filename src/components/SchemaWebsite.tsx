
import { WebSite, WithContext, SearchAction } from 'schema-dts';

export default function SchemaWebsite() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qrydex.com';

    const schema: WithContext<WebSite> = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Qrydex',
        url: baseUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/search?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        } as SearchAction & { 'query-input': string },
        description: 'The Nordic B2B Search Engine. Find and verify companies in Norway, Sweden, Denmark, and Finland.'
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
