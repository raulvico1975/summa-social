import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

/**
 * Redirect stub per /login → /{lang} (landing pública)
 *
 * IMPORTANT: No existeix login públic general.
 * - El login d'organització és /{orgSlug}/login
 * - /login redirigeix a la landing pública
 *
 * Detecta l'idioma del navegador via Accept-Language.
 */
export default async function LoginRedirect() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = detectPublicLocale(acceptLanguage);

  // Redirigir a landing pública (no existeix login general)
  redirect(`/${locale}`);
}
