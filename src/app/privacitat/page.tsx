import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacitatPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center bg-background px-4 py-16">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <Logo className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Política de Privacitat
            </h1>
            <p className="text-sm text-muted-foreground">
              Última actualització: desembre 2024
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Responsable del tractament</h2>
              <p className="text-muted-foreground">
                Summa Social és una aplicació de gestió econòmica per a entitats socials.
                Per a qualsevol consulta relacionada amb la privacitat, pots contactar-nos a{' '}
                <a href="mailto:hola@summasocial.app" className="text-primary hover:underline">
                  hola@summasocial.app
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Dades que recollim</h2>
              <p className="text-muted-foreground">
                Summa Social processa les dades que les organitzacions introdueixen per gestionar
                la seva comptabilitat i fiscalitat:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Dades d&apos;accés (email, contrasenya xifrada)</li>
                <li>Dades de l&apos;organització (nom, CIF, adreça)</li>
                <li>Moviments bancaris importats</li>
                <li>Dades de contactes i donants</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Finalitat del tractament</h2>
              <p className="text-muted-foreground">
                Les dades es tracten exclusivament per oferir els serveis de l&apos;aplicació:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Gestió econòmica i conciliació bancària</li>
                <li>Generació de documents fiscals (Model 182, 347, certificats)</li>
                <li>Informes i estadístiques per a l&apos;organització</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Emmagatzematge i seguretat</h2>
              <p className="text-muted-foreground">
                Les dades s&apos;emmagatzemen a Firebase (Google Cloud Platform) amb seu a la Unió Europea.
                Utilitzem connexions xifrades (HTTPS) i autenticació segura per protegir l&apos;accés.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Drets dels usuaris</h2>
              <p className="text-muted-foreground">
                Pots exercir els teus drets d&apos;accés, rectificació, supressió i portabilitat
                contactant a{' '}
                <a href="mailto:hola@summasocial.app" className="text-primary hover:underline">
                  hola@summasocial.app
                </a>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Cookies</h2>
              <p className="text-muted-foreground">
                Summa Social utilitza cookies tècniques essencials per al funcionament de l&apos;aplicació
                (sessió d&apos;usuari). No utilitzem cookies de tercers ni de seguiment publicitari.
              </p>
            </section>
          </div>

          <div className="text-center pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar a l&apos;inici
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/contacte" className="hover:underline">
            Contacte
          </Link>
          <span>·</span>
          <span>Summa Social</span>
        </div>
      </footer>
    </main>
  );
}
