import { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../i18n/en.json';
import tpiTranslations from '../i18n/tpi.json';

const LanguageContext = createContext();

const translations = {
  en: enTranslations,
  tpi: tpiTranslations
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Load from localStorage or default to English
    return localStorage.getItem('preferredLanguage') || 'en';
  });

  useEffect(() => {
    // Save to localStorage whenever language changes
    localStorage.setItem('preferredLanguage', language);
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = language === 'tpi' ? 'tpi' : 'en';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'tpi' : 'en');
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English if translation missing
        value = translations.en;
        for (const fallbackKey of keys) {
          value = value?.[fallbackKey];
          if (value === undefined) {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    // Replace parameters in string
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
