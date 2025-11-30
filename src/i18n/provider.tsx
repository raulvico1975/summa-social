'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { TranslationsContext, translations, Language } from './index';

interface TranslationsProviderProps {
  children: React.ReactNode;
}

export const TranslationsProvider = ({ children }: TranslationsProviderProps) => {
  const [language, setLanguage] = useState<Language>('ca'); // Default to Catalan

  const handleSetLanguage = useCallback((lang: Language) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  }, []);

  const t = useMemo(() => translations[language], [language]);

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
