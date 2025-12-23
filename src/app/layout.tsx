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
  title: 'Summa Social',
  description: 'Gestió financera per a organitzacions socials.',
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
