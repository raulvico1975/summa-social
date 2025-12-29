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

export type TocEntry = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};

/**
 * Extreu la taula de continguts d'un markdown.
 * Detecta headings #, ##, ### i genera IDs únics.
 */
export function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split('\n');
  const toc: TocEntry[] = [];
  const idCounts: Record<string, number> = {};

  for (const line of lines) {
    let level: 1 | 2 | 3 | null = null;
    let text = '';

    if (line.startsWith('### ')) {
      level = 3;
      text = line.slice(4).trim();
    } else if (line.startsWith('## ')) {
      level = 2;
      text = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      level = 1;
      text = line.slice(2).trim();
    }

    if (level !== null && text) {
      const baseId = slugifyHeading(text);

      // Dedup: afegir sufix si ja existeix
      let id = baseId;
      if (idCounts[baseId]) {
        idCounts[baseId]++;
        id = `${baseId}-${idCounts[baseId]}`;
      } else {
        idCounts[baseId] = 1;
      }

      toc.push({ level, text, id });
    }
  }

  return toc;
}

/**
 * Renderitza el markdown amb IDs als headings.
 * Retorna un array d'objectes per renderitzar.
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
    let text = '';

    if (line.startsWith('### ')) {
      level = 3;
      text = line.slice(4).trim();
    } else if (line.startsWith('## ')) {
      level = 2;
      text = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      level = 1;
      text = line.slice(2).trim();
    }

    if (level !== null && text) {
      const baseId = slugifyHeading(text);
      let id = baseId;
      if (idCounts[baseId]) {
        idCounts[baseId]++;
        id = `${baseId}-${idCounts[baseId]}`;
      } else {
        idCounts[baseId] = 1;
      }
      result.push({ type: 'heading', level, text, id });
    } else if (line.trim() === '') {
      result.push({ type: 'empty' });
    } else {
      result.push({ type: 'text', content: line });
    }
  }

  return result;
}
