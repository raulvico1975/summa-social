/**
 * Help Editor utilities
 *
 * Helpers per construir i parsejar claus i18n d'ajuda
 * per l'editor inline de /admin.
 */

import type { HelpLocale } from './help-audit';

/**
 * Estructura del formulari d'edició d'ajuda
 */
export type HelpFormState = {
  title: string;
  intro: string;
  steps: string; // Multi-line text (1 line = 1 item)
  tips: string;
  keywords: string;
  extraFlowTitle: string;
  extraFlowItems: string;
  extraPitfallsTitle: string;
  extraPitfallsItems: string;
  extraManualLabel: string;
  extraVideoLabel: string;
  extraVideoNote: string;
};

/**
 * Estat inicial buit per un formulari d'ajuda
 */
export const EMPTY_HELP_FORM: HelpFormState = {
  title: '',
  intro: '',
  steps: '',
  tips: '',
  keywords: '',
  extraFlowTitle: '',
  extraFlowItems: '',
  extraPitfallsTitle: '',
  extraPitfallsItems: '',
  extraManualLabel: '',
  extraVideoLabel: '',
  extraVideoNote: '',
};

/**
 * Parseja text multi-línia o separat per comes a array de strings
 * Filtra elements buits i fa trim
 */
export function parseLines(text: string): string[] {
  return text
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Serialitza array de strings a text multi-línia
 */
export function serializeLines(items: string[]): string {
  return items.join('\n');
}

/**
 * Construeix el prefix de clau i18n per un routeKey
 */
export function buildHelpPrefix(routeKey: string): string {
  return `help.${routeKey}.`;
}

/**
 * Extreu el contingut d'ajuda d'un bundle JSON existent
 * per poblar el formulari d'edició
 */
export function extractHelpFormFromBundle(
  bundle: Record<string, string>,
  routeKey: string
): HelpFormState {
  const prefix = buildHelpPrefix(routeKey);

  // Helper per extreure arrays indexats
  const extractArray = (baseKey: string): string[] => {
    const items: string[] = [];
    let i = 0;
    while (bundle[`${baseKey}.${i}`] !== undefined) {
      items.push(bundle[`${baseKey}.${i}`]);
      i++;
    }
    return items;
  };

  return {
    title: bundle[`${prefix}title`] ?? '',
    intro: bundle[`${prefix}intro`] ?? '',
    steps: serializeLines(extractArray(`${prefix}steps`)),
    tips: serializeLines(extractArray(`${prefix}tips`)),
    keywords: serializeLines(extractArray(`${prefix}keywords`)),
    extraFlowTitle: bundle[`${prefix}extra.flow.title`] ?? '',
    extraFlowItems: serializeLines(extractArray(`${prefix}extra.flow.items`)),
    extraPitfallsTitle: bundle[`${prefix}extra.pitfalls.title`] ?? '',
    extraPitfallsItems: serializeLines(extractArray(`${prefix}extra.pitfalls.items`)),
    extraManualLabel: bundle[`${prefix}extra.manual.label`] ?? '',
    extraVideoLabel: bundle[`${prefix}extra.video.label`] ?? '',
    extraVideoNote: bundle[`${prefix}extra.video.note`] ?? '',
  };
}

/**
 * Construeix un patch de claus i18n a partir del formulari
 * Retorna només les claus que tenen valor (no buides)
 */
export function buildHelpPatch(
  routeKey: string,
  formState: HelpFormState
): Record<string, string> {
  const prefix = buildHelpPrefix(routeKey);
  const patch: Record<string, string> = {};

  // Title i intro (obligatoris)
  if (formState.title.trim()) {
    patch[`${prefix}title`] = formState.title.trim();
  }
  if (formState.intro.trim()) {
    patch[`${prefix}intro`] = formState.intro.trim();
  }

  // Steps (array indexat)
  const steps = parseLines(formState.steps);
  steps.forEach((item, i) => {
    patch[`${prefix}steps.${i}`] = item;
  });

  // Tips (array indexat)
  const tips = parseLines(formState.tips);
  tips.forEach((item, i) => {
    patch[`${prefix}tips.${i}`] = item;
  });

  // Keywords (array indexat)
  const keywords = parseLines(formState.keywords);
  keywords.forEach((item, i) => {
    patch[`${prefix}keywords.${i}`] = item;
  });

  // Extra flow
  if (formState.extraFlowTitle.trim()) {
    patch[`${prefix}extra.flow.title`] = formState.extraFlowTitle.trim();
  }
  const flowItems = parseLines(formState.extraFlowItems);
  flowItems.forEach((item, i) => {
    patch[`${prefix}extra.flow.items.${i}`] = item;
  });

  // Extra pitfalls
  if (formState.extraPitfallsTitle.trim()) {
    patch[`${prefix}extra.pitfalls.title`] = formState.extraPitfallsTitle.trim();
  }
  const pitfallItems = parseLines(formState.extraPitfallsItems);
  pitfallItems.forEach((item, i) => {
    patch[`${prefix}extra.pitfalls.items.${i}`] = item;
  });

  // Extra manual
  if (formState.extraManualLabel.trim()) {
    patch[`${prefix}extra.manual.label`] = formState.extraManualLabel.trim();
  }

  // Extra video
  if (formState.extraVideoLabel.trim()) {
    patch[`${prefix}extra.video.label`] = formState.extraVideoLabel.trim();
  }
  if (formState.extraVideoNote.trim()) {
    patch[`${prefix}extra.video.note`] = formState.extraVideoNote.trim();
  }

  return patch;
}

/**
 * Aplica un patch a un bundle existent, netejant claus antigues del prefix
 * Això evita deixar "brossa" quan es redueix el nombre d'items
 */
export function applyHelpPatchToBundle(
  bundle: Record<string, string>,
  routeKey: string,
  patch: Record<string, string>
): Record<string, string> {
  const prefix = buildHelpPrefix(routeKey);
  const result = { ...bundle };

  // 1. Eliminar totes les claus existents amb el prefix
  for (const key of Object.keys(result)) {
    if (key.startsWith(prefix)) {
      delete result[key];
    }
  }

  // 2. Afegir les noves claus del patch
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value;
  }

  // 3. Ordenar claus alfabèticament per consistència
  const sortedKeys = Object.keys(result).sort();
  const sortedResult: Record<string, string> = {};
  for (const key of sortedKeys) {
    sortedResult[key] = result[key];
  }

  return sortedResult;
}

/**
 * Valida el formulari d'ajuda
 * Retorna objecte amb errors per camp
 */
export function validateHelpForm(formState: HelpFormState): {
  isValid: boolean;
  errors: Partial<Record<keyof HelpFormState, string>>;
} {
  const errors: Partial<Record<keyof HelpFormState, string>> = {};

  if (!formState.title.trim()) {
    errors.title = 'El títol és obligatori';
  }
  if (!formState.intro.trim()) {
    errors.intro = 'La introducció és obligatòria';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
