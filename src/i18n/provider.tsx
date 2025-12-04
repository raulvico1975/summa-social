'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationsContext, translations, Language } from './index';

interface TranslationsProviderProps {
  children: React.ReactNode;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('summa-lang') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
  }
  return 'ca'; // Default language
};

export const TranslationsProvider = ({ children }: TranslationsProviderProps) => {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    // This effect runs only on the client to sync the initial state
    setLanguage(getInitialLanguage());
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    if (translations[lang]) {
      setLanguage(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('summa-lang', lang);
      }
    }
  }, []);

  const t = useMemo(() => translations[language] || translations.ca, [language]);

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
  };

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
};