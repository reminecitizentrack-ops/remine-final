// src/context/LanguageContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { i18n } from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('fr');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await i18n.init();
      setLocale(i18n.getLocale());
      setIsReady(true);
    };
    init();
  }, []);

  const changeLanguage = async (lang) => {
    const success = await i18n.setLocale(lang);
    if (success) {
      setLocale(lang);
    }
    return success;
  };

  const t = (key) => i18n.t(key);

  if (!isReady) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};