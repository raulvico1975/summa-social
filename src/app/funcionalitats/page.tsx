import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Summa Social | Funcionalitats',
  description:
    "Gestió econòmica i fiscal per a entitats socials petites i mitjanes d'Espanya. Conciliació bancària, Model 182/347, remeses SEPA i més.",
};

export default function FuncionalitatsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Intro */}
        <section id="summa-social" className="mb-16">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Summa Social</h1>

          <p className="text-lg text-muted-foreground mb-4">
            <strong className="text-foreground">
              Gestió econòmica i fiscal per a entitats petites i mitjanes d&apos;Espanya
            </strong>
            , amb conciliació bancària i exports per a la gestoria (Model 182 i 347).
          </p>

          <p className="text-muted-foreground">
            Summa Social porta{' '}
            <strong className="text-foreground">ordre, control i tranquil·litat</strong> a la
            gestió econòmica de les entitats socials petites i mitjanes.
          </p>
        </section>

        {/* Funcionalitats */}
        <section id="funcionalitats">
          <h2 className="text-2xl font-bold mb-10">15 Principals Funcionalitats de Summa Social</h2>

          <div className="space-y-12">
            {/* 1. Conciliació Bancària Automàtica */}
            <article id="conciliacio-bancaria">
              <h3 className="text-xl font-semibold mb-3">1. Conciliació Bancària Automàtica</h3>
              <p className="text-muted-foreground mb-4">
                Importes l&apos;extracte del banc i Summa Social trova automàticament els moviments
                duplicats i els enllaça amb les operacions que ja tens registrades. Tot queda
                traçable per compte bancari.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Importació d&apos;extractes (CSV, Excel, OFX) de qualsevol banc</li>
                <li>Detecció automàtica de duplicats</li>
                <li>Suport multi-compte amb trazabilitat completa</li>
                <li>Visió clara de l&apos;estat de cada compte</li>
              </ul>
            </article>

            {/* 2. Auto-assignació Intel·ligent amb IA */}
            <article>
              <h3 className="text-xl font-semibold mb-3">2. Auto-assignació Intel·ligent amb IA</h3>
              <p className="text-muted-foreground mb-4">
                Quan importes moviments, Summa Social reconeix automàticament els teus proveïdors,
                socis, donants i treballadors. La intel·ligència artificial intervé quan cal,
                aprenen de les teves decisions anteriors i cada cop és més intel·ligent.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Reconeixement automàtic per nom, IBAN o DNI</li>
                <li>Assignació automàtica de categoria per defecte</li>
                <li>Memòria de decisions anteriors</li>
                <li>Aprenentatge progressiu amb IA</li>
              </ul>
            </article>

            {/* 3. Divisor de Remeses IN (Quotes de Socis) */}
            <article id="remeses-devolucions">
              <h3 className="text-xl font-semibold mb-3">
                3. Divisor de Remeses IN (Quotes de Socis)
              </h3>
              <p className="text-muted-foreground mb-4">
                Quan el banc t&apos;ingressa una remesa agrupada de les quotes que els socis paguen,
                Summa Social la desglossa automàticament assignant cada import al soci corresponent.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Descomposició automàtica per IBAN/DNI/Nom</li>
                <li>Detecció de quotes impagades i remeses parcials</li>
                <li>Assignació individual amb historial complet</li>
                <li>Visió clara de qui està al corrent i qui no</li>
              </ul>
            </article>

            {/* 4. Gestor de Despeses i Nòmines amb Generador de Remeses SEPA */}
            <article id="despeses-pagaments-sepa">
              <h3 className="text-xl font-semibold mb-3">
                4. Gestor de Despeses i Nòmines amb Generador de Remeses SEPA
              </h3>
              <p className="text-muted-foreground mb-4">
                Arrossega ràpidament factures i nòmines a Summa Social, confirma les dades que
                s&apos;extreuen automàticament (IA) i genera una remesa de pagaments per pujar al
                banc.
              </p>
              <p id="tiquets-liquidacions" className="text-muted-foreground mb-4">
                <strong className="text-foreground">Novetat:</strong> captura de tiquets, viatges i
                quilometratge amb liquidacions automàtiques en PDF.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Remeses de pagament (SEPA) per factures i nòmines</li>
                <li>Extracció automàtica de dades amb IA</li>
                <li>
                  Liquidacions de tiquets, viatges i quilometratge amb PDF regenerable
                </li>
                <li>Enllaç clar document ↔ pagament ↔ moviment bancari</li>
                <li>Quan entra l&apos;extracte: conciliació automàtica</li>
              </ul>
            </article>

            {/* 5. Gestió Fiscal Automatitzada (Model 182 i 347) */}
            <article id="fiscalitat-certificats">
              <h3 className="text-xl font-semibold mb-3">
                5. Gestió Fiscal Automatitzada (Model 182 i 347)
              </h3>
              <p className="text-muted-foreground mb-4">
                Genera els fitxers per Hisenda amb validació prèvia i formats llestos per enviar a
                la gestoria.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Model 182 amb validació de requisits legals</li>
                <li>Model 347 automàtic</li>
                <li>Comprovació de CIF/DNI/NIE i dades postals</li>
                <li>Exportació Excel per a la gestoria</li>
              </ul>
            </article>

            {/* 6. Certificats de Donació Automàtics */}
            <article>
              <h3 className="text-xl font-semibold mb-3">6. Certificats de Donació Automàtics</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Generació PDF amb logo i signatura digital</li>
                <li>Enviament individual o massiu per email</li>
                <li>Control complet d&apos;enviaments</li>
                <li>Compliment LOPDGDD automàtic</li>
              </ul>
            </article>

            {/* 7. Classificació de Moviments amb Memòria */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                7. Classificació de Moviments amb Memòria
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Categories comptables personalitzables</li>
                <li>Auto-categorització intel·ligent amb IA</li>
                <li>Memòria persistent</li>
                <li>Assignació massiva per lots</li>
              </ul>
            </article>

            {/* 8. Dashboard Directiu amb Mètriques en Temps Real */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                8. Dashboard Directiu amb Mètriques en Temps Real
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Indicadors clau sempre visibles</li>
                <li>Filtres per període</li>
                <li>Alertes prioritzades</li>
                <li>Gràfics d&apos;evolució</li>
                <li>Export PDF d&apos;informes per a junta/patronat</li>
              </ul>
            </article>

            {/* 9. Gestió Multi-contacte amb Tipologies */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                9. Gestió Multi-contacte amb Tipologies
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Donants, socis, proveïdors, treballadors i contraparts</li>
                <li>Validació automàtica de CIF/DNI/NIE i IBANs</li>
                <li>Importació massiva amb mapping flexible</li>
                <li>Estats operatius</li>
              </ul>
            </article>

            {/* 10. Gestió de Devolucions Bancàries */}
            <article>
              <h3 className="text-xl font-semibold mb-3">10. Gestió de Devolucions Bancàries</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Importador específic de devolucions</li>
                <li>Matching automàtic amb el donant</li>
                <li>Seguiment de quotes pendents</li>
                <li>Exclusió automàtica del Model 182</li>
              </ul>
            </article>

            {/* 11. Integració Stripe per Donacions Online */}
            <article id="donacions-online">
              <h3 className="text-xl font-semibold mb-3">
                11. Integració Stripe per Donacions Online
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Separació donació vs comissió</li>
                <li>Matching per email</li>
                <li>Creació automàtica de donants</li>
                <li>Trazabilitat completa</li>
              </ul>
            </article>

            {/* 12. Mòdul de Projectes i Subvencions */}
            <article id="modul-projectes">
              <h3 className="text-xl font-semibold mb-3">12. Mòdul de Projectes i Subvencions</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Execució vs pressupostat</li>
                <li>Assignació parcial de despeses</li>
                <li>Captura fotogràfica de despeses de terreny</li>
                <li>Export justificació (Excel + ZIP)</li>
                <li>Gestió multi-moneda</li>
              </ul>
            </article>

            {/* 13. Arquitectura Multi-organització amb Seguretat Europea */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                13. Arquitectura Multi-organització amb Seguretat Europea
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Aïllament total de dades</li>
                <li>Rols i permisos</li>
                <li>Compliment RGPD/LOPDGDD</li>
                <li>Servidors UE</li>
              </ul>
            </article>

            {/* 14. Exportació de Dades i Informes */}
            <article>
              <h3 className="text-xl font-semibold mb-3">14. Exportació de Dades i Informes</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Excel, CSV i PDF</li>
                <li>Models oficials AEAT</li>
                <li>Exports per contacte, projecte o període</li>
              </ul>
            </article>

            {/* 15. Sistema d'Alertes Intel·ligent */}
            <article>
              <h3 className="text-xl font-semibold mb-3">15. Sistema d&apos;Alertes Intel·ligent</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Alertes crítiques i informatives</li>
                <li>Enllaços directes a resolució</li>
                <li>Priorització automàtica</li>
              </ul>
            </article>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Button asChild size="lg">
            <Link href="/login">Entrar a Summa Social</Link>
          </Button>
        </div>
      </div>

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
  );
}
