import { createContext, useContext, useEffect, useState } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext(null);
const STORAGE_KEY = 'watchtower_lang';

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'fr';
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'fr' ? saved : 'fr';
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const t = (keyPath, params = null) => {
    const parts = keyPath.split('.');
    let cursor = translations[language];
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in cursor) {
        cursor = cursor[part];
      } else {
        return keyPath;
      }
    }
    if (typeof cursor !== 'string') {
      return keyPath;
    }
    if (!params) {
      return cursor;
    }
    return Object.entries(params).reduce(
      (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value ?? '')),
      cursor,
    );
  };

  const formatDate = (dateValue, options = {}) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', options).format(date);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, formatDate }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
