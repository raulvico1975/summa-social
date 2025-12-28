'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationsContext, translations, Language } from './index';

interface TranslationsProviderProps {
  children: React.ReactNode;
}

/**
 * Detecta l'idioma del navegador (navigator.languages / navigator.language)
 * Retorna 'ca', 'es' o 'fr' segons la configuració del navegador
 * Fallback: 'ca' (català)
 */
function detectBrowserLanguage(): Language {
  const languages = navigator.languages ?? [navigator.language];

  for (const lang of languages) {
    const code = lang.toLowerCase().split('-')[0]; // 'es-ES' → 'es'
    if (code === 'ca') return 'ca';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
  }

  // Fallback: català
  return 'ca';
}

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ca';

  // 1. Prioritat: localStorage (usuari ja ha triat manualment)
  const savedLanguage = localStorage.getItem('summa-lang') as Language;
  if (savedLanguage && translations[savedLanguage]) {
    return savedLanguage;
  }

  // 2. Detectar idioma del navegador
  return detectBrowserLanguage();
};

export const TranslationsProvider = ({ children }: TranslationsProviderProps) => {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    // This effect runs only on the client to sync the initial state
    setLanguage(getInitialLanguage());
  }, []);

  // Sincronitzar <html lang> amb l'idioma actiu (SEO + accessibilitat)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleSetLanguage = useCallback((lang: Language) => {
    if (translations[lang]) {
      setLanguage(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('summa-lang', lang);
      }
    }
  }, []);

  const t = useMemo(() => translations[language] || translations.ca, [language]);

  // Memoitzar value per evitar re-renders massius a tota l'app
  const value = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    t,
  }), [language, handleSetLanguage, t]);

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
};