import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =============================================================================
// TYPES
// =============================================================================

interface ContextHelpCardProps {
  /** Títol curt (3-4 paraules) */
  title: string;
  /** Micro-relat funcional (15-20 paraules) */
  story: string;
  /** Il·lustració SVG com a ReactNode (icona petita) - DEPRECAT, usar exampleImage */
  illustration?: React.ReactNode;
  /** Imatge gran (panoràmica) a mostrar a dalt del contingut - DEPRECAT */
  heroImage?: React.ReactNode;
  /** Imatge d'exemple que s'obre en modal */
  exampleImage?: {
    src: string;
    alt: string;
  };
  /** Text del botó per obrir l'exemple (default: "Veure exemple") */
  exampleLabel?: string;
  /** CTA opcional amb text i acció */
  cta?: {
    label: string;
    onClick: () => void;
  };
  /** Classes addicionals */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ContextHelpCard - Ajuda contextual amb micro-relat i il·lustració.
 *
 * Pilot controlat per integrar ajudes narratives en empty states
 * i pantalles informatives. Purament informatiu, mai bloquejant.
 *
 * Criteri de disseny:
 * - Doodle minimalista, traç fi a mà alçada
 * - Blanc i negre amb accents blau suau discrets
 * - Sense fons, textures ni ombres
 * - Mai decorativa, sempre contextual
 */
export function ContextHelpCard({
  title,
  story,
  illustration,
  heroImage,
  exampleImage,
  exampleLabel = 'Veure exemple',
  cta,
  className,
}: ContextHelpCardProps) {
  const [isExampleOpen, setIsExampleOpen] = React.useState(false);

  return (
    <>
      <div
        className={cn(
          'border border-border/30 border-l-2 border-l-primary/60 rounded-lg overflow-hidden',
          className
        )}
      >
        {/* Hero image (capçalera discreta, retallada per overflow) - DEPRECAT */}
        {heroImage && (
          <div className="max-h-[96px] md:max-h-[120px] overflow-hidden mb-3 flex justify-start">
            {heroImage}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Il·lustració petita (esquerra) - DEPRECAT */}
            {illustration && !heroImage && (
              <div className="shrink-0 flex items-center justify-center text-foreground/80">
                {illustration}
              </div>
            )}

            {/* Contingut */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Títol */}
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>

              {/* Micro-relat */}
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[52ch]">
                {story}
              </p>

              {/* Botó per obrir exemple (prioritat sobre CTA) */}
              {exampleImage && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-xs"
                  onClick={() => setIsExampleOpen(true)}
                >
                  {exampleLabel}
                </Button>
              )}

              {/* CTA discret (només si no hi ha exampleImage) */}
              {cta && !exampleImage && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-xs"
                  onClick={cta.onClick}
                >
                  {cta.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal amb imatge d'exemple */}
      {exampleImage && (
        <Dialog open={isExampleOpen} onOpenChange={setIsExampleOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exampleImage.src}
                alt={exampleImage.alt}
                className="w-full h-auto rounded-md"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// =============================================================================
// IL·LUSTRACIONS SVG (doodle minimalista, traç fi)
// Criteri: strokeWidth="1", accents blau suau (stroke-primary/60) en 1-2 paths
// =============================================================================

/**
 * Il·lustració: Revisió / Validació
 * Estil: lupa sobre document amb check
 */
export function IllustrationReview() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      {/* Document */}
      <rect x="8" y="6" width="20" height="26" rx="2" />
      <line x1="12" y1="12" x2="24" y2="12" />
      <line x1="12" y1="17" x2="22" y2="17" />
      <line x1="12" y1="22" x2="20" y2="22" />

      {/* Lupa */}
      <circle cx="32" cy="30" r="8" />
      <line x1="37.5" y1="35.5" x2="42" y2="40" />

      {/* Check dins lupa - accent blau */}
      <path d="M28 30 L31 33 L36 27" className="stroke-primary/60" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Il·lustració: Temps / Procés
 * Estil: rellotge amb fletxa circular
 */
export function IllustrationTime() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      {/* Rellotge */}
      <circle cx="24" cy="24" r="16" />
      <line x1="24" y1="24" x2="24" y2="14" />
      <line x1="24" y1="24" x2="32" y2="24" />

      {/* Punt central */}
      <circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" />

      {/* Fletxa circular (procés) - accent blau */}
      <path d="M38 10 C42 14, 44 20, 44 24" className="stroke-primary/60" strokeWidth="1.4" />
      <path d="M44 24 L42 20 M44 24 L40 22" className="stroke-primary/60" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Il·lustració: Viatge / Despeses (doodle narratiu)
 * SVG simple: mòbil → tiquet → carpeta (flux liquidació)
 * Criteri: < 30 paths, traç fi, fil orgànic, sense fletxes
 */
export function IllustrationTravel({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-24 h-auto', className)}
    >
      {/* Grup base negre */}
      <g
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground/80"
      >
        {/* Mòbil (esquerra) - vora lleugerament irregular */}
        <path d="M10 20 C9 20, 8 21, 8 22 L8 44 C8 45.5, 9 46, 10 46 L22 46 C23 46, 24 45, 24 44 L24 22 C24 21, 23 20, 22 20 Z" />
        <path d="M14 41 Q16 42, 18 41" />
        <circle cx="16" cy="24" r="1.2" fill="currentColor" stroke="none" />

        {/* Tiquet (centre) - inclinat ~4°, vora superior ondulada */}
        <g transform="rotate(4, 46, 35)">
          <path d="M38 22 Q40 21, 42 22 Q44 21.5, 46 22 Q48 21, 50 22 L50 48 L38 48 Z" />
          <path d="M42 30 L48 30" />
          <path d="M41 34 Q44 35, 47 34" />
          <path d="M42 38 L46 38" />
        </g>

        {/* Carpeta (dreta) - contorn orgànic */}
        <path d="M68 28 C67 28, 66 29, 66 30 L66 50 C66 51, 67 52, 68 52 L92 52 C93 52, 94 51, 94 50 L94 32 C94 31, 93 30, 92 30 L84 30 L82 28 Z" />
        <path d="M71 40 Q79 41, 88 40" />
        <path d="M72 45 Q78 46, 85 45" />

        {/* Fil connector orgànic (un sol path Bézier) */}
        <path d="M24 33 C28 30, 32 38, 38 35 C44 32, 50 40, 56 36 C60 34, 62 38, 66 36" />
      </g>

      {/* Accents blaus - només flash al mòbil */}
      <g
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        opacity={0.55}
      >
        {/* Flash captura */}
        <path d="M11 29 L21 29" />
        <path d="M16 24 L16 34" />
      </g>
    </svg>
  );
}

/**
 * Il·lustració: Conciliació / Match
 * Estil: dues peces que encaixen
 */
export function IllustrationMatch() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      {/* Peça esquerra */}
      <path d="M6 14 L6 34 L18 34 L18 28 C18 26, 22 26, 22 28 L22 34 L22 28 C22 26, 22 22, 18 22 L18 14 Z" />

      {/* Peça dreta */}
      <path d="M42 14 L42 34 L30 34 L30 28 C30 26, 26 26, 26 28 L26 34 L26 28 C26 30, 26 22, 30 22 L30 14 Z" />

      {/* Fletxes d'encaix - accent blau */}
      <path d="M20 18 L24 18" className="stroke-primary/60" strokeWidth="1.4" />
      <path d="M28 18 L24 18" className="stroke-primary/60" strokeWidth="1.4" />
      <path d="M24 16 L24 20" className="stroke-primary/60" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * Il·lustració: Exportar / Generar
 * Estil: document amb fletxa sortint
 */
export function IllustrationExport() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-full h-full"
    >
      {/* Document */}
      <path d="M10 6 L10 42 L32 42 L32 14 L24 6 Z" />
      <path d="M24 6 L24 14 L32 14" />

      {/* Línies de text */}
      <line x1="14" y1="22" x2="28" y2="22" />
      <line x1="14" y1="28" x2="26" y2="28" />
      <line x1="14" y1="34" x2="22" y2="34" />

      {/* Fletxa exportar - accent blau */}
      <path d="M36 24 L42 24 L42 36 L36 36" className="stroke-primary/60" strokeWidth="1.4" />
      <path d="M38 20 L42 24 L38 28" className="stroke-primary/60" strokeWidth="1.4" />
    </svg>
  );
}
