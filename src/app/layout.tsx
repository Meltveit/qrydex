import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
