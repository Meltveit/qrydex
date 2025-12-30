import SearchBar from '@/components/SearchBar';
import { Link } from '@/i18n/routing';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import SchemaWebsite from '@/components/SchemaWebsite';
import { getTranslations } from 'next-intl/server';

// ... (keep helper functions)

async function getLocationFromIP(ip: string | null) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { city: 'Norge', country: 'NO', countryName: 'Norge' };
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error('IP lookup failed');
    const data = await res.json();
    return {
      city: data.city || 'Norge',
      country: data.country_code || 'NO',
      countryName: data.country_name || 'Norge'
    };
  } catch (error) {
    console.error('IP geolocation error:', error);
    return { city: 'Norge', country: 'NO', countryName: 'Norge' };
  }
}

async function getBusinessCount() {
  try {
    const supabase = createServerClient();
    const { count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  } catch (error) {
    console.error('Business count error:', error);
    return 0;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const baseUrl = 'https://qrydex.com';
  const languages: Record<string, string> = {};
  const locales = ['en', 'no', 'de', 'fr', 'es', 'da', 'sv', 'fi'];

  locales.forEach(l => {
    languages[l] = `${baseUrl}/${l}`;
  });

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: languages,
    },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const headersList = await headers();
  // Try Vercel headers first
  let city = headersList.get('x-vercel-ip-city');
  let country = headersList.get('x-vercel-ip-country');
  let countryName = country === 'NO' ? 'Norge' : country;

  // Fallback to IP lookup if Vercel headers are missing (e.g. localhost/VPN without edge headers)
  if (!city || !country) {
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || '127.0.0.1'; // Local fallback
    const ipLocation = await getLocationFromIP(ip);

    // Only override if we found something useful
    if (ipLocation.city !== 'Norge' || ipLocation.country !== 'NO') {
      city = ipLocation.city;
      country = ipLocation.country;
      countryName = ipLocation.countryName;
    }
  }

  // Ensure default defaults if still nothing
  city = city || 'Norge';
  country = country || 'NO';
  countryName = countryName || 'Norge';

  const location = { city, country, countryName };
  const businessCount = await getBusinessCount();

  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 md:px-6">
      <div className="absolute top-4 left-4 md:top-6 md:left-6">
        <Link href="/" className="inline-flex items-center gap-2 p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--color-primary)] dark:bg-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl md:text-2xl">Q</span>
          </div>
        </Link>
      </div>

      <SchemaWebsite />

      <div className="flex flex-col items-center justify-center w-full max-w-4xl">
        <div className="mb-6 md:mb-8 text-center px-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-primary)] dark:text-blue-400 mb-3 md:mb-2">
            Qrydex
          </h1>
          <p className="text-[var(--color-text-secondary)] dark:text-gray-300 text-base md:text-lg max-w-md md:max-w-none mx-auto">
            {t('title')}
          </p>
        </div>

        <div className="w-full max-w-xl mb-6">
          <SearchBar size="large" autoFocus placeholder={t('searchPlaceholder')} />
        </div>

        {location.city && (
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-gray-400 mb-4 md:mb-6">
            📍 {t('locationPrefix')} <span className="font-medium dark:text-gray-300">{location.city}, {location.countryName}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-[var(--color-text-secondary)] dark:text-gray-400">
          {businessCount > 0 && (
            <span className="flex items-center gap-2 px-3 py-2 md:px-0 md:py-0">
              <span className="w-2 h-2 rounded-full bg-[var(--color-verified)] dark:bg-green-400" />
              {t('verifiedBusinesses', { count: businessCount.toLocaleString() })}
            </span>
          )}
          <span className="flex items-center gap-2 px-3 py-2 md:px-0 md:py-0">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] dark:bg-blue-400" />
            {t('regionLabel')}
          </span>
          <span className="flex items-center gap-2 px-3 py-2 md:px-0 md:py-0">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-light)] dark:bg-blue-300" />
            {t('updatedLabel')}
          </span>
        </div>
      </div>
    </div>
  );
}
