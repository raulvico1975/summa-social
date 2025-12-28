import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, X, Check } from 'lucide-react';

// FAQ data per reutilitzar al JSON-LD
const faqItems = [
  {
    question: 'Què és Summa Social?',
    answer:
      "És una aplicació web de gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya, centrada en conciliació bancària i fiscalitat (Model 182 i 347).",
  },
  {
    question: 'Per a què serveix?',
    answer:
      "Serveix per importar i ordenar moviments bancaris, controlar devolucions i preparar informes fiscals i certificats de donació sense dependre d'Excel.",
  },
  {
    question: 'És un programa de comptabilitat?',
    answer:
      'No. Summa Social se situa abans de la comptabilitat: ordena i prepara les dades perquè la gestoria faci la feina fiscal amb seguretat.',
  },
  {
    question: 'Quines entitats el poden fer servir?',
    answer:
      "Associacions, fundacions i ONGs d'Espanya que gestionen donacions, quotes o operacions amb tercers.",
  },
  {
    question: 'Inclou el Model 182 i el Model 347?',
    answer:
      'Sí. Genera els fitxers i exports necessaris i permet emetre certificats de donació coherents amb el càlcul anual.',
  },
  {
    question: 'Com gestiona devolucions i remeses?',
    answer:
      "Permet tractar devolucions i remeses amb traçabilitat, mantenint el moviment bancari original i generant el detall necessari per al càlcul fiscal.",
  },
  {
    question: 'Serveix per gestionar projectes de cooperació?',
    answer:
      "Sí. Permet imputar despeses a projectes, seguir l'execució pressupostària i preparar la base econòmica de la justificació de projectes de cooperació.",
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
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Gestió econòmica i fiscal per a ONGs petites i mitjanes d&apos;Espanya:
                conciliació bancària i preparació del Model 182 i 347.
              </p>
              <p className="text-sm text-muted-foreground/80">
                Per deixar enrere l&apos;Excel, controlar devolucions i tenir un Excel net
                llest per a la gestoria.
              </p>
            </div>

            <ul className="text-left space-y-3 mx-auto max-w-md">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Quadra el banc: moviments, saldos, desquadraments i remeses.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Controla devolucions i traçabilitat de les donacions.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Prepara fiscalitat: Model 182, Model 347 i certificats de donació.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  Ordena donants i proveïdors amb les dades mínimes obligatòries.
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
          </div>
        </div>

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
                  Summa Social NO és
                </h3>
                <ul className="space-y-2">
                  {[
                    'Un ERP',
                    'Un programa de comptabilitat',
                    'Un CRM de donants',
                    'Una eina genèrica per a empreses',
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
                  Summa Social SÍ és
                </h3>
                <ul className="space-y-2">
                  {[
                    'Una eina per conciliar el banc i detectar desquadraments',
                    'Un sistema per controlar devolucions i remeses',
                    'Una manera directa d\'arribar al Model 182 i 347 amb dades coherents',
                    'Una alternativa real a l\'Excel per a la gestió econòmica d\'una ONG',
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

        {/* Casos d'ús */}
        <section className="px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">
              Quan et serà útil
            </h2>

            <ul className="space-y-4 max-w-xl mx-auto">
              {[
                'Quan arriba el gener i has de preparar el Model 182 sense errors.',
                'Quan el banc retorna rebuts i necessites saber de quin donant són.',
                'Quan la gestoria et demana un Excel net i coherent.',
                'Quan l\'equip treballa amb Excel i ningú confia del tot en les dades.',
                'Quan tens remeses i vols saber què ha donat cada soci.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Projectes i cooperació */}
        <section className="bg-muted/30 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">
              Projectes i cooperació internacional
            </h2>

            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Summa Social inclou un mòdul de projectes pensat per a entitats que fan
              cooperació internacional i necessiten imputar despeses i fer seguiment de
              l&apos;execució econòmica dels seus projectes.
            </p>

            <ul className="space-y-3 max-w-xl mx-auto">
              {[
                'Assigna despeses reals a projectes i partides pressupostàries.',
                'Permet veure l\'execució econòmica a partir de dades ja conciliades.',
                'Ajuda a preparar la base econòmica de la justificació sense tornar a l\'Excel.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16">
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
