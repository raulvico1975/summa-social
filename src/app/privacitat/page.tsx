import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

/**
 * Redirect stub per /privacitat → /[lang]/privacy
 * Detecta l'idioma del navegador via Accept-Language.
 * Manté compatibilitat amb URLs antigues en català.
 */
export default async function PrivacitatRedirect() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = detectPublicLocale(acceptLanguage);

  redirect(`/${locale}/privacy`);
}
