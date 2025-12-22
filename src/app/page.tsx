import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-lg text-center space-y-8">
          <Logo className="h-16 w-16 mx-auto text-primary" />

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Summa Social
            </h1>
            <p className="text-lg text-muted-foreground">
              Gestió econòmica senzilla per a entitats socials
            </p>
          </div>

          <ul className="text-left space-y-3 mx-auto max-w-xs">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">
                Conciliació bancària automàtica
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">
                Control de saldos i desquadraments
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">
                Fiscalitat: Model 182, 347, certificats
              </span>
            </li>
          </ul>

          <Button asChild size="lg" className="mt-8">
            <Link href="/login">
              Entrar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
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
