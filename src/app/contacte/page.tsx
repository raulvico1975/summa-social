import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ContactePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-lg text-center space-y-8">
          <Logo className="h-12 w-12 mx-auto text-primary" />

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Contacte
            </h1>
            <p className="text-muted-foreground">
              Tens dubtes o suggeriments? Escriu-nos.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <a
                href="mailto:hola@summasocial.app"
                className="text-lg font-medium hover:underline"
              >
                hola@summasocial.app
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Respondrem tan aviat com sigui possible.
            </p>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tornar a l&apos;inici
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
          <span>Summa Social</span>
        </div>
      </footer>
    </main>
  );
}
