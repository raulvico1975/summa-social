'use client';

import { createContext, useContext } from 'react';
import { ca } from './ca';
import { es } from './es';
import { fr } from './fr';

export type Language = 'ca' | 'es' | 'fr';

export const translations = { ca, es, fr };

export interface TranslationsContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof ca; // 'ca' is used as the shape for all translation objects
}

export const TranslationsContext = createContext<TranslationsContextType | undefined>(undefined);

export const useTranslations = (): TranslationsContextType => {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }
  return context;
};
