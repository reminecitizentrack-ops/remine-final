// src/i18n/index.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from './fr.json';
import en from './en.json';

const translations = { fr, en };
const STORAGE_KEY = '@app_language';

class I18n {
  constructor() {
    this.locale = 'fr';
    this.translations = translations;
  }

  async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && this.translations[saved]) {
        this.locale = saved;
      }
    } catch (error) {
      console.log('I18n init error:', error);
    }
  }

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.locale];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return value;
  }

  async setLocale(locale) {
    if (this.translations[locale]) {
      this.locale = locale;
      await AsyncStorage.setItem(STORAGE_KEY, locale);
      return true;
    }
    return false;
  }

  getLocale() {
    return this.locale;
  }
}

export const i18n = new I18n();

// Hook pour utiliser les traductions
export const useTranslation = () => {
  const [locale, setLocale] = React.useState(i18n.getLocale());
  
  const t = (key) => i18n.t(key);
  
  const changeLanguage = async (lang) => {
    const success = await i18n.setLocale(lang);
    if (success) {
      setLocale(lang);
    }
    return success;
  };
  
  return { t, locale, changeLanguage };
};