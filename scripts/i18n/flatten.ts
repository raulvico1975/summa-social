/**
 * Aplanar objecte niuat a claus dot-notation
 * Ex: { dashboard: { title: "X" } } → { "dashboard.title": "X" }
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'function') {
      // Funcions de traducció amb paràmetres - les guardem com a template
      // Ex: (params) => `Hola ${params.name}` → "Hola {{name}}"
      console.warn(`[i18n] Function at ${newKey} - skipping (needs manual migration)`);
    } else {
      console.warn(`[i18n] Skipping non-string at ${newKey}: ${typeof value}`);
    }
  }

  return result;
}
