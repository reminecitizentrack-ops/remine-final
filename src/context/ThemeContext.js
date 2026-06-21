// src/context/ThemeContext.js
// ─────────────────────────────────────────────────────────────────────────────
// Contexte de thème — gère le mode clair/sombre
// Mémorise le choix de l'utilisateur dans AsyncStorage
//
// INTÉGRATION dans App.js :
//   import { ThemeProvider } from './src/context/ThemeContext';
//
//   // Entourer le NavigationContainer avec ThemeProvider :
//   <ThemeProvider>
//     <NavigationContainer>
//       ...
//     </NavigationContainer>
//   </ThemeProvider>
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme';

const STORAGE_KEY = 'remine_theme_preference';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState('system'); // 'light' | 'dark' | 'system'
  const [isReady,    setIsReady]    = useState(false);

  // Charger la préférence sauvegardée
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setPreference(val);
      }
      setIsReady(true);
    }).catch(() => setIsReady(true));
  }, []);

  // Calculer si on est en dark mode
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (newPreference) => {
    setPreference(newPreference);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newPreference);
    } catch (e) {
      console.warn('Impossible de sauvegarder la préférence de thème');
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{
      colors,
      isDark,
      preference,
      setTheme,
      toggleTheme,
      isReady,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};