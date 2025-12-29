import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Logo className="h-16 w-16 mx-auto text-primary" />

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Summa Social</h1>

          <p className="text-lg text-muted-foreground">
            Gestió econòmica i fiscal per a entitats petites i mitjanes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
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

      {/* Què resol Summa Social? */}
      <section id="que-resol-summa-social" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">Què resol Summa Social?</h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              <strong>
                Summa Social porta ordre, control i tranquil·litat a la gestió econòmica de les
                entitats socials petites i mitjanes.
              </strong>
            </p>

            <p>
              <strong>Conciliació bancària senzilla i ràpida:</strong> Importes l&apos;extracte i en
              pocs minuts tens tots els moviments classificats, sense errors de transcripció. La
              intel·ligència artificial reconeix automàticament proveïdors, socis i donants.
            </p>

            <p>
              <strong>Fiscalitat a temps real, sense esforç:</strong> Models 182 i 347 amb un clic.
              Certificats de donació generats i enviats automàticament. Tot validat i llest per
              enviar a la gestoria o l&apos;AEAT.
            </p>

            <p>
              <strong>Remeses de quotes i pagaments en pocs segons:</strong> Divideix automàticament
              les remeses agrupades del banc. Genera fitxers SEPA per pagaments a proveïdors i
              nòmines. Fàcil, ràpid i sense errors.
            </p>

            <p>
              <strong>Visió clara i actualitzada:</strong> Dashboard amb mètriques en temps real.
              Ingressos, despeses, balanç i alertes, tot visible d&apos;un cop d&apos;ull. Informes
              automàtics per a junta o patronat.
            </p>

            <p>
              <strong>Control absolut de cada euro:</strong> Trazabilitat completa des del comprovant
              fins al moviment bancari. Justificació de subvencions amb un clic: Excel + totes les
              factures en un ZIP.
            </p>

            <p>
              <strong>El resultat:</strong> més temps per a la missió de l&apos;entitat, menys temps
              amb fulls de càlcul i tasques repetitives. Gestió econòmica professional, accessible i
              sense complicacions.
            </p>
          </div>
        </div>
      </section>

      {/* 1. Conciliació bancària automàtica i seguiment de comptes */}
      <section id="conciliacio-bancaria" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Conciliació bancària automàtica i seguiment de comptes
          </h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              Quan s&apos;importa l&apos;extracte bancari, Summa Social posa en relació el que ja
              s&apos;ha treballat prèviament amb el que reflecteix el banc. Els moviments es
              reconcilien amb la documentació, els pagaments i les remeses existents, tot evitant
              duplicats i errors de transcripció.
            </p>
            <p>
              Aquest procés permet tenir una visió clara de l&apos;estat de cada compte: què està
              conciliat, què queda pendent de revisar, i quin és el saldo real en cada moment.
            </p>
            <p>
              A partir d&apos;aquí, el seguiment dels comptes bancaris esdevé més fiable: es pot
              verificar que tot quadra, detectar desviacions a temps i actuar amb criteri.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Gestió complerta de remeses de socis i devolucions */}
      <section id="remeses-devolucions" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Gestió completa de remeses de socis i devolucions
          </h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              Quan l&apos;entitat rep una remesa agrupada del banc —per quotes de socis o aportacions
              periòdiques— Summa Social permet desglossar aquest ingrés i situar cada import en el
              seu lloc. La remesa deixa de ser una xifra única i passa a convertir-se en el detall
              necessari per saber qui ha aportat què i en quin moment.
            </p>
            <p>
              Aquest mateix flux permet gestionar les devolucions quan es produeixen. Quan un rebut
              és retornat pel banc, queda identificat i integrat dins del conjunt de moviments de
              l&apos;entitat, mantenint la coherència amb la resta de la informació econòmica i amb
              els càlculs posteriors.
            </p>
            <p>
              Així, tant les quotes cobrades com les devolucions formen part d&apos;un mateix
              circuit: ingressos, ajustos i resultat final queden connectats sense haver de
              reconstruir informació a posteriori ni revisar fulls de càlcul paral·lels.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Registre i control acurat de donacions online i ingressos web */}
      <section id="donacions-online" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Registre i control acurat de donacions online i ingressos web
          </h2>

          <div className="space-y-4 text-muted-foreground">
            <p>
              Importa els pagaments de Stripe o altres passarel·les i desglossa cada payout en
              donacions individuals, separant automàticament la comissió de la plataforma.
            </p>
            <p>
              Cada donació queda vinculada al donant corresponent mitjançant el seu email o DNI, amb
              traçabilitat completa des de la transacció fins al certificat fiscal.
            </p>
            <p>
              Si el donant no existeix, Summa Social el crea automàticament amb les dades disponibles
              perquè no es perdi cap aportació.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Elaboració i enviament de models fiscals i certificats */}
      <section id="fiscalitat-certificats" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Elaboració i enviament de models fiscals (182 i 347) i certificats de donació
          </h2>

          <div className="space-y-4 text-muted-foreground">
            <p>
              Genera l&apos;Excel del Model 182 amb totes les donacions agregades per donant,
              incloent la validació de DNI/CIF, codi postal i requisits legals. Les devolucions ja
              estan descomptades.
            </p>
            <p>
              El Model 347 (operacions amb tercers) es genera automàticament a partir dels moviments
              classificats, llest per enviar a la gestoria.
            </p>
            <p>
              Els certificats de donació es generen en PDF amb el logo i signatura de l&apos;entitat,
              i es poden enviar per email de forma individual o massiva.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Lectura ràpida de factures, nòmines i remeses SEPA */}
      <section id="despeses-pagaments-sepa" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Lectura ràpida assistida amb IA de factures, nòmines i elaboració de remeses de
            pagaments SEPA
          </h2>

          <div className="space-y-4 text-muted-foreground">
            <p>
              Arrossega factures i nòmines en PDF i Summa Social extreu automàticament les dades
              principals: proveïdor, import, IBAN i data de venciment.
            </p>
            <p>
              Revisa les dades extretes, agrupa els pagaments pendents i genera una remesa SEPA
              (pain.001) per pujar directament al banc.
            </p>
            <p>
              Quan importes l&apos;extracte bancari, els pagaments es concilien automàticament amb
              els documents originals, mantenint la traçabilitat completa.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Captura de tiquets i liquidacions */}
      <section id="tiquets-liquidacions" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Captura imatges de rebuts i tiquets de viatge amb el mòbil i elabora automàticament els
            fulls de liquidació
          </h2>

          <div className="space-y-4 text-muted-foreground">
            <p>
              Des del mòbil, captura fotos de tiquets, rebuts i comprovants de viatge. La IA extreu
              automàticament les dades principals: import, data, concepte i proveïdor.
            </p>
            <p>
              Agrupa les despeses per persona o per viatge i genera un full de liquidació en PDF,
              llest per revisar i aprovar.
            </p>
            <p>
              Les liquidacions aprovades es converteixen en pagaments pendents que es poden incloure
              en una remesa SEPA. Quan s&apos;executa el pagament i entra l&apos;extracte, la
              conciliació és automàtica.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Mòdul de Projectes */}
      <section id="modul-projectes" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            Mòdul de Projectes opcional: execució pressupostària i assistent de justificacions
          </h2>

          <div className="space-y-4 text-muted-foreground">
            <p>
              Importa el pressupost aprovat des d&apos;Excel i crea les partides del projecte. Summa
              Social mostra en temps real l&apos;execució per partida: pressupostat, executat i
              pendent.
            </p>
            <p>
              Assigna despeses a partides de forma parcial o total. L&apos;assistent de justificació
              guia el procés per quadrar imports abans d&apos;exportar.
            </p>
            <p>
              Exporta la justificació en format Excel amb totes les factures i comprovants en un ZIP,
              llest per presentar al finançador.
            </p>
            <p>
              Per a projectes de cooperació internacional, inclou suport multidivisa i captura ràpida
              de despeses de terreny des del mòbil.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-12">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/funcionalitats" className="hover:underline">
            Funcionalitats
          </Link>
          <span>·</span>
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
