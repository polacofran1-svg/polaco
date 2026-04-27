import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Language, dictionaries, TranslationKey, getTranslation } from "../i18n/dictionaries";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "paperclip-ui-language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        return stored;
      }
      
      // Fallback to browser language if available
      if (typeof navigator !== "undefined" && navigator.language.startsWith("es")) {
        return "es";
      }
    } catch {
      // Ignore local storage errors
    }
    return "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, lang);
      // Optional: Set dir/lang on document element for accessibility
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  }, []);

  // Update document on mount
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey) => {
      const dict = dictionaries[language];
      return getTranslation(dict, key);
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
