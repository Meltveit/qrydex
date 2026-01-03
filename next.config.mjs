import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/sitemap/:id.xml',
                destination: '/sitemap/:id',
            },
        ];
    },
};

export default withNextIntl(nextConfig);
