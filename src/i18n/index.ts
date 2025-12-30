'use client';

import { createContext, useContext } from 'react';
import { ca } from './ca';
import { es } from './es';
import { fr } from './fr';

export type Language = 'ca' | 'es' | 'fr' | 'pt';

export const translations = { ca, es, fr };

/**
 * Tipus per la funció tr() de traduccions JSON planes
 * @param key - Clau dot-notation (ex: "dashboard.title")
 * @param fallback - Valor per defecte si la clau no existeix
 * @returns El valor traduït, el fallback, o la clau si no es troba
 */
export type TrFunction = (key: string, fallback?: string) => string;

export interface TranslationsContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof ca; // 'ca' is used as the shape for all translation objects
  tr: TrFunction; // Nova funció per traduccions JSON planes
}

export const TranslationsContext = createContext<TranslationsContextType | undefined>(undefined);

export const useTranslations = (): TranslationsContextType => {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }
  return context;
};
