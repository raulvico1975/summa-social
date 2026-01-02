import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

/**
 * Redirect stub per /login → /[lang]/login
 * Detecta l'idioma del navegador via Accept-Language.
 * IMPORTANT: Preserva tots els searchParams (next, reason, etc.)
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = detectPublicLocale(acceptLanguage);

  // Preservar tots els searchParams al redirect (Next 15: searchParams és Promise)
  const params = (await searchParams) ?? {};
  const queryString = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    // Si és array, afegir múltiples valors
    if (Array.isArray(value)) {
      for (const v of value) {
        queryString.append(key, v);
      }
    } else {
      queryString.set(key, value);
    }
  }

  const query = queryString.toString();
  redirect(`/${locale}/login${query ? `?${query}` : ''}`);
}
