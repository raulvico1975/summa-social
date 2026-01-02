import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { Mail } from 'lucide-react';
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

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const t = getPublicTranslations(lang);
  const seoMeta = generatePublicPageMetadata(lang, '/privacy');

  return {
    title: `${t.privacy.title} | ${t.common.appName}`,
    description: t.common.tagline,
    ...seoMeta,
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { lang } = await params;

  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);
  const p = t.privacy.sections;

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}`}>
              {t.common.backToHome}
            </Link>
          </Button>
          <Logo className="h-8 w-8 text-primary" />
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            {/* Títol */}
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t.privacy.title}</h1>
            <p className="text-muted-foreground mb-8">
              <strong>{t.common.lastUpdated}</strong>: Desembre 2025
              <br />
              <strong>{t.common.privacyContact}</strong>:{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>

            <hr className="my-6" />

            {/* 1. Qui som */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.whoWeAre.title}</h2>
              <p className="text-muted-foreground mb-4">{p.whoWeAre.intro}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>
                  <strong className="text-foreground">{p.whoWeAre.responsible.split(':')[0]}</strong>
                  : {p.whoWeAre.responsible.split(':').slice(1).join(':')}
                </li>
                <li>
                  <strong className="text-foreground">{p.whoWeAre.processor.split(':')[0]}</strong>
                  : {p.whoWeAre.processor.split(':').slice(1).join(':')}
                </li>
              </ul>
            </section>

            <hr className="my-6" />

            {/* 2. Quines dades tractem */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.whatData.title}</h2>

              <h3 className="text-lg font-medium mb-3">{p.whatData.appUsersTitle}</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {p.whatData.appUsersTable.data}
                      </th>
                      <th className="text-left py-2 font-medium">
                        {p.whatData.appUsersTable.purpose}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.whatData.appUsersTable.email}</td>
                      <td className="py-2">{p.whatData.appUsersTable.emailPurpose}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.whatData.appUsersTable.name}</td>
                      <td className="py-2">{p.whatData.appUsersTable.namePurpose}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.whatData.appUsersTable.role}</td>
                      <td className="py-2">{p.whatData.appUsersTable.rolePurpose}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">{p.whatData.appUsersTable.organizations}</td>
                      <td className="py-2">{p.whatData.appUsersTable.organizationsPurpose}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{p.whatData.appUsersNote}</p>

              <h3 className="text-lg font-medium mb-3">{p.whatData.entityDataTitle}</h3>
              <p className="text-muted-foreground mb-3">{p.whatData.entityDataIntro}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                {p.whatData.entityDataItems.map((item, i) => (
                  <li key={i}>
                    <strong className="text-foreground">{item.split(':')[0]}</strong>:
                    {item.split(':').slice(1).join(':')}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm mb-2">{p.whatData.entityDataNote}</p>
              <p className="text-muted-foreground text-sm font-medium">
                {p.whatData.entityDataSensitive}
              </p>
            </section>

            <hr className="my-6" />

            {/* 3. Base legal */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.legalBasis.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {p.legalBasis.table.treatment}
                      </th>
                      <th className="text-left py-2 font-medium">{p.legalBasis.table.basis}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.legalBasis.table.appUsers}</td>
                      <td className="py-2">{p.legalBasis.table.appUsersBasis}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">{p.legalBasis.table.entityData}</td>
                      <td className="py-2">{p.legalBasis.table.entityDataBasis}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <hr className="my-6" />

            {/* 4. Destinataris */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.recipients.title}</h2>

              <h3 className="text-lg font-medium mb-3">{p.recipients.subprocessorsTitle}</h3>
              <p className="text-muted-foreground mb-3">{p.recipients.subprocessorsIntro}</p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {p.recipients.table.service}
                      </th>
                      <th className="text-left py-2 pr-4 font-medium">
                        {p.recipients.table.location}
                      </th>
                      <th className="text-left py-2 font-medium">
                        {p.recipients.table.guarantees}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.recipients.services.auth.name}</td>
                      <td className="py-2 pr-4">{p.recipients.services.auth.location}</td>
                      <td className="py-2">{p.recipients.services.auth.guarantees}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.recipients.services.firestore.name}</td>
                      <td className="py-2 pr-4">{p.recipients.services.firestore.location}</td>
                      <td className="py-2">{p.recipients.services.firestore.guarantees}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.recipients.services.storage.name}</td>
                      <td className="py-2 pr-4">{p.recipients.services.storage.location}</td>
                      <td className="py-2">{p.recipients.services.storage.guarantees}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">{p.recipients.services.hosting.name}</td>
                      <td className="py-2 pr-4">{p.recipients.services.hosting.location}</td>
                      <td className="py-2">{p.recipients.services.hosting.guarantees}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-medium mb-3">{p.recipients.legalObligationsTitle}</h3>
              <p className="text-muted-foreground mb-2">{p.recipients.legalObligationsIntro}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-2">
                {p.recipients.legalObligationsItems.map((item, i) => (
                  <li key={i}>
                    <strong className="text-foreground">{item.split(':')[0]}</strong>:
                    {item.split(':').slice(1).join(':')}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-sm">{p.recipients.legalObligationsNote}</p>
            </section>

            <hr className="my-6" />

            {/* 5. Conservació */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.retention.title}</h2>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">
                        {p.retention.table.dataType}
                      </th>
                      <th className="text-left py-2 font-medium">{p.retention.table.period}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.retention.items.appUsers.type}</td>
                      <td className="py-2">{p.retention.items.appUsers.period}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">{p.retention.items.fiscalData.type}</td>
                      <td className="py-2">{p.retention.items.fiscalData.period}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">{p.retention.items.otherData.type}</td>
                      <td className="py-2">{p.retention.items.otherData.period}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm">{p.retention.note}</p>
            </section>

            <hr className="my-6" />

            {/* 6. Drets */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.rights.title}</h2>
              <p className="text-muted-foreground mb-3">{p.rights.intro}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                {Object.values(p.rights.rightsList).map((right, i) => (
                  <li key={i}>
                    <strong className="text-foreground">{right.name}</strong>: {right.description}
                  </li>
                ))}
              </ul>

              <h3 className="text-lg font-medium mb-3">{p.rights.howToExerciseTitle}</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                <li>
                  <strong className="text-foreground">{p.rights.howToExerciseAppUsers}</strong>{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li>{p.rights.howToExerciseOthers}</li>
              </ul>
              <p className="text-muted-foreground text-sm mb-4">{p.rights.responseTime}</p>
              <p className="text-muted-foreground text-sm">
                {p.rights.complaint}
                <a
                  href="https://www.aepd.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {p.rights.complaintLink}
                </a>
                .
              </p>
            </section>

            <hr className="my-6" />

            {/* 7. Seguretat */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.security.title}</h2>
              <p className="text-muted-foreground mb-3">{p.security.intro}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {p.security.measures.map((measure, i) => (
                  <li key={i}>{measure}</li>
                ))}
              </ul>
            </section>

            <hr className="my-6" />

            {/* 8. Canvis */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{p.changes.title}</h2>
              <p className="text-muted-foreground">{p.changes.content}</p>
            </section>

            <hr className="my-6" />

            {/* 9. Contacte */}
            <section className="mb-4">
              <h2 className="text-xl font-semibold mb-4">{p.contact.title}</h2>
              <p className="text-muted-foreground mb-4">{p.contact.intro}</p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <strong>{p.contact.emailLabel}</strong>:{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
                <p>
                  <strong>{p.contact.responsibleLabel}</strong>: Raül Vico
                </p>
                <p>
                  <strong>{p.contact.holderLabel}</strong>: Raül Vico (Espanya)
                </p>
                <p className="text-muted-foreground pt-2">
                  <strong>{p.contact.dpoNote.split(':')[0]}</strong>:
                  {p.contact.dpoNote.split(':').slice(1).join(':')}
                </p>
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-primary" />
            <span>{t.common.appName}</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="h-4 w-4 mr-2" />
              {t.common.contact}
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
