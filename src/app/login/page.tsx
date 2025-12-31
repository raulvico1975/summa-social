import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

/**
 * Redirect stub per /login → /[lang]/login
 * Detecta l'idioma del navegador via Accept-Language.
 */
export default async function LoginRedirect() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = detectPublicLocale(acceptLanguage);

  redirect(`/${locale}/login`);
}
