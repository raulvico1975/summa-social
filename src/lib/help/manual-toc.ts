/**
 * Helpers per generar la taula de continguts del manual.
 */

/**
 * Converteix un heading a un slug vàlid per ancoratges.
 * - lowercase
 * - elimina accents
 * - substitueix no-alfanumèrics per -
 * - col·lapsa -- en -
 * - trim -
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar accents
    .replace(/[^a-z0-9]+/g, '-') // no-alfanumèrics -> -
    .replace(/-+/g, '-') // col·lapsar --
    .replace(/^-|-$/g, ''); // trim -
}

/**
 * Extreu l'ID explícit d'un heading si té format [id:xxx].
 * Retorna { cleanText, explicitId } on explicitId és null si no hi ha [id:].
 * Ex: "1. Primers Passos [id:primers-passos]" -> { cleanText: "1. Primers Passos", explicitId: "primers-passos" }
 */
function extractExplicitId(text: string): { cleanText: string; explicitId: string | null } {
  const match = text.match(/\s*\[id:([a-z0-9-]+)\]\s*$/);
  if (match) {
    return {
      cleanText: text.slice(0, match.index).trim(),
      explicitId: match[1],
    };
  }
  return { cleanText: text, explicitId: null };
}

export type TocEntry = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};

/**
 * Extreu la taula de continguts d'un markdown.
 * Detecta headings #, ##, ### i genera IDs únics.
 * Suporta IDs explícits amb format [id:xxx] al final del heading.
 */
export function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split('\n');
  const toc: TocEntry[] = [];
  const idCounts: Record<string, number> = {};

  for (const line of lines) {
    let level: 1 | 2 | 3 | null = null;
    let rawText = '';

    if (line.startsWith('### ')) {
      level = 3;
      rawText = line.slice(4).trim();
    } else if (line.startsWith('## ')) {
      level = 2;
      rawText = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      level = 1;
      rawText = line.slice(2).trim();
    }

    if (level !== null && rawText) {
      // Check for explicit ID
      const { cleanText, explicitId } = extractExplicitId(rawText);
      const baseId = explicitId ?? slugifyHeading(cleanText);

      // Dedup: afegir sufix si ja existeix
      let id = baseId;
      if (idCounts[baseId]) {
        idCounts[baseId]++;
        id = `${baseId}-${idCounts[baseId]}`;
      } else {
        idCounts[baseId] = 1;
      }

      toc.push({ level, text: cleanText, id });
    }
  }

  return toc;
}

/**
 * Renderitza el markdown amb IDs als headings.
 * Retorna un array d'objectes per renderitzar.
 * Suporta IDs explícits amb format [id:xxx] al final del heading.
 */
export type RenderedLine =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; id: string }
  | { type: 'empty' }
  | { type: 'text'; content: string };

export function parseMarkdownWithIds(markdown: string): RenderedLine[] {
  const lines = markdown.split('\n');
  const result: RenderedLine[] = [];
  const idCounts: Record<string, number> = {};

  for (const line of lines) {
    // Heading detection
    let level: 1 | 2 | 3 | null = null;
    let rawText = '';

    if (line.startsWith('### ')) {
      level = 3;
      rawText = line.slice(4).trim();
    } else if (line.startsWith('## ')) {
      level = 2;
      rawText = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      level = 1;
      rawText = line.slice(2).trim();
    }

    if (level !== null && rawText) {
      // Check for explicit ID
      const { cleanText, explicitId } = extractExplicitId(rawText);
      const baseId = explicitId ?? slugifyHeading(cleanText);

      let id = baseId;
      if (idCounts[baseId]) {
        idCounts[baseId]++;
        id = `${baseId}-${idCounts[baseId]}`;
      } else {
        idCounts[baseId] = 1;
      }
      result.push({ type: 'heading', level, text: cleanText, id });
    } else if (line.trim() === '') {
      result.push({ type: 'empty' });
    } else {
      result.push({ type: 'text', content: line });
    }
  }

  return result;
}
