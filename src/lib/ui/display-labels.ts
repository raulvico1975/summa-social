/**
 * display-labels.ts
 *
 * Utilitats per mostrar etiquetes traduïdes a la UI.
 * MAI mostrar IDs tècnics ni literals anglesos.
 */

import type { Category } from '@/lib/data';

type ContactType = 'donor' | 'supplier' | 'employee';

type Translations = {
  common: {
    supplier?: string;
    donor?: string;
    employee?: string;
    contact?: string;
    unknownCategory?: string;
    uncategorized?: string;
  };
  categories: Record<string, string>;
};

/**
 * Obté l'etiqueta traduïda d'una categoria.
 * Prioritat:
 * 1. categoryName desnormalitzat (si existeix)
 * 2. Traducció predefinida per clau (t.categories[key])
 * 3. Nom de la categoria des del mapa (categories.find(c => c.id === categoryId))
 * 4. Traducció de t.common.unknownCategory (fallback)
 *
 * MAI retornar l'ID directament.
 */
export function getCategoryDisplayLabel(
  categoryValue: string | null | undefined,
  options: {
    categoryName?: string | null;
    categories?: Category[];
    categoryTranslations: Record<string, string>;
    unknownCategoryLabel?: string;
  }
): string {
  const {
    categoryName,
    categories,
    categoryTranslations,
    unknownCategoryLabel = 'Categoria desconeguda',
  } = options;

  // 1. Si tenim categoryName desnormalitzat, intentar traduir-lo
  if (categoryName) {
    const translated = categoryTranslations[categoryName];
    if (translated) return translated;
    // Si no es troba traducció però és un nom llegible, retornar-lo
    if (!looksLikeId(categoryName)) return categoryName;
  }

  if (!categoryValue) {
    return unknownCategoryLabel;
  }

  // 2. Traducció predefinida per clau
  if (categoryTranslations[categoryValue]) {
    return categoryTranslations[categoryValue];
  }

  // 3. Buscar en el mapa de categories per ID
  if (categories) {
    const categoryById = categories.find(c => c.id === categoryValue);
    if (categoryById) {
      const translated = categoryTranslations[categoryById.name];
      if (translated) return translated;
      if (!looksLikeId(categoryById.name)) return categoryById.name;
    }
    // Buscar per nom
    const categoryByName = categories.find(c => c.name === categoryValue);
    if (categoryByName) {
      const translated = categoryTranslations[categoryByName.name];
      if (translated) return translated;
      if (!looksLikeId(categoryByName.name)) return categoryByName.name;
    }
  }

  // 4. Si el valor no sembla un ID, mostrar-lo
  if (!looksLikeId(categoryValue)) {
    return categoryValue;
  }

  // 5. Fallback: mai mostrar l'ID
  return unknownCategoryLabel;
}

/**
 * Obté l'etiqueta traduïda d'un tipus de contacte.
 * Prioritat:
 * 1. Traducció específica (t.common.supplier, etc.)
 * 2. Traducció genèrica (t.common.contact)
 * 3. Fallback hardcoded per idioma
 */
export function getContactTypeLabel(
  contactType: ContactType | string | null | undefined,
  translations: Partial<Translations['common']>
): string {
  if (!contactType) {
    return translations.contact || 'Contacte';
  }

  switch (contactType) {
    case 'supplier':
      return translations.supplier || 'Proveïdor';
    case 'donor':
      return translations.donor || 'Donant';
    case 'employee':
      return translations.employee || 'Treballador';
    default:
      return translations.contact || 'Contacte';
  }
}

/**
 * Detecta si un valor sembla un ID tècnic (hash, UUID, etc.)
 * i no hauria de mostrar-se a la UI.
 */
function looksLikeId(value: string): boolean {
  // IDs de Firestore: 20 caràcters alfanumèrics
  if (/^[a-zA-Z0-9]{20}$/.test(value)) return true;
  // UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  // Altres patrons d'ID comuns
  if (/^[a-zA-Z0-9]{24,}$/.test(value)) return true;
  return false;
}
