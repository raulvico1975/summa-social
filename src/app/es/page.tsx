import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';

const BASE_URL = 'https://summasocial.app';

export const metadata: Metadata = {
  title: 'Summa Social | Gestión económica para entidades',
  description:
    'Gestión económica y fiscal para entidades sociales pequeñas y medianas de España. Conciliación bancaria, Modelo 182/347, remesas SEPA y más.',
  alternates: {
    canonical: `${BASE_URL}/es`,
    languages: {
      'ca': `${BASE_URL}/ca`,
      'es': `${BASE_URL}/es`,
      'x-default': `${BASE_URL}/ca`,
    },
  },
};

export default function LandingPageES() {
  return (
    <main className="flex min-h-screen flex-col">
      <a
        href="#que-resuelve-summa-social"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Saltar al contenido
      </a>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Logo className="h-16 w-16 mx-auto text-primary" />

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Summa Social</h1>

          <p className="text-lg text-muted-foreground">
            Gestión económica y fiscal para entidades pequeñas y medianas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg">
              <Link href="/login">
                Entrar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/es/funcionalitats">Funcionalidades</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contacte">Contacto</Link>
            </Button>
          </div>

          <nav aria-label="Navegación de secciones" className="pt-8">
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="#conciliacion-bancaria">Conciliación</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#remesas-devoluciones">Remesas y devoluciones</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#donaciones-online">Donaciones online</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#fiscalidad-certificados">Fiscalidad y certificados</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#gastos-pagos-sepa">Facturas y SEPA</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#tickets-liquidaciones">Tickets y liquidaciones</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="#modulo-proyectos">Proyectos</Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>

      {/* ¿Qué resuelve Summa Social? */}
      <section id="que-resuelve-summa-social" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">¿Qué resuelve Summa Social?</h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              <strong>
                Summa Social aporta orden, control y tranquilidad a la gestión económica de las
                entidades sociales pequeñas y medianas.
              </strong>
            </p>

            <p>
              <strong>Conciliación bancaria sencilla y rápida:</strong> Importas el extracto y en
              pocos minutos tienes todos los movimientos clasificados, sin errores de transcripción. La
              inteligencia artificial reconoce automáticamente proveedores, socios y donantes.
            </p>

            <p>
              <strong>Fiscalidad en tiempo real, sin esfuerzo:</strong> Modelos 182 y 347 con un clic.
              Certificados de donación generados y enviados automáticamente. Todo validado y listo para
              enviar a la gestoría o la AEAT.
            </p>

            <p>
              <strong>Remesas de cuotas y pagos en pocos segundos:</strong> Divide automáticamente
              las remesas agrupadas del banco. Genera ficheros SEPA para pagos a proveedores y
              nóminas. Fácil, rápido y sin errores.
            </p>

            <p>
              <strong>Visión clara y actualizada:</strong> Dashboard con métricas en tiempo real.
              Ingresos, gastos, balance y alertas, todo visible de un vistazo. Informes
              automáticos para junta o patronato.
            </p>

            <p>
              <strong>Control absoluto de cada euro:</strong> Trazabilidad completa desde el comprobante
              hasta el movimiento bancario. Justificación de subvenciones con un clic: Excel + todas las
              facturas en un ZIP.
            </p>

            <p>
              <strong>El resultado:</strong> más tiempo para la misión de la entidad, menos tiempo
              con hojas de cálculo y tareas repetitivas. Gestión económica profesional, accesible y
              sin complicaciones.
            </p>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 1. Conciliación bancaria automática y seguimiento de cuentas */}
      <section id="conciliacion-bancaria" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Conciliación bancaria automática y seguimiento de cuentas
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Cuando se importa el extracto bancario, Summa Social pone en relación lo que ya
              se ha trabajado previamente con lo que refleja el banco. Los movimientos se
              reconcilian con la documentación, los pagos y las remesas existentes, evitando
              duplicados y errores de transcripción.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#conciliacion-bancaria">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 2. Gestión completa de remesas de socios y devoluciones */}
      <section id="remesas-devoluciones" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Gestión completa de remesas de socios y devoluciones
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Cuando la entidad recibe una remesa agrupada del banco —por cuotas de socios o aportaciones
              periódicas— Summa Social permite desglosar este ingreso y situar cada importe en su
              lugar. La remesa deja de ser una cifra única y pasa a convertirse en el detalle
              necesario para saber quién ha aportado qué y en qué momento.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#remesas-devoluciones">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 3. Registro y control preciso de donaciones online e ingresos web */}
      <section id="donaciones-online" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Registro y control preciso de donaciones online e ingresos web
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Cuando la entidad recibe donaciones a través de la web, los ingresos llegan a la cuenta de
              forma agrupada. Summa Social permite incorporar estos ingresos al sistema,
              identificar cada donación individual y situarla dentro del conjunto de la gestión
              económica, manteniendo el vínculo con la persona que ha hecho la aportación.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#donaciones-online">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 4. Elaboración y envío de modelos fiscales y certificados */}
      <section id="fiscalidad-certificados" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Elaboración y envío en un clic de modelos fiscales (182 y 347) y certificados de
            donación
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              A medida que la información económica se ha ido trabajando con criterio —ingresos,
              gastos, remesas y devoluciones— la fiscalidad deja de ser un ejercicio de
              reconstrucción. Summa Social permite generar los modelos fiscales y los certificados de
              donación a partir de lo que ya está ordenado y verificado dentro del sistema.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#fiscalidad-certificados">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 5. Lectura rápida de facturas, nóminas y remesas SEPA */}
      <section id="gastos-pagos-sepa" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Lectura rápida asistida con IA de facturas, nóminas y elaboración de remesas de
            pagos SEPA
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Summa Social permite incorporar al sistema la documentación económica que se genera en
              el día a día de la entidad —facturas, nóminas y otros documentos— simplemente
              arrastrando los ficheros. Los datos relevantes se extraen de manera inteligente y
              pasan a formar parte del flujo administrativo, con criterio y contexto desde el primer
              momento.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#gastos-pagos-sepa">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 6. Captura de tickets y liquidaciones */}
      <section id="tickets-liquidaciones" className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Captura de imágenes de recibos y tickets de viaje, y elaboración automática de
            liquidaciones
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Cuando el equipo de la entidad hace desplazamientos, viajes o actividades fuera de
              la oficina, Summa Social permite capturar de manera inmediata los recibos y tickets
              que se van generando. Una simple fotografía desde el móvil es suficiente para que estos
              comprobantes queden registrados dentro del sistema, asociados a la persona y al contexto en
              que se han producido.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#tickets-liquidaciones">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 7. Módulo de Proyectos */}
      <section id="modulo-proyectos" className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">
            Módulo de Proyectos opcional: ejecución presupuestaria y asistente de justificaciones
          </h2>

          <div className="mt-6 text-muted-foreground">
            <p>
              Cuando la entidad trabaja con proyectos, la gestión económica requiere una lectura
              diferente: no solo qué se ha pagado, sino a qué proyecto corresponde cada gasto y
              cómo se está ejecutando el presupuesto aprobado.
            </p>
            <div className="pt-4">
              <Button variant="link" asChild className="px-0 text-sm font-medium text-primary hover:underline">
                <Link href="/es/funcionalitats#modulo-proyectos">Leer más →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-12">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/es/funcionalitats" className="hover:underline">
            Funcionalidades
          </Link>
          <span>·</span>
          <Link href="/privacitat" className="hover:underline">
            Privacidad
          </Link>
          <span>·</span>
          <Link href="/contacte" className="hover:underline">
            Contacto
          </Link>
        </div>
      </footer>
    </main>
  );
}
