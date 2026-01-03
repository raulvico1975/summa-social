'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TranslationsContext, translations, Language } from './index';
import {
  getLocalBundle,
  trFactory,
  loadTranslations,
  JsonMessages,
} from './json-runtime';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';

interface TranslationsProviderProps {
  children: React.ReactNode;
}

/**
 * Detecta l'idioma del navegador (navigator.languages / navigator.language)
 * Retorna 'ca', 'es', 'fr' o 'pt' segons la configuració del navegador
 * Fallback: 'ca' (català)
 */
function detectBrowserLanguage(): Language {
  const languages = navigator.languages ?? [navigator.language];

  for (const lang of languages) {
    const code = lang.toLowerCase().split('-')[0]; // 'es-ES' → 'es'
    if (code === 'ca') return 'ca';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
    if (code === 'pt') return 'pt';
  }

  // Fallback: català
  return 'ca';
}

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ca';

  // 1. Prioritat: localStorage (usuari ja ha triat manualment)
  const savedLanguage = localStorage.getItem('summa-lang') as Language;
  // Acceptem tots els idiomes vàlids (ca/es/fr/pt), pt només té JSON però és vàlid
  const validLanguages: Language[] = ['ca', 'es', 'fr', 'pt'];
  if (savedLanguage && validLanguages.includes(savedLanguage)) {
    return savedLanguage;
  }

  // 2. Detectar idioma del navegador
  return detectBrowserLanguage();
};

export const TranslationsProvider = ({ children }: TranslationsProviderProps) => {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  // Versió de traduccions (per invalidació de cache)
  const [i18nVersion, setI18nVersion] = useState<number>(0);

  // Messages JSON carregats (Storage o local)
  const [jsonMessages, setJsonMessages] = useState<JsonMessages>(() =>
    getLocalBundle('ca')
  );

  // Flag per evitar càrregues duplicades
  const isLoadingRef = useRef(false);

  // Flag per desactivar listener si permission denied (evita spam)
  const listenerDisabledRef = useRef(false);

  useEffect(() => {
    // This effect runs only on the client to sync the initial state
    setLanguage(getInitialLanguage());
  }, []);

  // Sincronitzar <html lang> amb l'idioma actiu (SEO + accessibilitat)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Listener per system/i18n.version (invalidació de cache)
  // DEMO: No subscriure listener (evita errors de permisos)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // DEMO: Sempre usar local, no subscriure a Firestore
    if (isDemoEnv()) {
      setI18nVersion(0);
      return;
    }
    // Si ja hem desactivat el listener per permisos, no reintentem
    if (listenerDisabledRef.current) return;

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const firestore = getFirestore();
        const i18nDocRef = doc(firestore, 'system', 'i18n');

        unsubscribe = onSnapshot(
          i18nDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const newVersion = data?.version ?? 0;
              setI18nVersion(newVersion);
            } else {
              // Doc doesn't exist yet - use version 0
              setI18nVersion(0);
            }
          },
          (error) => {
            // Error listening - probably permissions
            // Log únic i desactivar listener per evitar spam
            if (!listenerDisabledRef.current) {
              listenerDisabledRef.current = true;
              console.info('[i18n] Version listener disabled (permission denied), using local fallback');
              unsubscribe?.();
            }
            setI18nVersion(0);
          }
        );
      } catch {
        // Firestore not initialized yet
        setI18nVersion(0);
      }
    };

    setupListener();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Carregar traduccions quan canvia l'idioma o la versió
  useEffect(() => {
    if (isLoadingRef.current) return;

    const load = async () => {
      isLoadingRef.current = true;
      try {
        const messages = await loadTranslations(language, i18nVersion);
        setJsonMessages(messages);
      } catch (error) {
        console.warn('[i18n] Error loading translations:', error);
        // Fallback to local
        setJsonMessages(getLocalBundle(language));
      } finally {
        isLoadingRef.current = false;
      }
    };

    load();
  }, [language, i18nVersion]);

  const handleSetLanguage = useCallback((lang: Language) => {
    // Acceptem tots els idiomes vàlids (inclòs pt que només té JSON)
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('summa-lang', lang);
    }
  }, []);

  // pt fa fallback a ca (translations TS només té ca/es/fr)
  const tLang = language === 'pt' ? 'ca' : language;
  const t = useMemo(() => translations[tLang], [tLang]);

  // tr() per traduccions JSON planes (ara usa jsonMessages carregats)
  const tr = useMemo(() => {
    return trFactory(jsonMessages);
  }, [jsonMessages]);

  // Memoitzar value per evitar re-renders massius a tota l'app
  const value = useMemo(
    () => ({
      language,
      setLanguage: handleSetLanguage,
      t,
      tr,
    }),
    [language, handleSetLanguage, t, tr]
  );

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
};
