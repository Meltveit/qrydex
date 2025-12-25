import SearchBar from '@/components/SearchBar';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import SchemaWebsite from '@/components/SchemaWebsite';

async function getLocationFromIP(ip: string | null) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { city: 'Norge', country: 'NO', countryName: 'Norge' };
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      next: { revalidate: 3600 } // Cache for 1 hour
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

export default async function Home() {
  // Get user location (server-side, safe)
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] || null;

  const [location, businessCount] = await Promise.all([
    getLocationFromIP(ip),
    getBusinessCount()
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4">
      {/* Minimal header - just logo */}
      <div className="absolute top-4 left-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
        </Link>
      </div>

      <SchemaWebsite />

      {/* Centered content - Google style */}
      <div className="flex flex-col items-center justify-center w-full max-w-4xl">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-primary)]">
            Qrydex
          </h1>
        </div>

        {/* Search bar */}
        <div className="w-full max-w-xl mb-6">
          <SearchBar size="large" autoFocus />
        </div>

        {/* Location hint */}
        {location.city && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            📍 Søker fra <span className="font-medium">{location.city}, {location.countryName}</span>
          </p>
        )}

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
          {businessCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-verified)]" />
              {businessCount.toLocaleString('no-NO')} verifiserte bedrifter
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            Europa & USA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-light)]" />
            Oppdatert daglig
          </span>
        </div>
      </div>
    </div>
  );
}
