import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectPublicLocale } from '@/lib/public-locale';

export default async function FuncionalitatsRedirect() {
  const headersList = await headers();
  const al = headersList.get('accept-language');
  const lang = detectPublicLocale(al);
  redirect(`/${lang}/funcionalitats`);
}
