import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { Analytics } from '@/components/common/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Qrydex - The World\'s AI Index',
    description: 'A living library of prompts, queries, and solutions, organized by geography.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} bg-noir-bg text-gray-100 min-h-screen flex flex-col`}>
                <Analytics />
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                    <Header />
                    <main className="flex-grow">
                        {children}
                    </main>
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
