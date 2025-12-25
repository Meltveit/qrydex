import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SchemaOrganization from '@/components/SchemaOrganization';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "Qrydex - Finn verifiserte leverandører",
  description: "B2B søkemotor med verifiserte bedrifter. Finn pålitelige leverandører sjekket mot offisielle registre.",
  keywords: ["B2B", "leverandører", "verifisert", "bedriftsøk", "supplier search", "trust score"],
  openGraph: {
    title: "Qrydex - Finn verifiserte leverandører",
    description: "B2B søkemotor med verifiserte bedrifter",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased min-h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-text)]">
        <SchemaOrganization />
        <main className="flex-1 w-full">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
