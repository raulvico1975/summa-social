import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

/**
 * Redirect stub per /privacy → /[lang]/privacy
 * Detecta l'idioma del navegador via Accept-Language.
 */
export default async function PrivacyRedirect() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = detectPublicLocale(acceptLanguage);

  redirect(`/${locale}/privacy`);
}
