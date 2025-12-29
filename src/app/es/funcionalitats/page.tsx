import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Summa Social | Funcionalidades',
  description:
    "Gestión económica y fiscal para entidades sociales pequeñas y medianas de España. Conciliación bancaria, Modelo 182/347, remesas SEPA y más.",
};

export default function FuncionalitatsPageES() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/es">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
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
              Gestión económica y fiscal para entidades pequeñas y medianas de España
            </strong>
            , con conciliación bancaria y exports para la gestoría (Modelo 182 y 347).
          </p>

          <p className="text-muted-foreground">
            Summa Social aporta{' '}
            <strong className="text-foreground">orden, control y tranquilidad</strong> a la
            gestión económica de las entidades sociales pequeñas y medianas.
          </p>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades">
          <h2 className="text-2xl font-bold mb-10">15 Principales Funcionalidades de Summa Social</h2>

          <div className="space-y-12">
            {/* 1. Conciliación Bancaria Automática */}
            <article id="conciliacion-bancaria">
              <h3 className="text-xl font-semibold mb-3">1. Conciliación Bancaria Automática</h3>
              <p className="text-muted-foreground mb-4">
                Importas el extracto del banco y Summa Social encuentra automáticamente los movimientos
                duplicados y los enlaza con las operaciones que ya tienes registradas. Todo queda
                trazable por cuenta bancaria.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Importación de extractos (CSV, Excel, OFX) de cualquier banco</li>
                <li>Detección automática de duplicados</li>
                <li>Soporte multi-cuenta con trazabilidad completa</li>
                <li>Visión clara del estado de cada cuenta</li>
              </ul>
            </article>

            {/* 2. Auto-asignación Inteligente con IA */}
            <article>
              <h3 className="text-xl font-semibold mb-3">2. Auto-asignación Inteligente con IA</h3>
              <p className="text-muted-foreground mb-4">
                Cuando importas movimientos, Summa Social reconoce automáticamente tus proveedores,
                socios, donantes y trabajadores. La inteligencia artificial interviene cuando es necesario,
                aprende de tus decisiones anteriores y cada vez es más inteligente.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Reconocimiento automático por nombre, IBAN o DNI</li>
                <li>Asignación automática de categoría por defecto</li>
                <li>Memoria de decisiones anteriores</li>
                <li>Aprendizaje progresivo con IA</li>
              </ul>
            </article>

            {/* 3. Divisor de Remesas IN (Cuotas de Socios) */}
            <article id="remesas-devoluciones">
              <h3 className="text-xl font-semibold mb-3">
                3. Divisor de Remesas IN (Cuotas de Socios)
              </h3>
              <p className="text-muted-foreground mb-4">
                Cuando el banco te ingresa una remesa agrupada de las cuotas que los socios pagan,
                Summa Social la desglosa automáticamente asignando cada importe al socio correspondiente.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Descomposición automática por IBAN/DNI/Nombre</li>
                <li>Detección de cuotas impagadas y remesas parciales</li>
                <li>Asignación individual con historial completo</li>
                <li>Visión clara de quién está al corriente y quién no</li>
              </ul>
            </article>

            {/* 4. Gestor de Gastos y Nóminas con Generador de Remesas SEPA */}
            <article id="gastos-pagos-sepa">
              <h3 className="text-xl font-semibold mb-3">
                4. Gestor de Gastos y Nóminas con Generador de Remesas SEPA
              </h3>
              <p className="text-muted-foreground mb-4">
                Arrastra rápidamente facturas y nóminas a Summa Social, confirma los datos que
                se extraen automáticamente (IA) y genera una remesa de pagos para subir al
                banco.
              </p>
              <p id="tickets-liquidaciones" className="text-muted-foreground mb-4">
                <strong className="text-foreground">Novedad:</strong> captura de tickets, viajes y
                kilometraje con liquidaciones automáticas en PDF.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Remesas de pago (SEPA) para facturas y nóminas</li>
                <li>Extracción automática de datos con IA</li>
                <li>
                  Liquidaciones de tickets, viajes y kilometraje con PDF regenerable
                </li>
                <li>Enlace claro documento ↔ pago ↔ movimiento bancario</li>
                <li>Cuando entra el extracto: conciliación automática</li>
              </ul>
            </article>

            {/* 5. Gestión Fiscal Automatizada (Modelo 182 y 347) */}
            <article id="fiscalidad-certificados">
              <h3 className="text-xl font-semibold mb-3">
                5. Gestión Fiscal Automatizada (Modelo 182 y 347)
              </h3>
              <p className="text-muted-foreground mb-4">
                Genera los ficheros para Hacienda con validación previa y formatos listos para enviar a
                la gestoría.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Modelo 182 con validación de requisitos legales</li>
                <li>Modelo 347 automático</li>
                <li>Comprobación de CIF/DNI/NIE y datos postales</li>
                <li>Exportación Excel para la gestoría</li>
              </ul>
            </article>

            {/* 6. Certificados de Donación Automáticos */}
            <article>
              <h3 className="text-xl font-semibold mb-3">6. Certificados de Donación Automáticos</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Generación PDF con logo y firma digital</li>
                <li>Envío individual o masivo por email</li>
                <li>Control completo de envíos</li>
                <li>Cumplimiento LOPDGDD automático</li>
              </ul>
            </article>

            {/* 7. Clasificación de Movimientos con Memoria */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                7. Clasificación de Movimientos con Memoria
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Categorías contables personalizables</li>
                <li>Auto-categorización inteligente con IA</li>
                <li>Memoria persistente</li>
                <li>Asignación masiva por lotes</li>
              </ul>
            </article>

            {/* 8. Dashboard Directivo con Métricas en Tiempo Real */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                8. Dashboard Directivo con Métricas en Tiempo Real
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Indicadores clave siempre visibles</li>
                <li>Filtros por período</li>
                <li>Alertas priorizadas</li>
                <li>Gráficos de evolución</li>
                <li>Export PDF de informes para junta/patronato</li>
              </ul>
            </article>

            {/* 9. Gestión Multi-contacto con Tipologías */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                9. Gestión Multi-contacto con Tipologías
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Donantes, socios, proveedores, trabajadores y contrapartes</li>
                <li>Validación automática de CIF/DNI/NIE e IBANs</li>
                <li>Importación masiva con mapping flexible</li>
                <li>Estados operativos</li>
              </ul>
            </article>

            {/* 10. Gestión de Devoluciones Bancarias */}
            <article>
              <h3 className="text-xl font-semibold mb-3">10. Gestión de Devoluciones Bancarias</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Importador específico de devoluciones</li>
                <li>Matching automático con el donante</li>
                <li>Seguimiento de cuotas pendientes</li>
                <li>Exclusión automática del Modelo 182</li>
              </ul>
            </article>

            {/* 11. Integración Stripe para Donaciones Online */}
            <article id="donaciones-online">
              <h3 className="text-xl font-semibold mb-3">
                11. Integración Stripe para Donaciones Online
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Separación donación vs comisión</li>
                <li>Matching por email</li>
                <li>Creación automática de donantes</li>
                <li>Trazabilidad completa</li>
              </ul>
            </article>

            {/* 12. Módulo de Proyectos y Subvenciones */}
            <article id="modulo-proyectos">
              <h3 className="text-xl font-semibold mb-3">12. Módulo de Proyectos y Subvenciones</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Ejecución vs presupuestado</li>
                <li>Asignación parcial de gastos</li>
                <li>Captura fotográfica de gastos de terreno</li>
                <li>Export justificación (Excel + ZIP)</li>
                <li>Gestión multi-moneda</li>
              </ul>
            </article>

            {/* 13. Arquitectura Multi-organización con Seguridad Europea */}
            <article>
              <h3 className="text-xl font-semibold mb-3">
                13. Arquitectura Multi-organización con Seguridad Europea
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Aislamiento total de datos</li>
                <li>Roles y permisos</li>
                <li>Cumplimiento RGPD/LOPDGDD</li>
                <li>Servidores UE</li>
              </ul>
            </article>

            {/* 14. Exportación de Datos e Informes */}
            <article>
              <h3 className="text-xl font-semibold mb-3">14. Exportación de Datos e Informes</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Excel, CSV y PDF</li>
                <li>Modelos oficiales AEAT</li>
                <li>Exports por contacto, proyecto o período</li>
              </ul>
            </article>

            {/* 15. Sistema de Alertas Inteligente */}
            <article>
              <h3 className="text-xl font-semibold mb-3">15. Sistema de Alertas Inteligente</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Alertas críticas e informativas</li>
                <li>Enlaces directos a resolución</li>
                <li>Priorización automática</li>
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
