import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { TranslationsProvider } from '@/i18n/provider';
import { IdleLogoutProvider } from '@/components/IdleLogoutProvider';
import { ErrorBoundaryGlobal } from '@/components/ErrorBoundaryGlobal';

// Font principal - Inter (Apple-like, molt llegible)
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Summa Social | Gestió econòmica i fiscal per a entitats',
  description:
    'Gestió econòmica, fiscal i de projectes per a entitats del Tercer Sector Social.',
  openGraph: {
    title: 'Summa Social | Gestió econòmica i fiscal per a entitats',
    description:
      'Gestió econòmica, fiscal i de projectes per a entitats del Tercer Sector Social.',
    url: 'https://summasocial.app',
    siteName: 'Summa Social',
    locale: 'ca_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Summa Social | Gestió econòmica i fiscal per a entitats',
    description:
      'Gestió econòmica, fiscal i de projectes per a entitats del Tercer Sector Social.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" className={`${inter.variable} h-full overflow-x-hidden`}>
      <body className="h-full overflow-x-hidden font-sans antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          <TranslationsProvider>
            <IdleLogoutProvider idleMs={30 * 60 * 1000} warnMs={60 * 1000}>
              <ErrorBoundaryGlobal>
                {children}
              </ErrorBoundaryGlobal>
            </IdleLogoutProvider>
          </TranslationsProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
