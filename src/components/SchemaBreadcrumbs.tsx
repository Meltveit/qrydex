
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
            item: process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}${item.item}` : item.item
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
