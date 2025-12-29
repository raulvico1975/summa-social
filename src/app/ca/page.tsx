import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';

export default function LandingPageCA() {
  return (
    <main className="flex min-h-screen flex-col">
      <a
        href="#que-resol-summa-social"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Saltar al contingut
      </a>

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
              <Link href="/ca/funcionalitats">Funcionalitats</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contacte">Contacte</Link>
            </Button>
          </div>

          <nav aria-label="Navegació de seccions" className="pt-8">
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="#conciliacio-bancaria">Conciliació</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#remeses-devolucions">Remeses i devolucions</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#donacions-online">Donacions online</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#fiscalitat-certificats">Fiscalitat i certificats</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#despeses-pagaments-sepa">Factures i SEPA</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#tiquets-liquidacions">Tiquets i liquidacions</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#modul-projectes">Projectes</Link>
              </Button>
            </div>
          </nav>
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

      <Separator className="max-w-3xl mx-auto" />

      {/* 1. Conciliació bancària automàtica i seguiment de comptes */}
      <section id="conciliacio-bancaria" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Conciliació bancària automàtica i seguiment de comptes
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Quan s&apos;importa l&apos;extracte bancari, Summa Social posa en relació el que ja
              s&apos;ha treballat prèviament amb el que reflecteix el banc. Els moviments es
              reconcilien amb la documentació, els pagaments i les remeses existents, tot evitant
              duplicats i errors de transcripció.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#conciliacio-bancaria">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 2. Gestió complerta de remeses de socis i devolucions */}
      <section id="remeses-devolucions" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Gestió completa de remeses de socis i devolucions
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Quan l&apos;entitat rep una remesa agrupada del banc —per quotes de socis o aportacions
              periòdiques— Summa Social permet desglossar aquest ingrés i situar cada import en el
              seu lloc. La remesa deixa de ser una xifra única i passa a convertir-se en el detall
              necessari per saber qui ha aportat què i en quin moment.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#remeses-devolucions">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 3. Registre i control acurat de donacions online i ingressos web */}
      <section id="donacions-online" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Registre i control acurat de donacions online i ingressos web
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Quan l&apos;entitat rep donacions a través del web, els ingressos arriben al compte de
              forma agrupada. Summa Social permet incorporar aquests ingressos al sistema,
              identificar cada donació individual i situar-la dins del conjunt de la gestió
              econòmica, mantenint el vincle amb la persona que ha fet l&apos;aportació.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#donacions-online">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 4. Elaboració i enviament de models fiscals i certificats */}
      <section id="fiscalitat-certificats" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Elaboració i enviament en un click de models fiscals (182 i 347) i certificats de
            donació
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              A mesura que la informació econòmica s&apos;ha anat treballant amb criteri —ingressos,
              despeses, remeses i devolucions— la fiscalitat deixa de ser un exercici de
              reconstrucció. Summa Social permet generar els models fiscals i els certificats de
              donació a partir del que ja està ordenat i verificat dins del sistema.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#fiscalitat-certificats">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 5. Lectura ràpida de factures, nòmines i remeses SEPA */}
      <section id="despeses-pagaments-sepa" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Lectura ràpida assistida amb IA de factures, nòmines i elaboració de remeses de
            pagaments SEPA
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Summa Social permet incorporar al sistema la documentació econòmica que es genera en
              el dia a dia de l&apos;entitat —factures, nòmines i altres documents— simplement
              arrossegant els fitxers. Les dades rellevants s&apos;extreuen de manera intel·ligent i
              passen a formar part del flux administratiu, amb criteri i context des del primer
              moment.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#despeses-pagaments-sepa">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 6. Captura de tiquets i liquidacions */}
      <section id="tiquets-liquidacions" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Captura d&apos;imatges de rebuts i tiquets de viatge, i elaboració automàtica de
            liquidacions
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Quan l&apos;equip de l&apos;entitat fa desplaçaments, viatges o activitats fora de
              l&apos;oficina, Summa Social permet capturar de manera immediata els rebuts i tiquets
              que es van generant. Una simple fotografia des del mòbil és suficient perquè aquests
              comprovants quedin registrats dins del sistema, associats a la persona i al context en
              què s&apos;han produït.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#tiquets-liquidacions">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 7. Mòdul de Projectes */}
      <section id="modul-projectes" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Mòdul de Projectes opcional: execució pressupostària i assistent de justificacions
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Quan l&apos;entitat treballa amb projectes, la gestió econòmica requereix una lectura
              diferent: no només què s&apos;ha pagat, sinó a quin projecte correspon cada despesa i
              com s&apos;està executant el pressupost aprovat.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/ca/funcionalitats#modul-projectes">Llegir més →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-12">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/ca/funcionalitats" className="hover:underline">
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
