'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationsContext, translations, Language } from './index';
import { useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface TranslationsProviderProps {
  children: React.ReactNode;
}

// Define the type for the settings document
interface AppSettings {
  language: Language;
}

export const TranslationsProvider = ({ children }: TranslationsProviderProps) => {
  const [language, setLanguage] = useState<Language>('ca'); // Default to Catalan
  const { firestore, user, isUserLoading } = useFirebase();

  // Effect to load language preference from Firestore
  useEffect(() => {
    if (user && firestore) {
      const settingsRef = doc(firestore, 'users', user.uid, 'settings', 'app');
      getDoc(settingsRef).then(docSnap => {
        if (docSnap.exists()) {
          const settings = docSnap.data() as AppSettings;
          if (settings.language && translations[settings.language]) {
            setLanguage(settings.language);
          }
        }
      });
    }
  }, [user, firestore, isUserLoading]);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    if (user && firestore) {
      const settingsRef = doc(firestore, 'users', user.uid, 'settings', 'app');
      // Set the language preference in Firestore non-blockingly
      setDoc(settingsRef, { language: lang }, { merge: true });
    }
  }, [user, firestore]);

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
