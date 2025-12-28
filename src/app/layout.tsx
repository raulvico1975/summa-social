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
  title: 'Summa Social | Menys banc, remeses que quadren i Model 182/347 per a ONGs',
  description:
    "Gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya, amb conciliació bancària i exports per a la gestoria (Model 182 i 347).",
  openGraph: {
    title: 'Summa Social | Menys banc, remeses que quadren i Model 182/347 per a ONGs',
    description:
      "Gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya, amb conciliació bancària i exports per a la gestoria (Model 182 i 347).",
    url: 'https://summasocial.org',
    siteName: 'Summa Social',
    locale: 'ca_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Summa Social | Menys banc, remeses que quadren i Model 182/347 per a ONGs',
    description:
      "Gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya, amb conciliació bancària i exports per a la gestoria (Model 182 i 347).",
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
