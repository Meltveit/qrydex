import SearchBar from '@/components/SearchBar';
import { getLocationFromIP, getCountryFlag } from '@/lib/geo/ip-location';
import { headers } from 'next/headers';
import Link from 'next/link';

export default async function Home() {
  // Get user location from IP
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0];
  const location = await getLocationFromIP(ip);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Minimal header - just logo */}
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
        </Link>
      </header>

      {/* Centered content - Google style */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
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

        {/* Location indicator */}
        {location && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            📍 Søker fra {location.city}, {location.country} {getCountryFlag(location.countryCode)}
          </p>
        )}

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-verified)]" />
            12,847 verifiserte bedrifter
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            Europa & USA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-light)]" />
            Oppdatert daglig
          </span>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="p-4 text-center">
        <p className="text-xs text-[var(--color-text-secondary)]">
          ✓ Alle bedrifter verifisert mot offisielle registre
        </p>
      </footer>
    </div>
  );
}
