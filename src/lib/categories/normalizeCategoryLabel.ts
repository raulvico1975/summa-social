/**
 * Normalitza un nom de categoria per mostrar a la UI
 *
 * REGLES:
 * - Format frase: primera lletra majúscula, resta minúscules
 * - PERMET guions (-) i caràcters especials
 * - NO substitueix espais per guions
 * - NO toca el nameKey (matching intern)
 *
 * Exemple:
 *   "material OFICINA" → "Material oficina"
 *   "SERVEIS EXTERNS" → "Serveis externs"
 *   "reparacions-manteniment" → "Reparacions-manteniment"
 */
export function normalizeCategoryLabel(name: string): string {
  if (!name || typeof name !== 'string') return '';

  const trimmed = name.trim();
  if (!trimmed) return '';

  // Format frase: primera lletra majúscula, resta minúscules
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
