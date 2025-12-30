
import { BreadcrumbList, WithContext } from 'schema-dts';

interface BreadcrumbItem {
    name: string;
    item: string;
}

export default function SchemaBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    const schema: WithContext<BreadcrumbList> = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: (() => {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qrydex.com';
                const path = item.item.startsWith('/') ? item.item : `/${item.item}`;
                return `${baseUrl.replace(/\/$/, '')}${path}`;
            })()
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
