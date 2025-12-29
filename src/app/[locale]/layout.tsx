import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "../globals.css";
import SchemaOrganization from '@/components/SchemaOrganization';
import Footer from '@/components/Footer';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: {
    default: "Qrydex - The Intelligent B2B Search Engine",
    template: "%s | Qrydex"
  },
  description: "Find verified businesses, contacts, and financial data across Europe. The next generation B2B search engine powered by AI.",
  keywords: ["B2B", "Search Engine", "Company Directory", "Business Index", "Verified Companies", "Nordic Business", "European Business"],
  authors: [{ name: "Qrydex Team" }],
  creator: "Qrydex",
  publisher: "Qrydex",
  metadataBase: new URL('https://qrydex.com'),
  openGraph: {
    title: "Qrydex - The Intelligent B2B Search Engine",
    description: "Find verified businesses, contacts, and financial data across Europe.",
    url: 'https://qrydex.com',
    siteName: 'Qrydex',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qrydex B2B Search Engine',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Qrydex - The Intelligent B2B Search Engine",
    description: "Find verified businesses, contacts, and financial data across Europe.",
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: "Gd9vQ5iIHxGUWZLLh6093CEMMu0f8mhPBnclOPSN-fI",
  },
};
export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-text)]">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SchemaOrganization />
            <main className="flex-1 w-full">
              {children}
            </main>
            <Footer />
            <Analytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
