import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { PublicDirectContact } from '@/components/public/PublicDirectContact';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';
import {
  PUBLIC_LOCALES,
  isValidPublicLocale,
  generatePublicPageMetadata,
  type PublicLocale,
} from '@/lib/public-locale';
import { getPublicTranslations } from '@/i18n/public';

interface PageProps {
  params: Promise<{ lang: string }>;
}

const ALTERNATIVE_CONTACT_COPY: Record<PublicLocale, string> = {
  ca: 'Si ho prefereixes, també ens pots contactar per telèfon o WhatsApp.',
  es: 'Si lo prefieres, también puedes contactarnos por teléfono o WhatsApp.',
  fr: 'Si vous préférez, vous pouvez aussi nous contacter par téléphone ou WhatsApp.',
  pt: 'Se preferires, também podes contactar-nos por telefone ou WhatsApp.',
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const t = getPublicTranslations(lang);
  const seoMeta = generatePublicPageMetadata(lang, '/contact');

  return {
    title: `${t.contact.title} | ${t.common.appName}`,
    description: t.contact.subtitle,
    ...seoMeta,
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { lang } = await params;

  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-lg text-center space-y-8">
          <Logo className="h-12 w-12 mx-auto text-primary" />

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{t.contact.title}</h1>
            <p className="text-muted-foreground">{t.contact.subtitle}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-lg font-medium hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <p className="text-sm text-muted-foreground">{t.contact.responseTime}</p>
            <div className="border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground mb-4">{ALTERNATIVE_CONTACT_COPY[locale]}</p>
              <div className="flex justify-center text-left">
                <PublicDirectContact locale={locale} />
              </div>
            </div>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.backToHome}
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href={`/${locale}/privacy`} className="hover:underline">
            {t.common.privacy}
          </Link>
          <span>·</span>
          <span>{t.common.appName}</span>
        </div>
      </footer>
    </main>
  );
}
