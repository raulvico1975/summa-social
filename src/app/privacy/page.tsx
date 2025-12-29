'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { X, Mail } from 'lucide-react';

export default function PrivacyPage() {
  const handleClose = () => {
    // Si la finestra es va obrir com a popup, la tanquem
    // Si no, tornem enrere en l'historial (fallback)
    if (window.opener || window.history.length <= 1) {
      window.close();
    } else {
      window.history.back();
    }
  };

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleClose}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Tancar</span>
          </button>
          <Logo className="h-8 w-8 text-primary" />
        </div>

        <Card>
          <CardContent className="p-6 md:p-10">
            {/* Títol */}
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Política de Privacitat
            </h1>
            <p className="text-muted-foreground mb-8">
              <strong>Última actualització</strong>: Desembre 2025<br />
              <strong>Contacte de privacitat</strong>: <a href="mailto:privacy@summasocial.app" className="text-primary hover:underline">privacy@summasocial.app</a>
            </p>

            <hr className="my-6" />

            {/* 1. Qui som */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Qui som</h2>
              <p className="text-muted-foreground mb-4">
                <strong className="text-foreground">Summa Social</strong> és una aplicació de gestió financera per a entitats socials, desenvolupada i mantinguda per Raül Vico, que actua com a responsable del tractament de les dades dels usuaris de l&apos;aplicació.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Responsable del tractament</strong> (per a dades d&apos;usuaris de l&apos;aplicació): Summa Social / Raül Vico</li>
                <li><strong className="text-foreground">Encarregat del tractament</strong> (per a dades de les entitats clients): Summa Social actua per compte de cada entitat, que és la responsable de les dades dels seus donants, socis, proveïdors i treballadors.</li>
              </ul>
            </section>

            <hr className="my-6" />

            {/* 2. Quines dades tractem */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Quines dades tractem</h2>

              <h3 className="text-lg font-medium mb-3">2.1 Usuaris de l&apos;aplicació (Summa Social és responsable)</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Dada</th>
                      <th className="text-left py-2 font-medium">Finalitat</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4">Email</td><td className="py-2">Identificació i accés al compte</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Nom</td><td className="py-2">Personalització de la interfície</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Rol</td><td className="py-2">Control d&apos;accés (Admin, User, Viewer)</td></tr>
                    <tr><td className="py-2 pr-4">Organitzacions</td><td className="py-2">Gestió multi-organització</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Les credencials d&apos;accés (contrasenyes) són gestionades per Firebase Authentication i no són accessibles per Summa Social.
              </p>

              <h3 className="text-lg font-medium mb-3">2.2 Dades de les entitats (Summa Social és encarregat)</h3>
              <p className="text-muted-foreground mb-3">Summa Social tracta les següents dades per compte de les entitats clients:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                <li><strong className="text-foreground">Donants i socis</strong>: nom, NIF, IBAN, adreça, email, telèfon</li>
                <li><strong className="text-foreground">Proveïdors</strong>: nom, NIF, dades de contacte</li>
                <li><strong className="text-foreground">Treballadors</strong>: nom, NIF, dades laborals</li>
                <li><strong className="text-foreground">Moviments bancaris</strong>: data, import, concepte, categoria</li>
              </ul>
              <p className="text-muted-foreground text-sm mb-2">
                La base legal i el deure d&apos;informar els interessats (donants, socis, etc.) correspon a cada entitat com a responsable del tractament.
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                Summa Social no tracta dades de categories especials segons l&apos;Art. 9 del RGPD.
              </p>
            </section>

            <hr className="my-6" />

            {/* 3. Base legal */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Base legal del tractament</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Tractament</th>
                      <th className="text-left py-2 font-medium">Base legal</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4">Usuaris de l&apos;aplicació</td><td className="py-2">Execució del contracte de servei (Art. 6.1.b RGPD)</td></tr>
                    <tr><td className="py-2 pr-4">Dades de les entitats</td><td className="py-2">Segons instruccions del responsable (entitat)</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <hr className="my-6" />

            {/* 4. Destinataris */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Destinataris de les dades</h2>

              <h3 className="text-lg font-medium mb-3">4.1 Subencarregats</h3>
              <p className="text-muted-foreground mb-3">Summa Social utilitza els següents serveis de Google/Firebase per al funcionament de l&apos;aplicació:</p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Servei</th>
                      <th className="text-left py-2 pr-4 font-medium">Ubicació</th>
                      <th className="text-left py-2 font-medium">Garanties</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4">Firebase Authentication</td><td className="py-2 pr-4">EUA</td><td className="py-2">Clàusules Contractuals Tipus (SCC) + Marc UE-EUA</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Firebase Firestore</td><td className="py-2 pr-4">UE (eur3)</td><td className="py-2">Dades dins l&apos;Espai Econòmic Europeu</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Firebase Storage</td><td className="py-2 pr-4">UE (eur3)</td><td className="py-2">Dades dins l&apos;Espai Econòmic Europeu</td></tr>
                    <tr><td className="py-2 pr-4">Firebase Hosting</td><td className="py-2 pr-4">Global (CDN)</td><td className="py-2">Només assets i aplicació web</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-medium mb-3">4.2 Cessions per obligació legal</h3>
              <p className="text-muted-foreground mb-2">Les entitats clients poden cedir dades a:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-2">
                <li><strong className="text-foreground">Agència Tributària</strong>: Model 182 (donatius), Model 347 (operacions amb tercers)</li>
                <li><strong className="text-foreground">Entitats bancàries</strong>: Gestió de remeses i rebuts</li>
              </ul>
              <p className="text-muted-foreground text-sm">Aquestes cessions són responsabilitat de cada entitat.</p>
            </section>

            <hr className="my-6" />

            {/* 5. Conservació */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Conservació de les dades</h2>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Tipus de dada</th>
                      <th className="text-left py-2 font-medium">Termini</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2 pr-4">Usuaris de l&apos;aplicació</td><td className="py-2">Mentre el compte estigui actiu + 12 mesos</td></tr>
                    <tr className="border-b"><td className="py-2 pr-4">Dades fiscals (entitats)</td><td className="py-2">Mínim 6 anys (obligacions mercantils i comptables)</td></tr>
                    <tr><td className="py-2 pr-4">Altres dades de contactes</td><td className="py-2">Segons política del responsable (entitat)</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm">
                Les còpies de seguretat es conserven durant períodes limitats i es gestionen segons les mesures descrites al document intern de seguretat.
              </p>
            </section>

            <hr className="my-6" />

            {/* 6. Drets */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Els teus drets</h2>
              <p className="text-muted-foreground mb-3">Com a interessat, tens dret a:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                <li><strong className="text-foreground">Accés</strong>: Sol·licitar una còpia de les teves dades</li>
                <li><strong className="text-foreground">Rectificació</strong>: Corregir dades inexactes</li>
                <li><strong className="text-foreground">Supressió</strong>: Sol·licitar l&apos;eliminació de les teves dades</li>
                <li><strong className="text-foreground">Oposició</strong>: Oposar-te a determinats tractaments</li>
                <li><strong className="text-foreground">Limitació</strong>: Sol·licitar la restricció del tractament</li>
                <li><strong className="text-foreground">Portabilitat</strong>: Rebre les teves dades en format estructurat</li>
              </ul>

              <h3 className="text-lg font-medium mb-3">Com exercir els teus drets</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
                <li><strong className="text-foreground">Usuaris de l&apos;aplicació</strong>: Escriu a <a href="mailto:privacy@summasocial.app" className="text-primary hover:underline">privacy@summasocial.app</a></li>
                <li><strong className="text-foreground">Donants, socis o altres interessats d&apos;una entitat</strong>: Contacta directament amb l&apos;entitat corresponent. Summa Social assistirà l&apos;entitat en la gestió de la teva sol·licitud.</li>
              </ul>
              <p className="text-muted-foreground text-sm mb-4">
                Termini de resposta: 1 mes (ampliable a 2 en casos complexos).
              </p>
              <p className="text-muted-foreground text-sm">
                Si consideres que els teus drets no han estat atesos correctament, pots presentar una reclamació davant l&apos;<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Agència Espanyola de Protecció de Dades (AEPD)</a>.
              </p>
            </section>

            <hr className="my-6" />

            {/* 7. Seguretat */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Seguretat</h2>
              <p className="text-muted-foreground mb-3">Summa Social implementa mesures tècniques i organitzatives per protegir les dades:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Xifratge en trànsit (HTTPS/TLS)</li>
                <li>Xifratge en repòs (infraestructura Google)</li>
                <li>Control d&apos;accés per rols</li>
                <li>Aïllament de dades entre organitzacions</li>
                <li>Gestió de sessions amb caducitat i mecanismes de tancament de sessió</li>
              </ul>
            </section>

            <hr className="my-6" />

            {/* 8. Canvis */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Canvis en aquesta política</h2>
              <p className="text-muted-foreground">
                Qualsevol modificació d&apos;aquesta política es comunicarà als usuaris a través de l&apos;aplicació. La data d&apos;&quot;Última actualització&quot; reflecteix la versió vigent.
              </p>
            </section>

            <hr className="my-6" />

            {/* 9. Contacte */}
            <section className="mb-4">
              <h2 className="text-xl font-semibold mb-4">9. Contacte</h2>
              <p className="text-muted-foreground mb-4">Per a qualsevol qüestió relacionada amb la privacitat:</p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Email</strong>: <a href="mailto:privacy@summasocial.app" className="text-primary hover:underline">privacy@summasocial.app</a></p>
                <p><strong>Responsable intern</strong>: Raül Vico</p>
                <p><strong>Titular del servei</strong>: Raül Vico (Espanya)</p>
                <p className="text-muted-foreground pt-2">
                  <strong>Delegat de Protecció de Dades (DPD/DPO)</strong>: no aplicable (Summa Social no està obligada a designar DPD segons l&apos;Art. 37 RGPD).
                </p>
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-primary" />
            <span>Summa Social</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:privacy@summasocial.app">
              <Mail className="h-4 w-4 mr-2" />
              Contactar
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
