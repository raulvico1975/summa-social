/**
 * Runtime loader per traduccions JSON planes
 *
 * Fase 2: Només locals (imports explícits)
 * Fase 4: Storage override amb invalidació per version
 *
 * DEMO: En entorn demo, sempre usa fallback local (sense Storage)
 * per evitar CORS i errors de permisos.
 */

import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';

// Imports explícits (NO dinàmics) - Next.js compatible
import ca from './locales/ca.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

export type JsonMessages = Record<string, string>;

const localBundles: Record<string, JsonMessages> = { ca, es, fr, pt };

// Cache in-memory amb version per invalidació
type CachedBundle = {
  version: number;
  messages: JsonMessages;
};
const cache = new Map<string, CachedBundle>();

// Negative cache: idiomes on Storage no té el fitxer (evita reintentar cada render)
const storageMissing = new Set<string>();
// Control de logs únics
const loggedStorageMissing = new Set<string>();

/**
 * Obté el bundle local per un idioma
 * Fallback a 'ca' si l'idioma no existeix
 */
export function getLocalBundle(language: string): JsonMessages {
  return localBundles[language] ?? localBundles.ca;
}

/**
 * Valida que un objecte sigui Record<string, string>
 */
function isValidMessages(data: unknown): data is JsonMessages {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  return Object.values(data).every((v) => typeof v === 'string');
}

/**
 * Carrega traduccions des de Firebase Storage
 * Retorna null si no existeix o hi ha error
 * Implementa negative cache per evitar reintentar fitxers inexistents
 *
 * DEMO: Retorna null immediatament (usa local sense Storage)
 */
async function loadFromStorage(language: string): Promise<JsonMessages | null> {
  // DEMO: Sempre usar local, no intentar Storage (evita CORS/permisos)
  if (isDemoEnv()) {
    return null;
  }

  // Negative cache: si ja sabem que no existeix, no reintentem
  if (storageMissing.has(language)) {
    return null;
  }

  try {
    const storage = getStorage();
    const fileRef = ref(storage, `i18n/${language}.json`);
    const url = await getDownloadURL(fileRef);

    const response = await fetch(url);
    if (!response.ok) {
      // Marcar com a missing per no reintentar
      storageMissing.add(language);
      return null;
    }

    const data = await response.json();
    if (!isValidMessages(data)) {
      // Log únic per format invàlid
      if (!loggedStorageMissing.has(`invalid-${language}`)) {
        loggedStorageMissing.add(`invalid-${language}`);
        console.warn(`[i18n] Invalid JSON format from Storage for ${language}, using local fallback`);
      }
      return null;
    }

    return data;
  } catch (error: unknown) {
    // Marcar negative cache per no reintentar
    storageMissing.add(language);

    // Silenciós per errors esperats (object-not-found, permission-denied)
    // Només loguejar errors inesperats
    const isExpectedError =
      error instanceof Error &&
      (error.message.includes('storage/object-not-found') ||
        error.message.includes('storage/unauthorized') ||
        error.message.includes('permission-denied'));

    if (!isExpectedError && !loggedStorageMissing.has(language)) {
      loggedStorageMissing.add(language);
      console.warn(`[i18n] Unexpected error loading ${language} from Storage, using local fallback`);
    }

    return null;
  }
}

/**
 * Carrega traduccions amb suport per Storage override i cache amb version
 *
 * @param language - Codi d'idioma ('ca', 'es', 'fr', 'pt')
 * @param version - Número de versió per invalidació de cache
 * @returns Promise amb les traduccions
 */
export async function loadTranslations(
  language: string,
  version: number
): Promise<JsonMessages> {
  // 1. Check cache - si la versió coincideix, retornar
  const cached = cache.get(language);
  if (cached && cached.version === version) {
    return cached.messages;
  }

  // 2. Intent carregar des de Storage
  const storageMessages = await loadFromStorage(language);

  if (storageMessages) {
    // Guardar a cache amb la versió actual
    cache.set(language, { version, messages: storageMessages });
    return storageMessages;
  }

  // 3. Fallback a bundle local
  const localMessages = getLocalBundle(language);
  cache.set(language, { version, messages: localMessages });
  return localMessages;
}

/**
 * Factory per crear la funció tr()
 * Retorna una funció que tradueix claus dot-notation
 *
 * @example
 * const tr = trFactory(messages);
 * tr("dashboard.title") // → "Dashboard"
 * tr("missing.key", "Fallback") // → "Fallback"
 * tr("missing.key") // → "missing.key"
 */
export function trFactory(messages: JsonMessages) {
  return (key: string, fallback?: string): string => {
    return messages[key] ?? fallback ?? key;
  };
}

/**
 * Neteja el cache (forçar recàrrega)
 * Inclou el negative cache per permetre reintentar Storage
 */
export function clearCache() {
  cache.clear();
  storageMissing.clear();
}

/**
 * Obté la versió en cache per un idioma (per debug)
 */
export function getCachedVersion(language: string): number | null {
  return cache.get(language)?.version ?? null;
}
