/**
 * Mobile Actions Baseline
 *
 * Classes utilitàries per barres d'accions consistents en mòbil.
 * Evita overflow, fa wrap correcte, i manté CTAs llegibles.
 */

/**
 * Per barres d'accions en headers/footers.
 * En mòbil: flex-col apilat. En desktop: flex-row inline.
 */
export const MOBILE_ACTIONS_BAR =
  "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center";

/**
 * Per files d'accions petites (icons, badges).
 * Sempre en fila, fa wrap si cal.
 */
export const MOBILE_ACTIONS_ROW =
  "flex flex-wrap items-center gap-2";

/**
 * Per botons principals en mòbil: full width en mòbil, auto en desktop.
 */
export const MOBILE_CTA_PRIMARY =
  "w-full sm:w-auto";

/**
 * Per botons secundaris en mòbil: full width en mòbil, auto en desktop.
 */
export const MOBILE_CTA_SECONDARY =
  "w-full sm:w-auto";

/**
 * Per botons amb text llarg: trunca si cal.
 */
export const MOBILE_CTA_TRUNCATE =
  "max-w-full truncate";
