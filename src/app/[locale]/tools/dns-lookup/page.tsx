import { useTranslations } from 'next-intl';
// import { unstable_setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import DnsClient from './DnsClient';
import RelatedBusinesses from '@/components/tools/RelatedBusinesses';

type Props = {
    params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
    return {
        title: 'Free DNS Lookup Tool | Check A, MX, TXT Records - Qrydex',
        description: 'Instant DNS lookup tool. Check and verify A, AAAA, MX, TXT, NS, CNAME and SOA records for any domain name. Free and fast.',
        alternates: {
            languages: {
                'en': 'https://qrydex.com/en/tools/dns-lookup',
                'no': 'https://qrydex.com/no/tools/dns-lookup',
                'de': 'https://qrydex.com/de/tools/dns-lookup',
                'fr': 'https://qrydex.com/fr/tools/dns-lookup',
                'es': 'https://qrydex.com/es/tools/dns-lookup',
                'da': 'https://qrydex.com/da/tools/dns-lookup',
                'sv': 'https://qrydex.com/sv/tools/dns-lookup',
                'fi': 'https://qrydex.com/fi/tools/dns-lookup',
            },
        },
    };
}

export default function DnsLookupPage({ params: { locale } }: Props) {
    // unstable_setRequestLocale(locale);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950/50 pb-20">
            {/* Tool Section */}
            <div className="py-12 px-4 md:px-6">
                <DnsClient />
            </div>

            {/* Content Section (SEO Text) */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 mb-20 space-y-8 text-gray-600 dark:text-gray-400">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">What is a DNS Lookup?</h2>
                    <p className="mb-4">
                        Attributes like A, MX, and CNAME records are essential parts of the Domain Name System (DNS).
                        This tool performs queries against authoritative nameservers to fetch the real-time configuration of any domain.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>A Record:</strong> Maps a domain to an IPv4 address.</li>
                        <li><strong>MX Record:</strong> Specifies mail servers for email delivery.</li>
                        <li><strong>TXT Record:</strong> Used for verification (SPF, DKIM, Google).</li>
                        <li><strong>NS Record:</strong> Shows the Authoritative Nameservers for the domain.</li>
                    </ul>
                </div>
            </div>

            {/* Business Listings */}
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <RelatedBusinesses />
            </div>
        </div>
    );
}
