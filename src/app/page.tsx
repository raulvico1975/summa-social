import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, X, Check } from 'lucide-react';

// FAQ data per reutilitzar al JSON-LD (7 preguntes, enfocament dolor → solució)
const faqItems = [
  {
    question: 'Quin problema resol Summa Social?',
    answer:
      'Evita Excel paral·lels, redueix temps al banc i fa que remeses, devolucions i fiscalitat quadrin amb el moviment real.',
  },
  {
    question: 'Què vol dir "estalviar temps al banc"?',
    answer:
      'Que pots preparar pagaments agrupats en remesa (factures i nòmines) i gestionar liquidacions sense entrar pagament a pagament a la banca online.',
  },
  {
    question: 'Com m\'ajuda amb remeses i quotes?',
    answer:
      'Desglossa imports agregats i deixa cada quota assignada a qui correspon, perquè sàpigues què ha aportat cada soci.',
  },
  {
    question: 'I amb devolucions?',
    answer:
      'Registra i assigna devolucions perquè el càlcul anual reflecteixi el que s\'ha cobrat realment.',
  },
  {
    question: 'Què envio a la gestoria?',
    answer:
      'L\'Excel del Model 182, l\'Excel/CSV del Model 347 i els certificats de donació en PDF.',
  },
  {
    question: 'Serveix per donacions via web?',
    answer:
      'Sí: desglossa ingressos agregats, separa comissions i deixa les donacions traçables per donant.',
  },
  {
    question: 'Serveix per projectes de cooperació?',
    answer:
      'Sí: pressupost, execució per partida i assistent per quadrar justificacions, amb captura ràpida de despesa de terreny.',
  },
];

// JSON-LD FAQPage
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="flex min-h-screen flex-col">
        {/* Hero */}
        <div className="flex flex-col items-center justify-center bg-background px-6 py-16">
          <div className="w-full max-w-3xl text-center space-y-8">
            <Logo className="h-16 w-16 mx-auto text-primary" />

            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Summa Social
              </h1>

              {/* Frase canònica */}
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Gestió econòmica i fiscal per a entitats petites i mitjanes d&apos;Espanya,
                amb conciliació bancària i exports per a la gestoria (Model 182 i 347).
              </p>

              {/* Dolor */}
              <p className="text-sm text-muted-foreground/80 max-w-xl mx-auto">
                Excel dispers, remeses que no saps desglossar, devolucions sense assignar
                i hores entrant pagaments un per un al banc.
              </p>

              {/* Solució */}
              <p className="text-sm text-foreground/90 max-w-xl mx-auto font-medium">
                Centralitzes documents, prepares remeses de pagament agrupades,
                ho concilies amb l&apos;extracte i arribes al gener amb els models a punt.
              </p>
            </div>

            <ul className="text-left space-y-3 mx-auto max-w-lg">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Deixes de &quot;perseguir&quot; factures, tiquets i nòmines: tot queda al mateix lloc, amb traçabilitat.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Redueixes el temps al banc: pagues per remesa (SEPA) en lloc de pagament a pagament.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  El Model 182 i els certificats quadren perquè remeses i devolucions estan ben resoltes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Si fas cooperació: control d&apos;execució del projecte i assistent per quadrar justificacions.
                </span>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Button asChild size="lg">
                <Link href="/login">
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/contacte">Contacte</Link>
              </Button>
            </div>

            <div className="mt-4">
              <Link
                href="/funcionalitats"
                className="text-sm text-primary hover:underline"
              >
                Veure totes les funcionalitats →
              </Link>
            </div>
          </div>
        </div>

        {/* Bloc 1: Menys hores al banc */}
        <section className="bg-muted/30 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Menys hores al banc
            </h2>

            <div className="space-y-4 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">El dolor:</span>{' '}
                La feina administrativa s&apos;encalla quan has d&apos;entrar al banc i fer pagaments
                un a un, quan tens nòmines i factures agrupades, o quan has de fer reemborsaments
                i liquidacions a persones.
              </p>
              <p>
                <span className="font-medium text-foreground">La solució:</span>{' '}
                Amb Summa Social puges factures i nòmines, les revises, i generes una remesa de
                pagament agrupada per pujar al banc. Per tiquets i viatges, generes liquidacions
                automàtiques amb PDF. Després, quan importes l&apos;extracte, ho concilies amb el moviment real.
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              {[
                'Remeses de pagament (SEPA) per factures i nòmines: menys clics, menys errors.',
                'Liquidacions de tiquets, viatges i quilometratge amb PDF regenerable.',
                'Enllaç clar document ↔ pagament ↔ moviment bancari.',
                'Quan entra l\'extracte: conciliació i aplicació de categoria/proveïdor al moviment.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bloc 2: Remeses i devolucions que quadren */}
        <section className="px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Remeses i devolucions que quadren
            </h2>

            <div className="space-y-4 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">El dolor:</span>{' '}
                Quan el banc ingressa una remesa, tens un únic import agregat i perds el detall
                de qui ha pagat. I quan hi ha devolucions, el gener et rebenta: imports inflats,
                certificats incorrectes i discussions amb donants.
              </p>
              <p>
                <span className="font-medium text-foreground">La solució:</span>{' '}
                Summa Social desglossa remeses en quotes individuals, identifica socis i manté
                el detall necessari. Les devolucions queden registrades i aplicades al càlcul anual,
                perquè el certificat i el Model 182 reflecteixin el que realment s&apos;ha cobrat.
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              {[
                'Desglossament de remeses: saps què ha aportat cada soci.',
                'Devolucions assignades: el càlcul anual queda net i coherent.',
                'Traçabilitat: menys "misteris" i menys feina manual al tancament.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bloc 3: Gener i fiscalitat sense pànic */}
        <section className="bg-muted/30 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Gener i fiscalitat sense pànic
            </h2>

            <div className="space-y-4 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">El dolor:</span>{' '}
                El gener no falla: falta DNI, falta CP, hi ha devolucions pendents, i acabes
                muntant Excel a corre-cuita per enviar a la gestoria.
              </p>
              <p>
                <span className="font-medium text-foreground">La solució:</span>{' '}
                Summa Social t&apos;assenyala què falta i et genera els exports fiscals perquè
                tu només hagis d&apos;enviar a la gestoria un fitxer net, traçable i coherent amb el banc.
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              {[
                'Excel del Model 182 (donacions per donant, amb devolucions aplicades).',
                'Excel/CSV del Model 347 (operacions amb tercers).',
                'Certificats de donació en PDF (individuals o massius).',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bloc 4: Si fas cooperació internacional */}
        <section className="px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Si fas cooperació internacional
            </h2>

            <div className="space-y-4 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">El dolor:</span>{' '}
                Pressupostos en Excel, despeses disperses (terreny i viatges), i justificacions
                que es munten tard, amb risc d&apos;errors i d&apos;haver de &quot;rehacer-ho&quot; tot.
              </p>
              <p>
                <span className="font-medium text-foreground">La solució:</span>{' '}
                El mòdul de projectes connecta despesa real amb projecte i partida, mostra execució
                pressupostària i incorpora un assistent per quadrar justificacions abans d&apos;exportar.
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              {[
                'Importa pressupost des d\'Excel i crea partides.',
                'Execució per partida: pressupostat, executat i pendent.',
                'Mode "Quadrar justificació": ajustos i repartiments guiats.',
                'Captura ràpida de despeses de terreny/viatges i liquidacions per revisar i imputar després.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Què és / Què no és */}
        <section className="bg-muted/30 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">
              Què és (i què no és)
            </h2>

            <div className="grid sm:grid-cols-2 gap-8">
              {/* NO és */}
              <div className="space-y-4">
                <h3 className="font-semibold text-muted-foreground">
                  NO és
                </h3>
                <ul className="space-y-2">
                  {[
                    'Un ERP',
                    'Un programa de comptabilitat',
                    'Un CRM genèric',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 text-red-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* SÍ és */}
              <div className="space-y-4">
                <h3 className="font-semibold text-muted-foreground">
                  SÍ és
                </h3>
                <ul className="space-y-2">
                  {[
                    'Una eina per ordenar moviments, documents i contactes amb traçabilitat.',
                    'Un sistema per gestionar remeses, devolucions i donacions web de manera coherent.',
                    'Un generador d\'exports fiscals per enviar a la gestoria.',
                    'Per cooperació: control d\'execució i assistent de justificació.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Què resol Summa Social? */}
        <section id="que-resol-summa-social" className="px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">Què resol Summa Social?</h2>

            <div className="space-y-6 text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  Summa Social porta ordre, control i tranquil·litat a la gestió econòmica de les
                  entitats socials petites i mitjanes.
                </strong>
              </p>

              <p>
                <strong className="text-foreground">Conciliació bancària senzilla i ràpida:</strong>{' '}
                Importes l&apos;extracte i en pocs minuts tens tots els moviments classificats, sense
                errors de transcripció. La intel·ligència artificial reconeix automàticament
                proveïdors, socis i donants.
              </p>

              <p>
                <strong className="text-foreground">Fiscalitat a temps real, sense esforç:</strong>{' '}
                Models 182 i 347 amb un clic. Certificats de donació generats i enviats
                automàticament. Tot validat i llest per enviar a la gestoria o l&apos;AEAT.
              </p>

              <p>
                <strong className="text-foreground">
                  Remeses de quotes i pagaments en pocs segons:
                </strong>{' '}
                Divideix automàticament les remeses agrupades del banc. Genera fitxers SEPA per
                pagaments a proveïdors i nòmines. Fàcil, ràpid i sense errors.
              </p>

              <p>
                <strong className="text-foreground">Visió clara i actualitzada:</strong> Dashboard
                amb mètriques en temps real. Ingressos, despeses, balanç i alertes, tot visible
                d&apos;un cop d&apos;ull. Informes automàtics per a junta o patronat.
              </p>

              <p>
                <strong className="text-foreground">Control absolut de cada euro:</strong>{' '}
                Trazabilitat completa des del comprovant fins al moviment bancari. Justificació de
                subvencions amb un clic: Excel + totes les factures en un ZIP.
              </p>

              <p>
                <strong className="text-foreground">El resultat:</strong> més temps per a la missió
                de l&apos;entitat, menys temps amb fulls de càlcul i tasques repetitives. Gestió
                econòmica professional, accessible i sense complicacions.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/30 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">
              Preguntes freqüents
            </h2>

            <div className="space-y-6">
              {faqItems.map((item) => (
                <div key={item.question} className="border-b pb-6 last:border-0">
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-6 px-4">
          <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/privacitat" className="hover:underline">
              Privacitat
            </Link>
            <span>·</span>
            <Link href="/contacte" className="hover:underline">
              Contacte
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
