import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { TranslationsProvider } from '@/i18n/provider';
import { IdleLogoutProvider } from '@/components/IdleLogoutProvider';

// Font principal - Inter (Apple-like, molt llegible)
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Summa Social — Gestió econòmica i fiscal per a ONGs',
  description:
    "Aplicació web de gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya: conciliació bancària, control de devolucions, Model 182, Model 347 i certificats de donació.",
  openGraph: {
    title: 'Summa Social — Gestió econòmica i fiscal per a ONGs',
    description:
      "Conciliació bancària, control de devolucions i preparació fiscal (Model 182, 347) per a associacions i fundacions d'Espanya.",
    url: 'https://summasocial.org',
    siteName: 'Summa Social',
    locale: 'ca_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Summa Social — Gestió econòmica i fiscal per a ONGs',
    description:
      "Conciliació bancària, fiscalitat i certificats de donació per a associacions i fundacions d'Espanya.",
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
    <html lang="ca" className={inter.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          <TranslationsProvider>
            <IdleLogoutProvider idleMs={30 * 60 * 1000} warnMs={60 * 1000}>
              {children}
            </IdleLogoutProvider>
          </TranslationsProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
